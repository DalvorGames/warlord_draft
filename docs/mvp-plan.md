# Warlord Draft — MVP plan: the three-general campaign

*2026-09-16. Builds on `docs/ui-handoff/UI-HANDOFF.md` (the design spec, v1), `docs/build-plan.md`
(architecture, component inventory) and `docs/app-design.md` (Supabase schema, verified play). Where this
document and those disagree, this one wins: it narrows the product to one mode.*

## 1. What the MVP is

One mode: **the campaign**. You pick a general, draft eight units once, then face **three enemy generals in
a row**. Each battle you see his roster, choose a doctrine, set your line, and watch the battle beat by
beat. Lose once and the campaign is over. Win three and you have conquered.

Two ways to play it:

- **Today's campaign.** Same seed for everyone, same three generals on the same grounds, one attempt. This
  is the front door on the phone, as the design shows.
- **Free campaign.** A fresh seed, unlimited attempts, "Redeploy and retry" allowed. Sharable by run string.

Not in the MVP: 1v1, lobbies, chat, the ARMIES and LADDER tabs, ads, attrition between battles, the
twelve-battle season and bracket from the original design plan. The tab bar shrinks to `TODAY · RULES`.
Copy is US English; the mocks' "centre" becomes "center".

Everything in UI-HANDOFF §1 (decisions already made) still holds: phone-first, War Room tokens, one row per
screen on the phone, tap-a-unit-tap-a-front, doctrine chosen at deploy, grades never cost, stepped battle,
no emoji.

## 2. Campaign rules

The engine has no campaign object yet. These are the rules it will implement; the ambiguous ones carry a
recommendation and are listed again in §9 for a yes/no.

| Rule | MVP |
|---|---|
| Draft | Once per campaign: general plus eight units, `rules.rerolls` (2) rerolls total. The army is the same for all three battles. |
| Opponents | Three AI armies drafted by the greedy bot from `campaignSeed`-derived seeds, each with its own general. Their rosters are visible on the Deploy screen of that battle only. |
| Grounds | Three terrains drawn from the campaign seed, no repeats. Shown on Today ("plains, then hills, then river") so the draft can plan for them. |
| Per battle | You choose doctrine and deployment fresh each battle (the enemy roster changes). He deploys as a reader against your roster (`aiDeploy`). |
| Loss | Any lost battle ends the campaign at that battle. The general's death is reported when it happens but changes nothing else. |
| Difficulty | Flat: the same bot for all three. Escalation (more elite slots or rerolls for foe 3) is a knob to add later, not MVP. |
| Attrition | None. Casualties are recorded per battle for the score, but the army starts every battle whole. Carrying losses forward needs a unit-strength concept the engine lacks. |
| Score | Battles won (0–3), then total losses across the battles played, lower is better. Standings sort on that pair. |
| Length | Draft about ninety seconds, each battle about a minute with Play. A full campaign is five to six minutes; the Today card says so instead of "about three minutes". |

## 3. Flow and screens

```
Today ─▶ 1 General ─▶ 2 Draft (×8 rows, Board sheet) ─▶ 3 Deploy ─▶ 4 Battle (7 beats) ─▶ Between battles ─┐
                                                          ▲                                                  │
                                                          └──────────── battles 2 and 3 ─────────────────────┘
                                                                                                             ▼
                                                                                           Campaign result ─▶ Today
```

Progress bar: **six segments** — General, Draft, Battle 1, Battle 2, Battle 3, Result. Deploy and battle
share a segment; the draft's own eight-segment bar stays as designed.

Screen by screen, the delta from the handoff:

- **Today** (`Phone-Home`, `Main`). The muster card gains a line per enemy: "Chabrias of Greece on plains ·
  Surena of Persia on hills · Boudica of Gaul on river" (name, culture, ground; no rosters). Facts row:
  `SEED · BATTLES 3 · REROLLS 2`. Yesterday's line reads "Conquered, 14% lost" or "Fell at battle 2 to
  Surena". Last five as W/L marks where W means all three won. Standings show `3 won · 14% lost` style
  scores. Resume state: if a run is in progress the button reads "Resume — battle 2, deploy".
- **General, Draft, Board sheet.** Unchanged from the handoff (§3.2, §3.3, §4.1–4.3, §5.1).
- **Deploy** (`Phone-Deploy`, `Deploy`). Header adds `BATTLE 2 OF 3 · HILLS` and the enemy general's name.
  Otherwise as designed: hidden `?` fronts, roster read line, doctrine pills, three fronts with live cohesion.
  New: the `N IN RESERVE` tag from §9.3 of the handoff, since it is cheap and the terrain now changes.
- **Battle** (`Phone-Battle`, `Battle`). Unchanged, with one change in the first beat: the skirmish plays
  as narration over the morale bars and the contest cards appear from contact on (handoff §9.2, UI-side
  fix, no engine change).
- **Between battles** (new, small). After a win in battle 1 or 2: the battle's headline, its four stats,
  its chronicle, then "Next: Surena of Persia on hills" and one button, "March on". After a loss it goes
  straight to the campaign result. This is the Result screen with a different footer, not a new design.
- **Campaign result** (`Phone-Result` adapted). Headline: "The province is yours" / "The campaign ends at
  battle 2". General and doctrine line lists the three grounds. Stat tiles: `BATTLES 3/3 · YOU LOST 14% ·
  HE LOST 41% · ENDED P4`. "How it went" becomes three short blocks, one per battle, each with its
  decisive clause. Share card and `RUN` button as designed. Deployments revealed per battle.

Share card, five lines, no unit names:

```
Warlord Draft · 16 Sep · 1147
me   Ashoka        W W W
him  Chabrias Surena Boudica
both his wings gone by press 3
conquered · 14% lost
```

A lost campaign: `me Ashoka W L —`, last line `fell at battle 2 · 22% lost`.

## 4. The engine does not change

The resolver is the same function for every battle: `resolve(yourArmy, hisArmy, terrain, battleSeed)`. A
campaign is data, and the app calls the engine three times. `dataVersion` stays 2.

**A campaign is one JSON object.** Each enemy is a run string, rebuilt with the existing `replayDraft`;
his deployment comes from the existing `aiDeploy` against your roster.

```json
{
  "id": "2026-09-16",
  "seed": 1147,
  "battles": [
    { "foe": "v=2&d=88102&g=1&p=0,2,1,3,0,1,2,0&r=&plan=aggressive", "terrain": "plains", "battleSeed": 11 },
    { "foe": "v=2&d=40311&g=0&p=…&plan=defensive",                    "terrain": "hills",  "battleSeed": 12 },
    { "foe": "v=2&d=72950&g=2&p=…&plan=envelopment",                  "terrain": "river",  "battleSeed": 13 }
  ]
}
```

Phase A generates it from the date on the client (a small `campaignFromSeed(seed)` in the app that draws
three foe seeds, three distinct terrains and three battle seeds with the engine's RNG) and ships free
campaigns the same way from a random seed. Phase B stores the same object as a `dailies` row, which lets
the server hand-pick or regenerate the day's generals without a client release.

**Your side is run strings too.** One draft, then a plan and deployment per battle, is three run strings
sharing the draft fields. A finished campaign is the campaign id plus those three strings. Verification is
the server replaying them with the unchanged engine.

**Two exports, no rule changes.**

1. `frontThreshold(...)` from `resolveFronts.ts`, so the Deploy screen's live cohesion and reserve count
   come from the same code that resolves the battle. The UI never re-implements a formula.
2. The narration templates from the handoff §6 as `narrateBeats(result)`, a pure function of the battle
   records with losing variants, kept beside `narrateFronts` so the CLI can print them too. The app could
   own this instead; it lives in the engine only so every consumer reads the same lines.

**Tests.** Campaign JSON is deterministic from its seed; three run strings round-trip; the three cohesion
numbers for `CCCLRLRC` on plains, defensive, match `resolve(...).fronts.A` through the export.

## 5. Architecture

Unchanged from `docs/build-plan.md` §3: npm workspaces monorepo.

```
packages/engine    src/, data/, scripts/, test/ → dist/ ESM; data/v2/*.json served as static files
apps/web           Next.js App Router, TypeScript, Tailwind with the §2 tokens as CSS variables
supabase           migrations/, functions/ (phase B)
```

The engine runs in the browser. `EngineProvider` loads `data/v2/*.json` once. `useCampaign` owns the
`CampaignState`, mirrors it to the URL (the run string plus `stage=`) and to `localStorage`, so a refresh
or a closed tab resumes at the same screen, which answers handoff §9.1.

Routes: `/` Today · `/general` · `/draft/[row]` · `/deploy/[battle]` · `/battle/[battle]` ·
`/result` · `/run/[runString]` (a shared link replays and lands on the result) · `/rules`.

## 6. Two phases

**Phase A — playable, client only.** Everything in §3 and §4 with the free campaign and a "daily" whose
seed is derived from the date on the client. Deployed to Vercel from GitHub. No accounts, no standings:
Today's card shows your own last five from `localStorage`. This is the whole game and is shareable.

**Phase B — Supabase.** Anonymous sign-in, the real daily, standings, resume across devices.

- Tables (subset of `docs/app-design.md`): `profiles` (id, handle, created_at), `dailies` (date,
  campaign_seed, published_at), `campaign_runs` (id, user_id, daily_date nullable, run_string, battles_won,
  losses_pct, ended_at, verified). Row-level security: users read their own runs and the daily's standings
  view, insert their own runs, never update a finished one.
- **Verification, the minimum that stops forged scores.** The client submits only the run string. An Edge
  Function running the engine replays it, computes the score, and writes `battles_won`/`losses_pct` itself;
  the client's numbers are never trusted. One attempt per user per daily is a unique index.
- **Hidden information.** The enemy's deployment and the reroll outcomes are deterministic from the seed,
  so a determined client can compute them. For the MVP daily this stays an accepted hole, with the server
  replay as the only guard. The reroll RPC and server-side AI deploy from `app-design.md` "Verified play"
  are the next step after launch, not MVP. (§9, decision 6.)
- What the user must do before B: create the Supabase project, turn on anonymous sign-ins, hand me the
  project ref and anon key. GitHub push and the Vercel root change to `apps/web` happen at the start of A.

## 7. Milestones

| # | Deliverable | Acceptance |
|---|---|---|
| M0 | Monorepo, engine package built and imported by a blank Next.js app; tokens, fonts, progress bar, tab bar | `npm run dev` renders the shell with a battle resolved in the console; `npm test` still green |
| M1 | Engine exports (threshold, reserve, narration beats) with tests; app-side `campaignFromSeed` and the campaign state hook | Same date gives the same three foes on two machines; three run strings round-trip |
| M2 | General → Draft → Board sheet against a real `DraftState`, consequence line, reel | Consequence line correct for every card on seed 1147 after any sequence of picks; elite-capped cards disabled |
| M3 | Deploy with live cohesion, doctrine, reserve tag, enemy roster read line | Thresholds for `CCCLRLRC`, plains, defensive read 0.95 / 1.02 / 0.94 from the engine helper |
| M4 | Battle stepper, seven beats, skirmish as narration, bars, Play mode | Front bars end at `damage / threshold`; morale ends at `moraleFraction` |
| M5 | Narration templates, Between-battles and Campaign result screens, share card, `RUN` copy, `/run/[runString]` | A friend opens a shared link on a phone and sees the same three battles and the same card |
| M6 | Today with free campaign, date-seeded daily, resume from `localStorage`, `/rules` | Close the tab mid-draft, reopen, land on the same row; Phase A done, deployed on Vercel |
| M7 | Supabase: anonymous auth, dailies, campaign_runs, replay-verifying Edge Function, standings on Today | A forged run string with a fake score is rejected; standings show verified scores only |

M0 to M6 need nothing outside the repo except the GitHub push and Vercel. M7 needs the Supabase project.

## 8. Handoff open items, settled for the MVP

| Handoff §9 | Decision |
|---|---|
| 1 Resume state | URL plus `localStorage`; Today's button becomes "Resume — battle 2, deploy". |
| 2 First beat too heavy | UI plays the skirmish as narration over the morale bars; contest cards start at contact. No engine change. |
| 3 Frontage and reserves invisible | Add the `N IN RESERVE` tag on Deploy, computed by the engine helper. |
| 4 Ghosted guess at his deployment | No. Deployment stays a read of his roster, not a hint. |
| 5 Share card colour | Text only for the MVP. |
| 6 Desktop board shows all eight rows | Accept the divergence; desktop is built after the phone screens work. |

## 9. Decisions taken (2026-09-16)

1. One draft for all three battles. Doctrine and deployment are chosen fresh for every battle.
2. No attrition. Casualties count for the score only.
3. Grounds are drawn per campaign, no repeats, and shown on Today.
4. Flat difficulty across the three foes.
5. Score is battles won, then total losses.
6. Phase B verification is server replay only; the reroll RPC and server AI deploy come after launch.
7. The engine is not changed beyond two exports; campaigns are data (§4).
8. Monorepo with npm workspaces. **US English** throughout: the mocks say "centre", the build renders
   "center". Generals are "he".
