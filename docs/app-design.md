# Warlord Draft — app design (Next.js + Supabase)

*2026-09-16. Covers the MVP (design plan Phase 1) and lays the foundation for 1v1 and lobbies without
building them yet.*

## Principles

1. **The engine is the only authority.** `resolve(armyA, armyB, terrain, seed)` is a pure function; every
   client and the server compute the same battle from the same inputs. The database stores inputs, never
   outcomes. Leaderboards recompute.
2. **Randomness is a column.** The only random act is choosing a seed. Solo: the client picks (or the date).
   Multiplayer: a database trigger picks it after both deployments are committed.
3. **Play without an account.** Anonymous auth from the first click; upgrade later and keep your runs.
4. **Phone first.** Every screen is one column; the board is collapsible rows; the battle is a scrollable
   log.

## Repository

```
warlord-draft/
  package.json              npm workspaces
  packages/engine/          what exists today: src/, data/, scripts/, test/ → dist/ (ESM, no node imports)
  apps/web/                 Next.js (App Router, TypeScript, Tailwind)
  supabase/                 migrations/, functions/ (Edge Functions, only if needed), seed.sql
  docs/
```

The engine package exports `createEngine(rawJson)` and ships its four JSON files as static assets. The web
app fetches `data/v2/*.json` (path includes the data version) so old run strings keep working after a
rebalance.

## Screens (MVP, solo)

| Route | What happens | Engine calls |
|---|---|---|
| `/` | Play now (fresh seed), Daily (date seed), Continue, How it works | — |
| `/draft/[seed]` | General pick, then the 8-row board: rows collapse to culture + four grade badges, tap to expand; elite and culture counters pinned at top; 2 rerolls; then plan | `startDraft`, `pickGeneral`, `pickCard`, `rerollRow`, `setPlan`, `summarize`, `validate` |
| `/deploy` | Enemy roster shown (AI-drafted), your eight units on Left / Center / Right; live numbers: shooters per wing, center steadiness, wing power; terrain shown | `aiDraft`, `defaultDeployment`, `setDeployment` |
| `/battle` | Text-first playback: deployment, missiles, contact, then rounds revealed one tap at a time with front morale bars; rout or reckoning; casualties; general's fate | `aiDeploy` (for the AI), `resolve` |
| `/r/[run]` | Shareable result: replays from the run string in the URL; anyone can open it, no account | `replayDraft`, `resolve` |

State lives in the URL wherever possible (`draftSeed`, picks, plan, deployment, battle seed), so a refresh
never loses a draft and a link is a full replay.

## Data model (Postgres)

```
profiles      id (auth.users), handle, created_at
runs          id, owner, data_version, run_string, terrain, battle_seed, opponent_run_string, opponent_deployment,
              created_at                      -- solo results are recomputed, never stored
matches       id, data_version, terrain, status (drafting|deploying|revealed|done),
              p1, p2, p1_run, p2_run, p1_deploy, p2_deploy, seed, created_at
lobbies       id, name, owner, max_players, created_at
lobby_members lobby_id, user_id, joined_at
messages      id, lobby_id, user_id, body, created_at
```

**Row-level security.** Players read their own `runs`. In `matches`, a player can write only their own
`pN_deploy`, and can read the opponent's only when `status = 'revealed'`. Lobby members read and write
`messages` in lobbies they belong to.

**Trigger.** On `matches` update: when both deployments are present and `seed` is null, set
`seed = floor(random() * 2^32)` and `status = 'revealed'`. That single trigger is the whole anti-cheat.

## Realtime (later phases)

- Lobby channel per lobby: Presence for who is in the room, Postgres Changes on `messages` for chat.
- Match channel: Postgres Changes on the match row so both clients see "opponent has deployed" and the
  reveal without polling.

## Client / server split in Next.js

Client components: draft, deployment, battle, replay (they run the seeded engine in the browser). Server
components: home lists, lobby list, leaderboards, profile. Route handlers: none needed for the MVP; Supabase
is called from the client with the anon key under RLS. An Edge Function that imports the engine package is
the option for authoritative recompute if leaderboards ever need it.

## Milestones

| # | Deliverable | Depends on |
|---|---|---|
| M1 | Monorepo, engine package builds, Next.js app plays a full solo run (draft → deploy → battle → share) with no backend | nothing |
| M2 | Supabase: anonymous auth, runs saved, "Continue", profile handle, daily seed | Supabase project |
| M3 | 1v1: match rows, commit-and-reveal deployment, seed trigger, both clients resolve | M2 |
| M4 | Lobbies: create/join, presence, chat, start a match from a lobby | M3 |
| M5 | Campaign: 12 battles, run ends on a loss, general death, attrition, bracket | engine additions |

M1 needs nothing from outside the repo and is the one that answers "does the deployment screen feel
good".

## Schema

What we store is small because outcomes are never stored: a battle is fully described by two run strings,
two deployments, a terrain, a seed and a data version, about 200 bytes. Everything the UI shows is
recomputed from that in under a millisecond.

```sql
-- Everyone gets a profile row on first sign-in (anonymous or not).
create table profiles (
  id          uuid primary key references auth.users on delete cascade,
  handle      text unique,                     -- null until the player picks one
  created_at  timestamptz not null default now()
);

-- A solo run: the player's army, the AI army it fought, and the seed. Result is derived.
create table runs (
  id            uuid primary key default gen_random_uuid(),
  owner         uuid not null references profiles on delete cascade,
  data_version  int  not null,                  -- engine rules/roster version the run was played on
  terrain       text not null check (terrain in ('plains','hills','river','forest')),
  run_string    text not null,                  -- v=2&d=...&g=..&p=..&r=..&plan=..&dep=LCCRCLRC
  ai_run_string text not null,                  -- the opponent, same format (the AI is a seeded drafter)
  battle_seed   bigint not null,                -- 32-bit unsigned, fits bigint
  -- derived, recomputable, filled by the client after the battle so lists don't have to resolve:
  winner        char(1) check (winner in ('A','B')),
  casualties_a  smallint,
  casualties_b  smallint,
  created_at    timestamptz not null default now()
);
create index on runs (owner, created_at desc);

-- 1v1. Both players draft (each with their own draft seed), then commit deployments; the trigger seeds.
create type match_status as enum ('drafting', 'deploying', 'revealed', 'done');
create table matches (
  id            uuid primary key default gen_random_uuid(),
  data_version  int  not null,
  terrain       text not null,
  status        match_status not null default 'drafting',
  p1            uuid not null references profiles,
  p2            uuid references profiles,       -- null until someone joins
  p1_run        text,                           -- run string without dep=
  p2_run        text,
  p1_deploy     char(8),                        -- 'LCCRCLRC'; hidden from p2 until revealed
  p2_deploy     char(8),
  seed          bigint,                         -- set by trigger, never by a client
  created_at    timestamptz not null default now(),
  revealed_at   timestamptz
);
create index on matches (p1, created_at desc);
create index on matches (p2, created_at desc);

create table lobbies (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  owner       uuid not null references profiles,
  max_players smallint not null default 8,
  created_at  timestamptz not null default now()
);
create table lobby_members (
  lobby_id  uuid references lobbies on delete cascade,
  user_id   uuid references profiles on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (lobby_id, user_id)
);
create table messages (
  id         bigint generated always as identity primary key,
  lobby_id   uuid not null references lobbies on delete cascade,
  user_id    uuid not null references profiles,
  body       text not null check (char_length(body) <= 500),
  created_at timestamptz not null default now()
);
create index on messages (lobby_id, id desc);
```

### Row-level security

```sql
alter table runs enable row level security;
create policy "own runs" on runs for all using (owner = auth.uid()) with check (owner = auth.uid());

alter table matches enable row level security;
-- players see their matches, but the opponent's deployment is masked until revealed (see the view below)
create policy "my matches" on matches for select using (auth.uid() in (p1, p2));
create policy "join open match" on matches for update using (p2 is null and status = 'drafting')
  with check (p2 = auth.uid());
create policy "p1 writes p1" on matches for update using (auth.uid() = p1) with check (auth.uid() = p1);
create policy "p2 writes p2" on matches for update using (auth.uid() = p2) with check (auth.uid() = p2);
-- Column-level: clients never update seed/status/revealed_at (revoke update on those columns from authenticated).

-- What clients actually read: deployments masked until revealed.
create view matches_visible as
select id, data_version, terrain, status, p1, p2, p1_run, p2_run, seed, created_at, revealed_at,
  case when status in ('revealed','done') or p1 = auth.uid() then p1_deploy end as p1_deploy,
  case when status in ('revealed','done') or p2 = auth.uid() then p2_deploy end as p2_deploy
from matches;

alter table messages enable row level security;
create policy "lobby members read" on messages for select
  using (exists (select 1 from lobby_members m where m.lobby_id = messages.lobby_id and m.user_id = auth.uid()));
create policy "lobby members write" on messages for insert
  with check (user_id = auth.uid() and exists (select 1 from lobby_members m where m.lobby_id = messages.lobby_id and m.user_id = auth.uid()));
```

### The one trigger

```sql
create function seed_match() returns trigger language plpgsql security definer as $$
begin
  if new.p1_deploy is not null and new.p2_deploy is not null and new.seed is null then
    new.seed := floor(random() * 4294967296);
    new.status := 'revealed';
    new.revealed_at := now();
  end if;
  return new;
end $$;
create trigger seed_match before update on matches for each row execute function seed_match();
```

A client cannot see the other deployment before the seed exists, and cannot influence the seed. That is
the whole integrity story; everything after it is deterministic.

### Realtime

- `messages`: Postgres Changes on inserts, filtered by `lobby_id`, delivered to lobby members.
- `matches`: Postgres Changes on the player's rows so both clients learn "opponent deployed" and the
  reveal without polling. Presence on the lobby channel for who is online.

## Size and cost

Per row: a run is ~250 bytes of data, ~1 KB with indexes and Postgres overhead; a match ~1 KB; a chat
message ~150 bytes. The free tier's 500 MB database holds on the order of 400,000 runs. The engine JSON
(~90 KB) is a static asset served by Vercel, not by Supabase.

| Tier | Includes (as of this writing, verify at supabase.com/pricing) | Enough for |
|---|---|---|
| Free ($0) | 500 MB DB, 5 GB egress, 50k monthly active users, 200 concurrent Realtime connections, 2M Realtime messages/mo; project pauses after a week idle | development, a launch on Reddit, a few hundred daily players, lobbies up to ~200 people online at once |
| Pro ($25/mo) | 8 GB DB, 250 GB egress, 100k MAU, 500 concurrent Realtime connections (raisable), 5M messages/mo, no pausing, daily backups | a real player base; overage is usage-priced |

What actually drives cost is Realtime messages: each chat line is delivered once per subscriber, so a line
in a 10-person lobby is ~10 messages. Two million per month is ~200k chat lines in 10-person lobbies.
Database size will not be the constraint for years. Egress is small because the client fetches a few KB
per run. Anonymous users count as monthly active users, so the 50k MAU cap on Free is the first real
ceiling and it's a good problem.

Vercel's free Hobby plan covers the Next.js app for the MVP; the engine and data are static.

## Verified play

Two tiers. **Casual** runs are fully client-side: no verification, no leaderboard; a cheater there only
lies to themselves. Anything that touches a leaderboard or another player is **verified**:

1. **The server issues seeds.** A run starts with the server creating the `runs` row and generating
   `draft_seed`, `battle_seed` and a private `secret`. The client never chooses a seed.
2. **Rerolls are an RPC.** The client asks; the server checks `rerolls_used < rerolls_granted`, draws the
   new row from `hash(secret, row, rerolls_used)`, records it, returns it. The client cannot predict a
   reroll, and cannot grant itself one.
3. **The AI deploys server-side, after the player commits.** Same commit-and-reveal as 1v1 with the server
   playing the AI: the client writes its deployment, an Edge Function computes the AI's from the secret,
   writes both, and only then can the client read the AI deployment.
4. **Replay before it counts.** An Edge Function importing the engine package rebuilds the draft from
   `draft_seed`, the choices and the recorded rerolls, and checks indices in range, rerolls ≤ granted, the
   elite cap, and `data_version`. If it does not replay cleanly the run is rejected. Under a millisecond.

Solving the game with the engine is not cheating and is not prevented: boards are random, deployment is
hidden, ratings are public by design. The daily challenge is the one place a solver matters; server-stamped
pick timing is the mitigation if it ever needs one.

### Schema additions for verified play and ad rerolls

```sql
alter table runs
  add column draft_seed       bigint not null,
  add column secret           bytea  not null,      -- never selectable by clients (column privilege revoked)
  add column rerolls_granted  smallint not null default 2,
  add column rerolls_used     smallint not null default 0,
  add column reroll_log       smallint[] not null default '{}',   -- rows rerolled, in order
  add column player_deploy    char(8),
  add column ai_deploy        char(8),              -- written by the server after player_deploy
  add column verified_at      timestamptz;

-- RPCs (security definer functions): start_run(terrain) → run id + draft_seed;
--   reroll(run_id, row) → the new row's seed;  commit_deploy(run_id, dep) → ai_deploy.
-- Edge Function: verify_run(run_id) replays and sets verified_at.
-- Edge Function: ad_reward(callback) verifies the ad network's signature and does rerolls_granted += 1.
```

**Ad rerolls.** A rewarded-ad network's server-side verification callback hits `ad_reward`; the client is
never the one incrementing the counter. Policy decisions deferred: cap at one extra per run; daily and
ranked boards either cap extras or list separately (`rerolls_granted` is on the row, so either is a
query). The engine's reroll limit is a per-draft parameter so a replay with three recorded rerolls is
accepted when three were granted.
