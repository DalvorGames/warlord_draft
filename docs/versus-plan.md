# Versus: build plan for 1v1 rooms

*2026-09-17. Against `docs/ui-handoff-v3/UI-HANDOFF.md` §13 and the nine `Versus-*` artboards plus `Main-Invite`.
For review before anything is built.*

## 1. What the spec fixes, and what this plan adds

The spec decides: same hidden board, strictly live with timers (general 45s, row 40s, line 90s, auto-pick at
zero), one battle on a ground drawn at join, watched separately with a presence line, rematch keeps the room and
its record, two private rerolls, three doors in (link, invite row, VERSUS tab), the room code alphabet, the
presence words, the claim-the-field rule, server-side deadlines, nothing new in the resolver.

This plan adds the parts the spec leaves to the build: where state lives, how the two clients agree, how timers
are enforced without a clock on the client, how the run screens are reused, and what a player is called.

## 2. Architecture

**One source of truth: a room row on the server.** Every read and write goes through Next route handlers under
`/api/rooms`; the browser never talks to the database. Storage is a Supabase Postgres table reached from the
server with the service-role key (an environment variable, never in code or in the bundle). Locally, with no
keys set, the same store is a JSON file under `apps/web/.rooms/`, so two tabs on localhost can play.

**The engine runs in both places.** The client draws the board from the room seed as it does today. The server
imports `@warlord/engine` too, to validate every pick against the same board, apply auto-picks at deadlines, and
record the winner. The engine package gains a `./data/*.json` export so the server can load data without the
filesystem.

**Deadlines are server timestamps, enforced lazily.** Each seat stores `step` and `stepStartedAt`. The client
shows a countdown from the server's clock (the room view carries `now`, so client clock drift does not matter).
Whenever any request touches the room, the server first settles expired deadlines: general → index 0, row →
first legal card (freeing an elite slot if needed), line → the run's default line, plan unchanged. Auto-picks are
listed on the seat so the other player is told. No cron, no sockets.

**Presence is polling.** The client heartbeats every 10s and on every step change, with `beat` while watching
the report. While it waits on the other player (room, drafts locking, lines locking) it polls every 2s. The dot
turns faint after 20s of silence and the word turns to LEFT after 60s, both computed on the server. Supabase
Realtime can replace the polling later without changing the screens.

**Hidden picks.** Each seat's run string is private on the server until both drafts are complete; the room view
for a seat carries the other seat's run only from that moment, and the other seat's line only once both lines
are locked or expired. Both clients then resolve the same battle: `resolve(hostArmy, guestArmy, ground, seed)`.
The guest sees it through a new engine helper, `flipSides(result)`, so every run screen keeps "A = you".

## 3. Data

One table, `rooms`, JSON-heavy so the shape can move while the mode is young:

| Column | Holds |
|---|---|
| `code` (pk) | six characters from `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` |
| `created_at`, `updated_at`, `expires_at` | waiting rooms expire ten minutes after creation; a room with a match is kept 24 hours past its last activity |
| `status` | `waiting` · `ready` · `drafting` · `deploying` · `battle` · `done` · `closed` |
| `match_no` | 1, 2, 3 … one per rematch |
| `seed`, `ground`, `battle_seed`, `data_version` | drawn when the second player joins; redrawn on rematch |
| `host`, `guest` (json) | `{ name, token, ready, step, stepStartedAt, lastSeenAt, run, plan, line, locked, auto: string[], beat }` |
| `record` (json) | `{ host, guest }` wins; plus `history: [{ matchNo, winner, hostRun, guestRun, ground, seed, claimed }]` |

Tokens are random 128-bit strings issued at create and join; the device keeps `{ code, seat, token, name }` in
`localStorage["wd.rooms.v1"]`. A request carries its token in a header; the server maps it to a seat. The view
returned to a seat never includes the other seat's token or its private run.

`supabase/schema.sql` creates the table; there are no RLS policies because only the service role reads it.

## 4. Server: the room state machine

Pure functions in `apps/web/src/lib/versus/room.ts`, tested with vitest (added to the web app), wrapped by thin
route handlers:

| Route | Does |
|---|---|
| `POST /api/rooms` | create: code, host seat with token and name, `waiting`, `expires_at` +10 min |
| `POST /api/rooms/:code/join` | second device takes the guest seat; draws seed, ground, battle seed; `ready` |
| `GET /api/rooms/:code` | settle deadlines, touch `lastSeenAt`, return the seat's view with `now` |
| `POST …/ready` | toggle ready; when both are ready, `drafting` and both general timers start |
| `POST …/pick` | `{ general }` · `{ card }` · `{ reroll }`: validated against the seat's step, applied, step advances, timer restarts; after row 8 the seat is `drafted`; when both are, `deploying` and both line timers start |
| `POST …/line` | `{ plan, deployment, locked }`: lock, or unlock while the other has not locked; when both are locked (or expired) the server resolves once, records the winner, `battle` |
| `POST …/presence` | heartbeat; `{ beat }` while watching; `{ done: true }` at the end of the report |
| `POST …/claim` | allowed when the other seat's `lastSeenAt` is 60s old during a match: the match ends as a win by default, `claimed: true` in history |
| `POST …/rematch` | either player asks; the room redraws a board, resets both seats to unready, `ready`; the other player's view shows the offer |
| `POST …/leave` | frees a seat in a waiting room, or closes the room after a match |

Validation on every write: the token owns the seat, the room is in the right status, the step matches, the card
index is legal for that row on that board, the deployment has eight entries. The server rebuilds the seat's draft
from its run string with `replayDraft(run, { rerolls: 2 })` before applying a pick, so it cannot be fooled by a
client that skips rows.

## 5. Engine changes

- `flipSides(result)`: swap A and B throughout a `BattleResult` (winner, fronts, casualties, morale, armies,
  contests, events, trait events), so the guest's screens stay in the second person.
- `autoPick` helpers: `firstLegalCard(state, row)`, `defaultLine(army)` are the existing functions exposed on the
  facade; nothing new in the rules.
- `startDraft` and `replayDraft` already take `{ rerolls }`; the duel passes 2.
- Package export for `./data/*.json`.

Nothing in the resolver or the data changes. No data version bump.

## 6. Client

### 6.1 New screens
- **VERSUS tab** (`/versus`): copy from the artboard, Create a room, Join a room (six-letter field and the link
  case), the head-to-head list from the device's known rooms with "Play again". The tab bar becomes TODAY ·
  VERSUS · RULES on the three tab screens; run and room screens hide it.
- **Room** (`/v/:code`): the invite link and the room screen are the same route. With no seat on this device it
  joins; with a seat it resumes. Waiting state (code boxes, Share the link via `navigator.share` with a clipboard
  fallback, Copy code, the two discs, the ten-minute line, Leave). Ready state (ground and its two clauses from
  `GROUND_NOTE`, the timers line, the split ready-up in the two culture fills, Leave). Redirects into the run when
  the room is past `ready`.
- **Name prompt**: a one-line sheet the first time this device creates or joins ("What do we call you?"), kept
  in the device store and editable from the VERSUS tab. See §8.
- **Today's invite row and the tab dot**: on load, Today asks the server about the rooms this device holds a
  seat in; the newest open room where the other player is present draws the row (initial disc in his culture
  fill once he has a general, else bone) and the dot. Rematch offers use the same row.

### 6.2 The run screens in duel mode
The campaign save gains `kind: "duel"` with `{ code, seat, token }`, so General, Draft, Board, Deploy, Battle and
Result are reused. The provider, in duel mode, mirrors every pick to the server and polls the room; the screens
branch on `kind === "duel"` for the additions:

- **Header timer** in the right slot (mono, rust under ten seconds, `aria-live="polite"`) fed by the server's
  `stepStartedAt` and `now`.
- **Presence line** under the progress bar: dot state and `NAME · WHERE` from the server view.
- **General**: copy "Three names. You both see them." / "He may take the same one."; the timer; no Numbers link.
- **Draft**: rows are sequential and each pick is final once Next row is pressed (§8); the reroll control shows
  "2 LEFT"; the hint "Same four cards on his screen. Your pick stays hidden until the line is set."; the Board
  sheet shows the eight rows but only picks already taken. At zero the server has picked; the client shows the
  card marked AUTO and moves on.
- **After the draft**: a waiting card in the Locked style, "Sam is still drafting · row 6 of 8", until both
  drafts are in.
- **Deploy**: the enemy row reads "Sam with Fabius of Rome" over his eight tokens; the sheet shows his traits,
  read and cards; the matchup rings and the plan row work as in the run; Scouts is inert (§8); the CTA is
  **Lock the line**; presence PLACING.
- **Locked**: Deploy dims under the card (`YOUR LINE IS LOCKED`, "Sam is still placing.", his countdown, Unlock
  and change); the footer reads "Locked · waiting for Sam". When the other player has been silent 60s, the card
  gains "Claim the field" beside "Keep waiting".
- **Battle**: both names on the scoreboard, his side in his culture bright hatched; presence `WATCHING · AT
  <beat>`; the client posts its own beat as it steps. The guest renders `flipSides(result)`.
- **Result** (`Versus-Result`): head-to-head card with the record, the turning point and its trait, the
  chronicle with AUTO marks where the server picked, both lines revealed, two tiles, the share text
  (`Warlord Draft · 1v1 · KJ4M7Q` and the two shapes), Rematch (primary) and Share, Back to today and Leave the
  room. A claimed match says so instead of the turning point.

### 6.3 Copy already in hand
Ground clauses, trait sentences, plan fits, the read, matchups, strength words, the turning point and the why line
all come from the v3 helpers unchanged.

## 7. Milestones, each pushed and checked on the site

| # | Deliverable | Acceptance |
|---|---|---|
| V0 | `supabase/schema.sql`; the room store (file + Supabase); the state machine with tests; all route handlers | Two curl sessions can create, join, ready, draft to the end with deadlines settling, lock lines, and read the same resolved battle; auto-picks land at zero |
| V1 | Engine `flipSides` + data export; VERSUS tab; Room waiting and ready; name prompt; `/v/:code`; Today's invite row and tab dot; device room store | Two browsers reach the ready-up from the link and from a typed code; the invite row appears on the other device |
| V2 | Duel mode in the run screens: timer, presence, sequential rows, hidden picks, the drafting wait, Deploy with Lock and Unlock, Locked card, claim the field | Two browsers play a full draft and lock lines; a browser left idle is auto-picked and can be claimed |
| V3 | Battle with presence and the guest's flipped view; Versus-Result; record; Rematch; share text | Both sides see the same battle from their own seat; a rematch redraws the board and the record increments |
| V4 | Vercel env vars set (you), smoke test on the live site with two phones, session state and memory updated | Live |

Order of work: V0 and the engine helper first because everything else reads their shape.

## 8. Decisions I would take unless you say otherwise

1. **Names.** No accounts exist, so a name has to come from somewhere. Ask once per device, on the first Create
   or Join, in a one-line sheet; keep it on the device; make it editable on the VERSUS tab. Empty means "Host"
   or "Guest".
2. **Rows are sequential and final in a duel.** The row timer needs a current row, and unpicking after the
   fact would let a player game the clock. Next row commits the pick; the Board sheet is read-only.
3. **The row timer starts on the server** when the seat enters the row. The reel's three seconds happen inside
   the forty. Both players are under the same rule.
4. **Timers do not pause** for the Board sheet, the enemy sheet or a hidden tab. The spec says strictly live.
5. **Scouts is inert in a duel.** Both players place at the same time, so there is no line to scout. The chip
   reads off with the note "No scouts in a duel: he is placing while you are."
6. **The record is per room and per device.** Without accounts, "Head to head" on the VERSUS tab lists the rooms
   this device has a seat in. A friend on another phone sees the same record from their side of the room.
7. **Polling, not sockets**, for this pass. Two seconds while waiting, ten for heartbeats. It keeps everything
   inside Next route handlers and Vercel; Supabase Realtime is a later swap if the presence line feels slow.
8. **Rematch by either player**; the other sees the offer as the invite row and on Result, and the ready-up
   decides. A rematch from a closed room is refused.
9. **Room lifetime.** Waiting rooms expire after ten minutes; played rooms are kept a day past their last
   activity so the record and Rematch survive a phone lock. Cleanup is a query for later, not a job.
10. **AUTO marks** are shown as small mono tags on the auto-picked units in the Result's line reveal and in the
    chronicle line for the line ("His line was set for him."), which is the nearest the current chronicle offers.

## 9. What you need to do

Create a Supabase project, run `supabase/schema.sql` in its SQL editor, and add `SUPABASE_URL` and
`SUPABASE_SERVICE_ROLE_KEY` to the Vercel project's environment variables (Production and Preview). The Vercel CLI
token on this machine has expired, so either `vercel login` here or paste them in the dashboard. Until they are
set, the live VERSUS tab says the server is not set up, and everything works locally on the file store.

## 10. Not in this pass

Spectators, chat, best-of-three, ranked rooms, accounts, push notifications for invites, a share image, Supabase
Realtime, and the handicap (the spec turns it off in 1v1 anyway).
