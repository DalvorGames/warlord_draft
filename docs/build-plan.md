# Warlord Draft — build plan

*2026-09-16. Follows the site design (`Warlord Draft — site design.html`, 14 artboards) and
`docs/app-design.md` (architecture, schema, verified play). Detailed enough to build from, high level enough
to fit on a few pages.*

## 1. What the design shows

Fourteen artboards. Five desktop, seven mobile, two superseded directions (Codex, Draft Night) that we
ignore. The mobile boards are the primary target; the desktop boards are the same screens with room.

| Screen | Desktop | Mobile | What it does |
|---|---|---|---|
| Home | Hero, Start a run / Watch a battle, replay-a-run-string field, Daily muster card (seed, terrain, your result, enter), Last night's upset, footer stats | "Today's muster" card (seed, ground, rerolls, Draft today's army), Yesterday + last five W/L, Free run / Replay a seed, Today's board so far | Entry. Daily is the front door on mobile. |
| 1 General | Three cards: culture, name, note, four stat bars, doctrine (free), elite slots, board lean, a one-paragraph read, CTA per card | Same as a vertical list with a check on the chosen one, a hint line at the bottom | Pick one of three. |
| 2 Draft board | All eight rows at once: row type + culture, four cards with grade, name, class tag, subtype, cost, six stats, "holds a centre / wins a wing" hint; Reroll row; right rail: general, slots 5 of 8, elite 1 of 3, rerolls, total cost, culture counters toward 4 and 6, doctrine picker with its multipliers, CTA | One row at a time (Row 3 of 8, progress bar, Reroll · 2, four tall cards, sticky elite/cost/culture footer), plus a "whole board" sheet with every row as two-column mini cards | Draft. |
| 3 Deploy | "Where do they stand?" Three hidden enemy fronts (? boxes), Standard order / Clear, three drop zones with per-front units, avg discipline and cohesion, a Not-yet-placed tray; right rail: enemy roster with a read, doctrine (changeable here) with multipliers, "If a front gives way" numbers, Give battle | "Set the line": hidden enemy fronts, three tap zones, Not-yet-placed chips, tap a unit then tap a front, Roster link | Deployment. |
| 4 Battle | Stepper (Skirmish, Contact, Press 1–4, Result), Back / Play it through / Next step, army morale bars vs rout line, three front tiles with state, stage title + blurb, one card per contest with bars, scores, top units, damage; right rail: the chronicle, deployments now shown, run string copy, Redeploy and retry | 1 of 7 beats with Skip, morale bars, three front tiles, one contest card per front, Next | Playback. |
| 5 Result (mobile) | — | Headline, one-line matchup, Ended / His morale / You lost / He lost tiles, "How it went" by stage, "What gets shared" no-spoiler block, Share today's result, Run | Share. |

Two lines from the design set the tone and should survive verbatim in copy: "A row decides which culture
is offered, not what the unit becomes. Where it fights is your call, later." and "You have his roster. You
do not have his deployment, and he does not have yours."

## 2. Design language

- **Type:** Instrument Serif for display (headlines, unit names in the recap), IBM Plex Sans for body,
  IBM Plex Mono for labels, numbers, stat rows, run strings. Small caps tracking on mono labels.
- **Colour:** near-black ground (#14130f), slightly lifted panels, hairline borders, cream text. Burnt
  orange for the one primary action per screen and for warnings ("Nothing here"). Gold for *you* (your
  bars, your wins, elite counts), steel blue for *him*. Grade badges as small mono squares. Exact tokens
  come from the design assets when we build; these are the roles.
- **Layout:** one column on mobile, a content column plus a right rail on desktop. Cards are dense: stats
  in a six-column mono grid. Progress is a four-segment bar (General, Draft, Deploy, Battle) coloured by
  the step you are on.
- **Voice:** second person, present tense, no exclamation marks. The engine's recap lines are already in
  this voice; the UI copy should match it.

## 3. Architecture

Monorepo, npm workspaces:

```
packages/engine    today's engine: src/, data/, scripts/, test/ → dist/ (ESM, no Node imports), data/v2/*.json
apps/web           Next.js (App Router, TypeScript, Tailwind + CSS variables for the tokens)
supabase           migrations/, functions/ (from M2)
```

**Engine in the browser.** The app fetches `data/v2/*.json` once, calls `createEngine`, and keeps it in a
React context. Every screen is a client component; the engine runs on the player's device.

**State model.** One `RunState` object: draft seed, general index, picks, rerolls, plan, deployment, terrain,
AI run string, battle seed. It serialises to the run string plus a few query params, so **the URL is the
save file**: refresh anywhere and the screen rebuilds from the URL. `localStorage` keeps the current run for
"Continue" and the last five results; Supabase replaces that at M2.

**AI opponent.** `aiDraft(seed)` with the greedy bot, `aiDeploy` as the reader. In casual play the client
computes both. In verified play (daily, ladder) the server does, after the player commits (app-design.md,
"Verified play").

**Battle playback.** `resolve()` returns the full round log up front; the UI walks it. Stages: skirmish,
contact, press 1–4, result. "Play it through" advances on a timer; "Next" advances by hand; the mobile
version is one beat per tap. Nothing is animated that the log doesn't contain.

**Share.** The result screen's "What gets shared" block is a fixed-width text card: date, seed, both
deployments as L/C/R counts, the deciding line, ended-at and casualties. Copy to clipboard plus the run
string; the `/r/[run]` page replays it for anyone.

## 4. Screen specs

**Home.** Static shell. Start a run mints a draft seed and goes to `/draft?d=`. Watch a battle replays a
curated run string. The daily card reads today's seed (date hash) and, once accounts exist, your result.
Last night's upset is editorial until the ladder exists, then it is yesterday's most-shared run.

**General.** `startDraft(seed)` → three generals. Card shows the engine's numbers; the "read" paragraph is
generated from rules: doctrine name from `styleToPlan`, elite slots from logistics, board lean from
culture, one sentence about the trait. Picking calls `pickGeneral` and lands on the board.

**Board.** `state.rows` rendered as rows (desktop) or one row at a time (mobile). Card hint "holds a
centre / wins a wing" from class: line and shock hold, cavalry, skirmish and special win wings, ranged
shows neither. Reroll calls `rerollRow`; the mobile row header shows rerolls left. Right rail and mobile
footer come from `summarize()`: slots taken, elite used of cap, rerolls, cost, culture counts with "two more
for Elephant Line" style notes from `traitThresholds`. Doctrine picker calls `setPlan` and shows the plan's
multipliers from `rules.fronts.plans`. CTA enabled when `validate()` is empty. "Replay the roll" is a small
sheet that re-deals the board visually from the seed for effect, no state change.

**Deploy.** Enemy roster from `aiDraft`, shown as a list with a one-line generated read ("Two horse and two
shooters against six that want to stand"). Your eight units start in the tray; Standard order applies
`defaultDeployment`. Each front shows unit count, average discipline and the cohesion threshold, computed
with `prepare()` on the current deployment so the numbers move as you drag. Empty centre shows the warning
line with the real `emptyFrontWeight + centerBreakShock` number. Doctrine can still change here. "If a
front gives way" lists the shocks from rules. Give battle sets the AI deployment (`aiDeploy` in casual)
and the battle seed, then goes to `/battle`.

**Battle.** `resolve()` once; the stepper indexes into `rounds`. Per stage: title and blurb (fixed copy
per stage), army morale bars with the rout line at `routLevel`, front tiles with state (holding, shaken,
broken, wheeled in), one contest card per contest with both scores, top contributors, the capped edge, and
damage dealt. Events and roll-ups render as tagged lines. The chronicle is `recap`. Result stage shows
both deployments, the reckoning or rout line, casualties, the general's fate. Redeploy and retry returns
to `/deploy` with the same seed (casual only; the daily is one attempt).

**Result / share (mobile).** Same data, share-first layout. "Share today's result" uses the Web Share API
where present, clipboard otherwise.

## 5. Milestones

| # | Deliverable | Acceptance |
|---|---|---|
| M0 | Monorepo, engine package consumed by a blank Next.js app, tokens and fonts, four-step shell | `npm run dev` shows the shell with the engine loaded and a battle resolved in the console |
| M1 | Solo run end to end: Home → General → Board → Deploy → Battle → Result, URL as save file, share page | A friend can open a shared link on a phone and see the same battle |
| M1.5 | Mobile polish: one-row-at-a-time board, whole-board sheet, tap-to-place deploy, beat-per-tap battle, "what gets shared" card | Playable in three minutes on a phone, as the design promises |
| M2 | Supabase: anonymous auth, saved runs, Continue, My armies, handle | Runs survive a new browser after linking an account |
| M3 | Daily muster: server-issued seed, one attempt, verified path (reroll RPC, server AI deploy, replay check), today's board | Daily leaderboard cannot be gamed by forged inputs |
| M4 | 1v1: match rows, commit-and-reveal, seed trigger, Realtime "opponent deployed" | Two browsers fight one match and see the same battle |
| M5 | Lobbies: create/join, presence, chat, start a match | A group can chat and pair off |
| M6 | Campaign: 12 battles, run ends on a loss, general death, attrition, bracket | Engine additions plus one screen |

M0–M1.5 need nothing outside the repo. M2 needs the Supabase project. M4 onward need Vercel + GitHub for
a shared URL.

## 6. Component inventory (apps/web)

Shell: `AppHeader`, `StepBar`, `RightRail`, `PhoneSheet`. Cards: `GeneralCard`, `UnitCard` (full and
mini), `StatRow`, `GradeBadge`, `ClassTag`. Draft: `BoardRow`, `RowPager`, `WholeBoardSheet`,
`DraftSummary`, `CultureCounters`, `DoctrinePicker`. Deploy: `FrontZone`, `UnitChip`, `HiddenFronts`,
`EnemyRoster`, `GivesWayPanel`. Battle: `Stepper`, `MoraleBars`, `FrontTile`, `ContestCard`, `EventLine`,
`Chronicle`, `DeploymentsShown`, `RunStringField`. Result: `ResultHeader`, `HowItWent`, `ShareCard`.
Data: `EngineProvider`, `useRun` (URL ⇄ RunState), `useBattle` (resolve + stepper).

## 7. Where the design and the engine disagree (to settle while building)

1. **"Redeploy and retry."** Fine for free runs. The daily is one attempt; the button hides there.
2. **Doctrine changeable at deploy.** Supported; the run string's plan is whatever was set last.
3. **Rows with fewer than four cards.** The design shows it ("India fields three cavalry units"); the
   engine does it. The card slot renders the note.
4. **"Holds a centre / wins a wing" for ranged.** The design leaves ranged untagged; keep that.
5. **Enemy roster shows the general's tactics.** Fine; nothing hidden about the general.
6. **The mobile whole-board sheet shows two cards per row where the desktop shows four.** Same data; the
   sheet uses mini cards.

## 8. What I need from you

- A yes on the monorepo restructure and npm workspaces (or pnpm).
- The design assets if you want pixel tokens rather than my reading of the screenshots: an export of the
  canvas with CSS, or the values for ground, panel, border, text, orange, gold, blue.
- Copy decisions I'll otherwise make: British spelling as in the design ("centre"), generals as "he".
- For M2+: the Supabase project, and the GitHub push.
