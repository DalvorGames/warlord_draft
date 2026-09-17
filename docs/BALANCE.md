# Balance log

## 2026-09-16 — first batch pass

Engine built from HANDOFF v0.2. Tools: `npm run batch` (report), `npx tsx src/cli/sweep.ts` (rules grid),
`npx tsx src/cli/swap.ts` (paired unit swap in one slot), `node scripts/tune_costs.mjs` (cost loop).
Reports for this pass are in `out/final/` (20,000 battles per drafter, seed 5, trait toggle on).

### What changed

| Knob | Handoff | Now | Why |
|---|---|---|---|
| `phaseWeights` | 0.30 / 0.50 / 0.60 / 0.50 | 0.50 / 0.50 / 0.40 / 0.60 | Skirmish weight is the early-rout dial: 0.30 gave 0.6–5% early routs, 0.50 gives 15%. Grind lowered and flank raised so more battles reach the flank. |
| China L2 `phaseWeight` | 0.30 (a no-op) | 0.60 | Must exceed the base skirmish weight to do anything. 0.65 measured +15 pts lift; 0.60 is the next step down, unmeasured. |
| Unit costs | hand-authored | 26 units moved (`git diff scripts/build_data.mjs`) | Cost loop on the random drafter, 30k battles/round, until every unit is within 5 pts of same-grade units in the same slot kind. |

Cost moves worth a look before accepting: all four chariots fell to D/F (2–3), all elephants fell 2–3 points
(Indian and Carthaginian elephants A → B), Persian units broadly cheaper, Indian mace-men and Gallic levy
warband up 2. Everything else moved one point.

### Where the numbers stand (random drafter unless noted)

| Target (HANDOFF §6) | Result | Status |
|---|---|---|
| No unit > 8 pts off | worst 6.1 pts (greedy: 8.2) | pass |
| Early routs 10–25% | 15.0% (greedy: 4.5%) | pass for random, not for greedy |
| Off-class placements always lose | all lose, both drafters | pass |
| Cavalry-heavy ≥ 5 pts better on plains than hills | +2.9 (greedy +2.3) | fail |
| Heavier army (≥ 20% cost) wins 75–80% | 68% (greedy 56% on 612 battles) | fail |
| Trait L1 lift +4..+6 | car +2.5, chn +3.7, gal +4.9, grk −1.1, ind +3.5, mac +1.6, per −1.8, rom +2.4, stp +4.4 | mostly under; grk and per negative |
| Plans | env 54.5, agg 51.8, skm 48.4, def 45.3 | defensive is 9 pts behind |

Fixture targets from HANDOFF §9.2, traits off, same general both sides: pike wall vs cavalry-heavy **57%**
(target ~70); horse archers vs heavy infantry **1%** (target ~65); javelins vs elephant army **8%** (target
~60). The last two are structural, see below.

### Findings that need a design decision

1. **Specialist armies cannot win.** Every phase is a symmetric score contest and the loser's damage is
   `weight × edge × 2`. An army that does not contest the charge or the grind loses those phases at a 0.6–0.7
   edge, which is 60–70% of its morale threshold from a single phase. Horse-archer and javelin armies win the
   skirmish by a wide margin and then die in the charge and grind. The Steppe L2 rule (half grind damage)
   is not enough. Options: cap the per-phase edge (e.g. 0.5), let skirmish damage carry into the charge as
   shaken, or let a side that wins the skirmish decisively skip the charge ("refuse battle"). All are formula
   changes; none is in the spec.
2. **Shock infantry is the best class per point, ranged the worst, in the one slot where classes compete.**
   Paired swap on the flex slot, same battles: Hypaspists 65%, Companions 60%, Qin swordsmen 60%, armored
   elephants 56%, heavy cavalry 56%, elephants 54%, any line unit 50%, longbows 45%, Agrianians 45%.
   Shock units count in the charge and the grind; cavalry count in the charge and a flank that is skipped
   in about a third of battles; ranged count once. Cost tuning absorbs this inside each slot kind, but it
   cannot make a third archer a sane flex pick. If ranged-heavy builds should be viable, the phase
   structure has to change (see 1).
3. **Half the matchup table is dead.** Matchups are attacker-keyed, and cavalry is never a defender in the
   charge or grind, so pike ×1.3, elephant ×1.4, halberd ×1.2 vs cavalry never fire. Chariots only ever
   meet their penalties (×0.6–0.8 vs formed infantry) because their bonuses target archers, who are never
   in a wall. `chargeWallMatchup: true` (a new knob, default off) scales each wall unit's steadiness by
   its own matchup vs the enemy chargers; it fixes the pike case but does not move aggregate numbers.
   Chariots need either re-authored tables or acceptance as cheap flavor units (the tuner priced them at
   2–3).
4. **Terrain is too weak.** Hills multiply cavalry stats ×0.8, but cavalry only matter in the charge and
   flank, and the flank is often skipped. Measured plains-minus-hills for cavalry-heavy armies is +3
   points, target +5. Raise `terrain.hills.cavalry` toward 0.65 or add a hills charge penalty.
5. **Persia and Steppe are the weakest home cultures** (39% and 46% random; 31% and 30% greedy). Their
   generals are weak by design and their rosters are cavalry- and skirmish-heavy, which finding 1 and 2
   punish. Persia's trait is draft-time only, so the trait toggle cannot measure it (it reads −2).
6. **Greedy vs random disagree on early routs** (4.5% vs 15%). Greedy armies are more even, so edges are
   smaller. Decide which population the 10–25% target is for.
7. **Plan balance is confounded in the greedy report** (it always plays the general's matching plan, so
   plan = general quality). Read plans from the random drafter: defensive is 9 points behind envelopment.
   The defensive plan gives charge ×0.8 and flank ×0.85 for grind ×1.15 and morale ×1.10; with grind now
   at weight 0.40 that trade is poor. Consider grind ×1.25 or charge ×0.9.

### Things verified

- Same run string + seed replays the identical battle (test).
- All off-class placements lose to on-class in both drafters.
- Elite count tracks win rate monotonically (random: 0 elites 44%, 1: 53%, 2: 60%, 3: 68%).
- Grade tracks win rate monotonically with the random drafter (S 59, A 59, B 55, C 51, D 50, F 46).
- 10,000 battles resolve in ~2–4 s.

## 2026-09-16 — three-fronts model, first pass

Model: `docs/battle-design-three-fronts.md`. Reports in `out/final-fronts/` (20,000 battles per drafter,
seed 11, trait toggle on). Everything below is the random drafter unless noted; the greedy bot plays the
general's matching plan, so its plan numbers are really general-quality numbers.

### What changed since the v1 pass

| Knob | Value | Why |
|---|---|---|
| `fronts.weights` | skirmish 0.40, contact 0.50, press 0.25, rollup 0.40 | Skirmish at 0.50 made zero-shooter armies 18% and the skirmish plan 35%; at 0.25 zero-shooter armies won 55%. 0.40 puts the shooter sweet spot at 2–4. |
| `fronts.plans` | new table per fight kind | v1 plans were written for v1 phases. Defensive was 60% under them. |
| `fronts.terrain` | stakes per fight kind (hills wings ×0.6, forest wings ×0.5 …) | Per-class stat multipliers cancel when both sides bring cavalry. |
| `fronts.frontage` / `reserveMult` | 1.5 / 0.25 | Without it eight in the center out-scored four before the wings could wheel in (all-center won 86%). |
| Break shocks | wing 0.1, center 0.25, flat | Applied to empty fronts too, so an empty wing is never free. |
| Traits | Gaul charge 1.08/1.20, India 1.08/1.15, Macedon wing 1.25/1.40, Greek discipline 1.15/1.20 + morale 1.05/1.10 | Charge bonuses land on three contact fights now; wing bonuses on one. |
| Unit costs | 56 of 135 differ from the hand-authored roster | Cost loop on this model. Elephants back to S (they win wing fights vs cavalry at ×1.4), javelins up, pikes down (their anti-cavalry row only fires when horse rolls into their center). |

### Where the numbers stand

| Measure | Result | Status |
|---|---|---|
| Unit within 8 pts of same-grade, same-slot | worst 7.4 (greedy 11.9: armored elephants at 15) | pass |
| Trait L1 lift (+4..+6) | car +5.5, chn +3.9, gal +3.4, grk +6.0, ind +3.8, mac +3.0, rom +6.9, stp +5.3; per −3.8 (draft-time only, unmeasurable here) | pass in spirit |
| Trait L2 lift | grk +17.6, stp +9.9, ind +8.6, chn +6.7, car +6.3, rom +6.5, mac +2.4, gal −0.5 | Greek L2 too strong, Macedon and Gaul L2 rules too weak; next pass |
| Plans | skirmish 51.8, defensive 49.7, envelopment 49.6, aggressive 48.9 | pass |
| Heavier army (≥ 20% cost) wins | 76% | pass |
| Cavalry-heavy plains − hills | +4.5 (greedy +6.3) | borderline; forest is −9 |
| Routs before the round limit | 82% (greedy 63%) | accepted as intended |
| Center breaks / general deaths | 20% / 18% of armies | accepted; a campaign ends on any loss anyway |
| Shooters | 0 → 40%, 1 → 48%, 2–4 → 50–52%, 5 → 45%, 6+ → 38% | the tradeoff works |
| Center size | 2–5 → 50–53%, 6 → 45%, 1 → 44% | the tradeoff works |

### Deployment as a decision (src/cli/deploy_swap.ts, 4,000 paired matchups)

| Army A deployment | Win % |
|---|---|
| default heuristic (infantry and foot archers center, mounted and skirmishers to wings) | 53 |
| terrain-aware lean (wing units to center on hills/forest) | 49 |
| center 3, five best wing units on the wings | 42 |
| refuse the right (move it to the left) | 32 |
| refuse the right (move it to the center) | 33 |
| inverted: cavalry center, infantry wings | 31 |
| all center | 4 |

Deployment matters a lot: a wrong one costs 20 points and all-center is near-certain defeat. But none of
the tried alternatives beats the default, which is the "lookup" risk from the design doc. The untested
half is matchup-aware deployment against a visible enemy roster (load the wing facing their weak wing);
that is the next experiment, and the AI's own deployment should be measured against it.

### Open

1. Greek L2 (+17.6) needs cutting; Macedon L2 `pikes_ignore_shaken` and Gaul L2 do almost nothing.
2. Terrain: hills is +4.5 for cavalry-heavy armies; either hills wings ×0.5 or accept. Forest is strong.
3. Matchup-aware deployment experiment and AI deployment heuristic.
4. Persia's trait is draft-time only and cannot be measured by the toggle; its home culture sits at 32%,
   the weakest by far, mostly because of its generals. Consider a battle-side component.
5. Elephants at cost 15 winning 65–67% in the greedy report: the wing charge is very strong and the
   rampage event is the only liability (2% of battles). Consider a per-battle rampage check on losing
   contact rather than an event.

## 2026-09-16 — deployment experiment and second balance pass

### Is deployment a skill? Yes.

`src/cli/deploy_swap.ts`, random drafter, paired seeds. The **reader** bot (`deployAgainst`) assumes the enemy
deploys by the default heuristic, simulates ~20 candidate deployments of its own roster against that over
six private seeds, and keeps the best.

| Army A | Army B | A wins |
|---|---|---|
| blind default | blind default | 50% |
| reader | blind default | **66%** |
| blind default | reader | 32% |
| reader | reader | 49% |
| swap wings (strong vs strong) | blind default | 50% |
| terrain lean | blind default | 45% |
| all center | blind default | 2% |

The reader changes the default in 92% of battles. Its moves are spread, not one trick: shift a cavalry
unit between wings or into the center (~35%), move a ranged unit from the center to a wing so it wins a
missile exchange (~19%), move a shock unit out to a wing (~15%), pull a skirmisher in (~13%), swap the wings
(8%). Reader vs reader is even, so the edge is all in the reading. **Recommendation: the AI opponent
deploys as a reader**, so the player has to out-guess it, and the batch bots should too once costs are
re-tuned under it.

### Balance changes and their measured effect (random drafter, 20k, trait toggle)

| Change | Before | After |
|---|---|---|
| Greek L2: discipline 1.15, morale 1.05, steadiness 1.08 (was disc 1.20, morale 1.10) | +17.6 | +12.1 |
| Macedon L2: wing 1.35 + roll-up impact ×1.30 (was wing 1.40 + pikes rule only) | +2.4 | +4.2 (L1 +3.3) |
| Gaul L2: charge 1.25, morale 0.95 (was 1.20 / 0.90) | −0.5 | +12.4 (n=186, noisy) |
| Hills wing stakes 0.5 (was 0.6) | +4.5 | +4.8 (greedy +9.5) |
| Elephant rampage: per-battle check, 30% per elephant unit on a front that loses contact badly, India L2 halves (was a 2% event) | Indian elephants 65% at cost 15 | cost loop took them to 13; Indian L1 lift +5.1 |
| `emptyFrontWeight` 0.15 | Macedon L2 wing army with no center won 25% | 5% (test) |

Plans: skirmish 51.6, defensive 50.1, envelopment 49.2, aggressive 49.1. Heavier army wins 75.6%. Unit
balance: worst 5.8 pts. Center size: 4 is best (55%), 2–3 and 5 sit at 48%, 6 at 43%.

### Still open

- Greek L2 (+12) and Gaul L2 (+12, small n) are still the strongest level-2s; Macedon L2 (+4) the weakest.
- Persia: trait is draft-time only; home culture 33%.
- Re-run the cost loop with both bots deploying as readers before trusting S-grade numbers in the greedy
  report (S units win 56% there).

## 2026-09-16 — step 1 close-out: reader bots, Persia, client build

Both batch bots now deploy as readers (3 private seeds). The cost loop under readers needed one move
(Iphicratean Peltasts 9 → 10) and converged at 5.0 pts. Greek L2 steadiness 1.04, Gaul L2 charge 1.18,
Persia gained steadiness 1.05 / 1.08. Reports: `out/final-fronts/` (20k per drafter, seed 11).

| Measure (random drafter) | Result | Status |
|---|---|---|
| Unit within 8 pts of expected | worst 6.8 (Carthaginian elephants, n=127) | pass |
| Trait L1 lift | car +4.4, chn +3.6, gal +4.4, grk +6.7, ind +2.6, mac +3.8, per −1.0 (L2 +6.2), rom +6.0, stp +4.3 | pass |
| Trait L2 lift | grk +10.4, stp +9.9, rom +9.7, ind +9.4, chn +7.8, gal +7.0, car +6.6, mac +5.8, per +6.2 | within 5 pts of each other except Greece |
| Plans | skirmish 52.4, envelopment 50.1, aggressive 48.9, defensive 48.7 | pass |
| Heavier army wins | 75.0% | pass |
| Cavalry-heavy plains − hills | +5.9 (greedy +8.7); forest −14 | pass |
| Center size | 4 best (52%), 3 and 5 within 3 pts, 2 → 45%, 6 → 44%, 1 → 34% | the tradeoff works |
| Shooters | 2–3 best, 0 → 34%, 6+ → 34% | the tradeoff works |
| Routs before the round limit / general deaths | 81% / 20% of armies | accepted as intended |

Greedy report differences are general-quality effects (envelopment generals are the best tacticians) and
S units at 56% there reflect the greedy bot taking every S card it sees.

Engine is frozen for the MVP at data version 2. Client entry point: `src/api.ts`; build with `npm run
build`, smoke with `npm run smoke`.
