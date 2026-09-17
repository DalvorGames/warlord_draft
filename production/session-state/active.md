# Session State — Warlord Draft

*Last updated: 2026-09-17*

## Current task

v3 rebuild shipped 2026-09-17 (engine data version 3 + client rebuilt to docs/ui-handoff-v3/UI-HANDOFF.md).
Next: measure and tune on the new data (battle 1 sits at about 70%, target 80%); decide the handicap later.

## v3 rebuild (2026-09-17)

- Engine v3: traits pool in `rules.traits`, `traits` per general (design/content draft), one trait id per culture,
  `style`/doctrine deleted, board L L C R F F F F with per-card culture, rerolls 3, SUPPLY nudge, elite threshold 75,
  stats compressed halfway to 70, ground excludes STEADY, COMMAND 0.875 + 0.25·C, Rally fights shaken,
  trait events in `rounds[].traits`, `campaign.ts` (tiers by stat-sum terciles, cost ceilings 58/66/none, foes
  exclude the offered pool, player-blind `blindLine` with a panel and a seeded near-tie pick), `beats.ts` key
  callouts / turning point / why line / strength words. Tests: 42 pass. Lab scripts excluded from tsc (README note).
- Measured (500 campaigns, greedy reasoning player): 70 / 67 / 53%, completion 29%; culture level I 57%, II 9%.
- Client: every screen rebuilt to v3 (Today, General, Draft, Board sheet, Deploy with enemy row/sheet, unit card,
  plan card, Battle with strength bars/front strip/reveal, Between, Result loss+win, Rules, Numbers). Save key
  `wd.campaign.v2` with a data-version check; old saves reset with the spec's message. Draft frozen after battle 1.
- Decided by the designer 2026-09-17: no handicap published yet; duplicates on a board allowed.
- Not built: handicap, ladder, desktop layout, three reveals tab on a conquest (tap-a-battle is built), share image.

## Progress

- [x] Claude Code Game Studios template installed (skills, agents, rules, hooks, settings, CLAUDE.md)
- [x] Four first-pass reviews: `docs/reviews/2026-09-16-{design,balance,ux,art}-review.md`
- [x] Plain-language mechanics explainer: `docs/MECHANICS.md`
- [x] Reverse-documented system GDDs in `design/gdd/`:
  - [x] `battle-resolution.md`
  - [x] `deployment.md`
  - [x] `army-preparation.md`
  - [x] `draft.md` (includes a decided but unbuilt redesign, §3.B)
  - [x] `units-and-generals.md`
  - [x] `campaign.md`
- [x] `design/gdd/game-concept.md` (pillars, anti-pillars, target player confirmed by the designer)
- [x] `design/gdd/systems-index.md`
- [x] Ran `/review-all-gdds` (verdict FAIL; report in `design/gdd/gdd-cross-review-2026-09-16.md`)
- [x] Applied the 25 consistency fixes; systems 1–6 now In Review
- [x] Took the cross-review's design decisions (table in the report's addendum)
- [x] First sweeps: doctrine bonus needs about 1.02–1.03 for the ≤60% target, and Defensive is an underpowered plan; CHARGE curve has almost no aggregate effect, stacking still untested
- [x] Engine: `rules.command` added (behaviour unchanged, tests pass); six CHARGE-stacking variants in `deploy_swap.ts`; lab scripts moved to `packages/engine/src/cli/lab/` with a README
- [x] Measured (report: `docs/reviews/2026-09-16-measurements.md`): CHARGE stacking is NOT dominant (retired); softening COMMAND barely shrinks the general lottery because general stats are correlated in the data; foe general tiers + cost bands 60/66/full give 84/74/49 and 33% completion for a reasoning player; a default-deploying blind AI loses 66.5% to a reasoning player; ground does not mask the curve
- [ ] Decide what to do about the general lottery now that COMMAND is shown to be a weak lever (handicap ladder, de-correlate general data, or both)
- [ ] Strengthen the Defensive plan; set `styleMatchBonus` to about 1.02–1.03
- [ ] Build the player-blind AI with a seeded choice among near-tied lines and a better own-roster line than the default
- [ ] Move `campaignFromSeed` into the engine
- [ ] Still unmeasured: ground excluding STEADY; everything about the new draft board and SUPPLY
- [ ] `/quick-design` per decided fix, then measure with `npm run batch -w packages/engine`

## Design decisions made by the designer on 2026-09-16

| Area | Decision |
|---|---|
| Plan / doctrine | Must be a real decision. Flat ×1.08 match bonus to shrink (~1.04) or become fight-specific |
| COMMAND | Soften to `0.90 + 0.20 × COMMAND/100` |
| AI deployment | Hidden but guessable. **Revised:** the campaign AI is player-blind; it picks a good layout from its own units and the ground, never reading the player's roster, line or plan. Same strength all three battles |
| Player info at deploy | Enemy roster plus a prose read. No shape hint |
| Pitch | Starts empty, hand placement only, no auto-deploy |
| Plan timing | Per battle on the Deploy screen (already implemented) |
| Ground | Affects combat stats only, not STEADY |
| Combined arms | Keep; re-measure after the board change (target about a third of armies; today 97%) |
| Draft board | 2 line, 1 cavalry, 1 ranged, 4 flex |
| Row cultures | Mixed: culture drawn per card, not per row |
| Traits | Level I buildable on purpose (60–70% when chased); level II a rare treat (<10%) |
| SUPPLY | Graded: slight nudge to card rarity; 80+ still grants the third elite |
| Draft constraint | Elite cap only, for now. Per-grade budget (maybe SUPPLY-boosted) is a future option |
| Difficulty curve | Tier foes by general strength per battle, for now |
| Loss rule | One loss ends the run; tune to about 29–31% completion. Per-battle targets raised during the cross-review to about 80% / 65% / 55–60% (the earlier 75/60/50–55 multiplied to under 25%) |
| Dead code (river charge mult, China II skirmish weight, slot penalties in the AI drafter, terrain lean, campaign flag) | Decide later |

## Defects found while documenting (not yet fixed)

1. AI deployment simulates against the player's chosen plan: leaks hidden information (`CampaignProvider.tsx:50`).
2. Draft stays editable after battles are fought; past results are silently recomputed.
3. Deploy screen's reserve preview assumes the foe uses the default deployment; it does not.
4. Foe can draw the player's general; two foes can share a general.
5. Reinforcements event can never fire in the app (client never passes `opts.campaign`).
6. Old saves crash `resolveAll` after a data version change.

## Files being worked on

`design/gdd/*.md`, `docs/MECHANICS.md`, `docs/reviews/*.md`

## Open questions awaiting the designer

- How a flex row should draw classes on the new board (Draft §9.6)
- Whether the player sees all three foes before drafting (Campaign §9.4)
- Roster gaps: Steppe has 3 generals, India 4 (Units & Generals §9.3)

## Notes

- Engine changes that alter outcomes need a `dataVersion` bump; v2 data must stay served for old run strings.
- Working tree has many uncommitted changes from the UI handoff v2 redesign plus today's docs. Nothing committed today.

## Session Extract — /review-all-gdds 2026-09-16
- Verdict: FAIL
- GDDs reviewed: 6 (plus game-concept and systems-index)
- Flagged for revision: battle-resolution, deployment, draft, army-preparation, campaign, systems-index (blocking); units-and-generals, game-concept (warning)
- Blocking issues: 15 consistency (broken §7/Q pointers, dependency directions backwards, stale "AI weakened" line, three arithmetic errors); 5 design (SUPPLY double dip; difficulty levers conflict; player-blind AI may be a solved read; CHARGE² unexamined; rewarded reroll claim unverified); 1 scenario (draft editable after a battle)
- Recommended next: apply the consistency fixes in one pass, take the six designer decisions, then measure all decided changes together in one batch run
- Report: design/gdd/gdd-cross-review-2026-09-16.md

## Decisions added after the cross-review (2026-09-16)
- Per-battle targets about 80 / 65 / 55–60%, about 30% completion.
- SUPPLY keeps both levers under one joint cap (about 5 win-rate points between SUPPLY 50 and 100).
- Foe army cost bands as the second difficulty lever, alongside general tiers.
- Player-blind AI picks among its near-tied best lines using the campaign seed.
- CHARGE² measured first; other changes gated on it.
- One extra rewarded reroll for everyone, daily included; anti-pillar is now "power is never for sale".
- Early breaks intended and rare. COMMAND provisionally halfway (0.875 + 0.25·C), decide after measuring.
- Designer's idea: generals on the leaderboard. Wins, then general handicap (weaker ranks higher), then casualties; per-general rankings; handicap from measured win rate; show it on cards now.
- Scratch measurement scripts (campaign run, doctrine sweep, deployment, draft economy) live in the session scratchpad under `balance/` and will be lost unless moved into the repo.

## Traits proposal (2026-09-16, late)
- Designer's direction: generals keep four (flatter) stats and gain 0–3 **traits** from a shared pool of fifteen; greater generals have more. Each culture grants its own trait at 4 units, a second level at 6. Same trait stacks to level III. The general `style` and the doctrine bonus are deleted. Reserves should become real (guard a flank, step in as the line thins).
- Design doc: `design/gdd/traits.md` (In Design). Pool with sizes: `packages/engine/src/cli/lab/trait_pool.ts`.
- Engine: trait hooks added to `types.ts`, `prepare.ts`, `resolveFronts.ts` plus `Army.extraTraits`; all neutral by default, tests pass, reference battle identical. No shipped data uses them.
- Measured: every scaling trait sizes to +4 / +8 / +12 points (Hammer and anvil III tops out at +8.7); rule traits Delayer +9, Master of ground (halved penalties) +9, Rally +12; depth equals breadth at those sizes; trait-vs-trait within 2 points of even. First definitions of Numbers, Deep ranks (frontage/reserves), Terror and Hammer and anvil were too weak and were redefined.
- Next: assign traits to the 81 generals; flatten and de-correlate stats; design real reserves; narrate traits in the report; then move data and client over with a dataVersion bump.

## General traits draft (2026-09-16, late)
- Draft assignment for all 81 generals: `design/content/general-traits-draft.md`; data `packages/engine/src/cli/lab/general_traits.ts`; regenerate with `npx tsx src/cli/lab/general_traits_sim.ts 40000 --md`. 5 generals with 3 traits, 22 with 2, 34 with 1, 20 with none; 18 hold a rule trait.
- FINDING: traits on top of today's stats WIDEN the general lottery (win-rate SD 12.7 → 15.3) because the famous generals already have the best stats. Compressing stats halfway to 70 gives 28–78% (SD 11.4, about today's); three-quarters gives 33–72% (SD 9.2). Suggested: compress hard and show the handicap.
- Rally holders are 5 of the top 8 generals; Rally should be weakened (wings only, or rallied front fights shaken).
- Awaiting the designer: which approach to the double count; edits to the assignment.

## UI handoff v3 (2026-09-16, night)
- Played one full run on the local build at phone width (a loss at battle 1); 17 screenshots in `docs/ui-handoff-v3/screens/`. The user's saved daily run in Chrome was backed up and restored exactly.
- `ux-designer` agent reviewed the UI against the gameplay plan: `docs/ui-handoff-v3/UX-REVIEW.md`.
- Brief for a Claude Design session: `docs/ui-handoff-v3/UI-HANDOFF-V3.md` (self-contained) with a README.
- Decided with the designer: enemy on Deploy as an always-visible strip plus a sheet (roster page goes); tokens are abstract class shapes with a culture edge and a grade tick; morale shown as strength remaining with FIRM / STEADY / BRITTLE / ROUTED (display only); no "best pick" tag on draft cards.
- Found while playing: Today already shows all three foes and grounds before the draft (answers Campaign open question 4); the board sheet shows every row from the start; draft card buttons have no accessible name; new battle beats land below the fold; Greece and Macedon are both blue in the battle bars; "RECKONING" is truncated.
- Next: the user hands the v3 folder to a design session; mocks and an updated UI-HANDOFF come back.

## 1v1 lobbies (2026-09-17, planned, not built)
- Designer asked for a 1v1 mode with one-off lobbies; a design handoff is coming, then a plan before any build.
- Direction agreed in principle: one battle per lobby, six-letter code + link, no accounts (per-device seat token),
  same seed for both (general pool, board, ground), private simultaneous drafts with three rerolls, rosters revealed
  when both lock, blind lines, resolve when both lines are in, each side sees the report from its own seat.
- Storage: Supabase table behind Next route handlers (keys server-only); file store locally. Needs the designer to
  create the project, run `supabase/` SQL, and set `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` on Vercel.
- Engine needs only a result-flip helper (resolve as host vs guest, flip for the guest so the report stays A = you).
- Sketch: extend `CampaignSave` with `kind: "duel"` so General, Draft, Deploy, Battle and Result are reused;
  new routes `/1v1` (create) and `/1v1/[code]` (join, wait); route handlers under `/api/lobby`.

## 1v1 rooms: built 2026-09-17 (V0–V3 of docs/versus-plan.md)
- Server: `apps/web/src/lib/versus/room.ts` (pure state machine, 10 vitest tests), `store.ts` (Supabase REST with
  optimistic `version`, JSON files under `apps/web/.rooms/` locally), route handlers under `/api/rooms`.
  Table `rooms` created on the designer's Supabase project `warlord_draft` (ref frksmnnmuvwkgodbmpbj) via
  `supabase db query --linked`; `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` set on Vercel Production (the
  legacy service_role JWT; the CLI prints the new secret key truncated). `apps/web/.env.local` has the same.
- Client: `/versus`, `/v/[code]`, name prompt, invite row + tab dot; `CampaignSave.kind = "duel"` mirrors the
  room into the run screens (provider polls every 2s, server run string is the truth); guest sees `flipSides`.
- Verified in Chrome as host against a scripted guest (`scratchpad/sam.mjs`): create, join, ready-up, timed
  general and rows, presence words, roster reveal, lock/unlock card, claim offer on absence, battle with his beat,
  Versus result with the record, rematch back to the ready-up and into match 2, Today's invite row.
- Not yet: the guest's own UI path was exercised only through the API and unit tests; V4 live smoke test with
  two phones; Supabase Realtime; AUTO marks on tokens (only a sentence on Result); Preview env vars on Vercel.
