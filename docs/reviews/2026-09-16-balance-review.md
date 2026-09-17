# Balance review — 2026-09-16

Scope: the three-fronts engine at data version 2 (`rules.battleModel: "fronts"`), the campaign as shipped in
`apps/web` (three battles, greedy AI foes, reader deployment, any loss ends the run). Sources: `docs/BALANCE.md`,
`docs/battle-design-three-fronts.md`, `docs/DECISIONS.md`, `packages/engine/data/*.json`, the resolver and draft
code, `out/final-fronts/report-{random,greedy}.json` (20k battles each), plus ~1.9M battles of my own simulation
(see Method). The top-level `out/report-*.json` are the older v1-model reports and were not used for numbers.

Assumptions: the "reasonable player" is the engine's greedy bot (highest-cost on-class card, culture chase, two
rerolls, doctrine plan); the AI opponent is exactly what `api.ts:61` and `CampaignProvider.tsx:50` do (greedy
draft, `deployAgainst` with 6 reader seeds against the player's roster). Win rates are quoted with 95% CIs where
they come from my runs; the batch reports' n are given in the tables.

## Verdict: NEEDS TUNING

The unit economy is healthy: after the cost loop every unit is within 6.8 points of its grade/slot baseline in the
random-drafter batch, grade tracks win rate monotonically (S 61 → F 40), the heavier army wins 75%, and the
resolver has no numeric edge cases (no NaN/negative outputs across extreme rosters, deployments and terrains;
thresholds 0.55–1.16; every front can break and none always breaks). Deployment is a real skill with a wide
range of outcomes (1% to 51% for the same roster).

What needs tuning is the layer above the units. Three multipliers that sit outside the cost loop decide most
battles: the general's command multiplier (`prepare.ts:155`), the doctrine bonus (`styleMatchBonus` 1.08,
`prepare.ts:142-143`), and the AI's simulating deployment (`deploy.ts:90-105`). General stats alone explain 92%
of the variance in general win rate (24.5% to 79.0%), the doctrine plan is the best plan for 98.8% of rosters,
and the AI's reader deployment beats the obvious deployment 68/32. The result is a campaign whose completion
rate is 7% for a sound-but-naive player, 15% for one who deploys as well as the AI, and 25% for one who also
knows which general in the pool of three is best; the difference between those numbers is not unit choice.
Nothing is broken, but the campaign is decided by the general lottery and by a deployment contest the player is
not given the information to win.

## Top 5 findings

### 1. The general lottery is the biggest factor in the game (impact: campaign completion 0–60% by general)

Evidence:
- OLS of batch general win rate (greedy report, n≈490 each) on the four stats: `wr% = −44.1 + 0.555·command +
  0.353·tactics + 0.126·logistics + 0.273·charisma`, R² = 0.918. Per +10 stat points: command +5.6, tactics
  +3.5, charisma +2.7, logistics +1.3 win-rate points. Spread 24.5%–79.0%, SD 12.1.
- Command feeds `cmd = 0.85 + 0.30·command/100` (`prepare.ts:155`), which multiplies every score in every
  contest: Bessus (55) gets ×1.015, Hannibal (95) ×1.135, a 12% edge before anyone drafts.
- Campaign sim, greedy player deploying as a reader (6 seeds): completion 15.4% overall, but 45–60% with
  Hannibal/Epaminondas/Philopoemen/Pyrrhus and 0% (n=12–15 each) with Ariobarzanes, Dentatus, Flaminius,
  Maharbal, Hasdrubal Barca. Picking the best of the three offered generals: 25.3% ±2.5; the worst: 7.5% ±1.5.
- Culture residuals after controlling for general stats are all within ±5 points (greedy: rom +3.6, mac +1.6,
  ind −5.1, per −2.5). "Persia is weak" (home culture 34–35%) is true and is entirely its generals: stats predict
  36.7%. Gaul likewise (predicted 38.7%, actual 37.5–42%).

Recommendation: flatten `cmd` to `0.90 + 0.20·command/100` (`prepare.ts:155`; make it a rules knob). This cuts
the command edge from 12% to 8% and, by the regression, the general SD from ~12 to ~9 points. Then re-run the
cost loop (it is insensitive to this, but the greedy report's plan/general confound shrinks). Separately, do not
draw campaign foes uniformly from all 81 generals (`spec.ts:27-33`): see finding 4.

### 2. The AI's reader deployment beats every deployment a player can reason to (impact: per-battle 33% vs 50%)

Evidence (1,200 paired greedy-vs-greedy matchups, B = the AI exactly as shipped):

| Player deployment of the same roster | Win % vs the AI |
|---|---|
| default heuristic (infantry/foot archers center, mounted/skirmishers to wings) | **32.2 ±2.6** |
| swap wings | 42.9 |
| reader, 3 seeds (what the batch bots use) | 46.6 |
| reader, 6 seeds (same as the AI) | 49.0 |
| reader, 12 seeds | 51.3 |
| center 2/3/4/5/6 strongest by center quality, rest to wings | 37.3 / 35.6 / 34.7 / 32.6 / 32.5 |
| refuse the right wing | 11.9 |
| all center | 0.9 |

Every fixed shape sits at 32–37%; the only way to 50% is to simulate. `docs/battle-design-three-fronts.md:13-14`
promises "the AI deploys by a heuristic that reads the player's roster the same way, so its deployment is
guessable"; the shipped AI (`api.ts:61`, DECISIONS §29/§33) assumes the *player* deploys by the heuristic and
optimises against that, so the player is the one being read. In the campaign sim this is the difference between
6.7% and 15.4% completion.

Recommendation, one of:
- (a) Give the player the reader's information: on the Deploy screen show the foe's *assumed* deployment (the
  default heuristic applied to the foe roster, which is what the AI assumes of the player) and a per-front
  preview of contact score vs. that assumption (the `preview.ts` pattern; the resolver's `contactParts` is
  pure). Expected: naive player from 32% toward the reader-3 level (~45%).
- (b) Cheaper: `aiDeploy` seeds 6 → 1 and blend with the default 50% of the time. Expected: default-deploying
  player from 32% to roughly 42–45% (reader-vs-reader is 49%, blind-vs-reader 32%, so a half-blind AI lands in
  between).
Do (a) if the deployment skill is the game; the numbers say it is.

### 3. The plan is a lookup, and going off-doctrine is a 14-point trap (impact: one of three player decisions is dead)

Evidence:
- Best plan per roster against a fixed field of 24 opponents (300 greedy rosters): the general's doctrine plan is
  the best plan for **98.7%** of rosters; mean gap between a roster's best and worst plan 20.2 points.
- Greedy bot forced to a fixed non-doctrine plan: envelopment 37.0%, skirmish 37.8%, defensive 37.3% vs 51.0%
  for doctrine (n=2,000 each, ±2.2).
- The cause is `styleMatchBonus` 1.08 applied to all four phase multipliers (`prepare.ts:142-143`): an 8% edge in
  every contest, larger than any difference in the `fronts.plans` table. Sweep (240 rosters, in memory):

| styleMatchBonus | doctrine plan is best | cost of always playing doctrine | best plans (agg/def/env/ski) |
|---|---|---|---|
| 1.08 (current) | 98.8% | 0.1 pts | 103 / 79 / 29 / 29 |
| 1.05 | 82.5% | 1.0 | 89 / 64 / 41 / 46 |
| 1.03 | 67.5% | 2.3 | 80 / 46 / 59 / 55 |
| 1.00 | 28.7% | 7.3 | 52 / 24 / 78 / 86 |

- With the bonus off, the plan table itself is lopsided: skirmish or envelopment is best for 68% of rosters,
  defensive for 10% (the random report agrees: skirmish 52.4, defensive 48.7). In a same-roster mirror the
  defensive row averages 44% and the skirmish row 58%.

Recommendation: `styleMatchBonus` 1.08 → 1.04 (doctrine best ~75%, off-doctrine cost ~1.5 pts, so terrain and
the foe roster start to matter), and in `fronts.plans`: defensive `contact` 0.9 → 0.95, skirmish `skirmish`
1.3 → 1.2. Re-measure with the sweep script; target "doctrine best" in the 60–75% band.

### 4. No difficulty curve, and "any loss ends the run" makes completion ≈ p³ (impact: 7–25% completion, flat)

Evidence (campaign sim replicating `spec.ts`, N=1,200 campaigns per row):

| Player | b1 | b2 | b3 | completion | p1·p2·p3 |
|---|---|---|---|---|---|
| greedy, uniform general, default deploy | 33.9 | 33.8 | 31.3 | **6.7 ±1.4** | 3.6 |
| greedy, uniform general, reader 3 | 49.8 | 48.2 | 47.3 | 14.8 ±2.0 | 11.3 |
| greedy, uniform general, reader 6 | 50.2 | 50.8 | 49.7 | 15.4 ±2.0 | 12.7 |
| greedy, best general of the pool, reader 6 | 58.8 | 60.5 | 61.6 | 25.3 ±2.5 | 21.9 |
| greedy, worst general of the pool, reader 6 | 40.6 | 39.7 | 38.2 | 7.5 ±1.5 | 6.1 |

Battles 1–3 are the same difficulty (foes are independent greedy drafts from `rng.int`, terrains merely
distinct). Completion runs a little above p³ because a strong general/army is correlated across the three
battles. The foe general is uniform over all 81: a player at parity wins 15–19% against Hannibal and 78–87%
against Artaxerxes II / Darius III / Flaminius, so the daily's difficulty is set by three dice rolls the player
never sees.

Recommendation: draw foe generals by tier per battle index in `campaignFromSeed` (`spec.ts:27-33`): battle 1 from
the bottom third by batch win rate, battle 2 from the middle, battle 3 from the top. At parity this gives roughly
65 / 50 / 35 per battle and ~11% completion but a felt curve; combined with finding 1's flattening the top-tier
foe is less of a wall. If the completion target is closer to 25–35% for a sound player, add a single retreat
(one loss allowed, paid in casualties/score): completion becomes 3p²−2p³ = 50% at p = 0.5 and 35% at p = 0.4.

### 5. The draft has one dominant heuristic and the reroll/culture levers barely move it (impact: shallow, not broken)

Evidence (2,000 paired battles per variant vs the stock greedy bot, both readers):

| Player draft variant | Win % | mean cost | elites |
|---|---|---|---|
| greedy, 2 rerolls, culture chase (stock) | 51.0 ±2.2 | 70.2 | 2.06 |
| greedy, 0 rerolls | 48.5 | 68.1 | 1.94 |
| greedy, 1 reroll | 49.3 | 69.6 | 2.02 |
| greedy, 4 rerolls | 50.5 | 70.7 | 2.09 |
| greedy, 8 rerolls | 50.6 | 70.8 | 2.10 |
| greedy, no culture chase (cost only) | 50.0 | 70.2 | 2.06 |
| greedy, +3 bias toward elite cards | 50.9 | 70.2 | 2.06 |
| random legal picks | 13.7 ±1.5 | 52.3 | 0.83 |

- "Take the most expensive on-class card" is at parity with everything smarter the bot can do; culture chase and
  elite bias are within noise. Each of the first two rerolls is worth about 1 point; the third and fourth are
  worth nothing because the reroll rule ("best card < 7") rarely fires more than twice.
- The elite cap binds in 80.5% of greedy drafts (3.87 elite cards offered per final board, 0.66 S cards; only 1.8%
  of boards offer none). The cap, not the board, decides elite count; 24 of 81 generals (logistics ≥ 80) get a
  third slot, worth +9 points in the greedy report (2 elites 49.2% → 3 elites 58.6%).
- Cost is the sufficient statistic: corr(win, cost difference) = 0.19; a +7..12 cost edge wins 67.6%, −7..12
  loses 66.4%. Greedy cost distribution: mean 70.2, SD 3.7, p10 66, p90 75.

Recommendation: the draft is fine as a first-pass roguelite draft, but its decisions are cost-reading. Cheap
improvements: make the reroll count 1 (each is ~1 point, and the second is where the greedy rule stops firing)
and spend the saved UI on the deployment information in finding 2; or, if the draft should carry decisions,
see the point-budget section (a budget *below* the natural mean, not near it).

## Unit outliers

Method: (i) batch deltas from both `out/final-fronts` reports (delta = win rate minus the mean of same-grade units
in the same slot kind); (ii) a static power proxy per unit (skirmish + contact + press contributions from the
fronts formulas, matchups and terrain ignored, best of center/wing placement) regressed on cost. The proxy
correlates only r = 0.30 with cost (residual SD ≈ 9 cost points), which is itself a finding: cost is a function
of the simulation (matchups, cover, frontage), not of the stat words the card shows, so a player cannot read
value off the card. All units are within the 8-point acceptance band on the random drafter; the greedy drafter
(smaller n for cheap units) shows the moves below.

| Unit | Grade/cost | Batch delta random (n) | Batch delta greedy (n) | Static proxy | Issue | Recommendation |
|---|---|---|---|---|---|---|
| per_bactrians | C 6 | −2.2 (3057) | **−9.7** (281) | wing 2.05 (par) | worst greedy delta in the roster; medium cav with 20 ranged that fires at cover | 6 → 5 |
| per_immortals | A 11 | −3.1 (1948) | −2.9 (6635) | **lowest power/cost of all 135 (0.149)** | A-grade price for B-grade melee (65/60/70/40 vs car_libyans 70/65/75/45 at 8); the 35 ranged fires at ×0.5 in the center | 11 → 9, or melee 65 → 72 and discipline 70 → 80 to earn the A |
| ind_mace | B 7 | −1.1 (1834) | −5.8 (358) | par | armor 45 / discipline 55 at a B price | 7 → 6 |
| stp_sindi | C 5 | −3.4 (2613) | −5.3 (397) | par | strictly worse than stp_getae (same stats, −5 discipline) at the same cost | 5 → 4 |
| gal_gaesatae | B 8 | −2.4 (1485) | −2.6 (4403) | par | armor 20 makes its 90 shock fragile at contact (steadiness term) | 8 → 7 |
| car_elephants | S 13 | −6.8 (127) | −1.7 (356) | par | small n; Carthaginian elephants have discipline 40 (India 45–50) | watch; not a move |
| mac_elephants / ind_elephants | S 15 / 13 | +0.1 / +0.8 | −4.5 / −4.4 (626/451) | par | S units in greedy armies concentrate in elite-heavy rosters, so the S baseline is lower; elephants underperform other S there | none until the greedy loop is re-run |
| grk_achaean_thureo | C 6 | +3.9 (2294) | **+7.3** (285) | par | light infantry with 35 ranged shoots from the center and holds; the only line unit that scores in all three stages | 6 → 7 |
| chn_skirmishers | C 5 | +0.8 (2855) | +5.9 (445) | par | cheap javelins with 80 mobility win wing missile exchanges | 5 → 6 |
| chn_chu_archers | C 5 | +1.7 (2791) | +5.4 (457) | par | same pattern as above | 5 → 6 |
| stp_sogdians | C 6 | −1.6 (2159) | +5.7 (190) | par | n too small; sign flips between drafters | none |
| stp/chn/per horse archers | B 8 / C 6 | −2.6..+0.5 | −1.0..+3.8 | **highest proxy residuals (z 2.5–2.8)** | the static formula overrates them (they score in skirmish and the wing); matchups (×0.85–0.9 vs heavy cav, elephants ×1.2 vs them) and cover pull them back to par in play | none; note for card text that horse archers read stronger than they play |

Grade curve (proxy power per cost point): S 0.142, A 0.175, B 0.230, C 0.319, D 0.471, F 0.693 — power per point
falls 5× from F to S, i.e. the roster is priced convexly and elites are paid for by the elite cap and the
`lanchester` 0.3 body count, not by stats. That is consistent with the batch (S 61%, F 40% on the random
drafter) and is fine for a draft where the cap, not a budget, limits elites.

## Cultures and generals

Home culture win rate (general's culture), from the reports and the campaign sim:

| Culture | random | greedy | stats-predicted general wr | residual (greedy) | trait L1 / L2 lift (random) | campaign completion (parity player) |
|---|---|---|---|---|---|---|
| chn | 55.5 | 57.3 | 59.4 | −2.2 | +3.6 / +7.8 | 16% |
| mac | 55.2 | 56.5 | 54.9 | +1.6 | +3.8 / +5.8 | 24% |
| grk | 52.1 | 51.5 | 50.6 | +1.1 | +6.7 / +10.4 | 18% |
| rom | 49.6 | 52.0 | 48.4 | +3.6 | +6.0 / +9.7 | 16% |
| ind | 50.1 | 46.6 | 52.1 | −5.1 | +2.6 / +9.4 | 11% |
| car | 49.5 | 47.8 | 48.3 | −0.7 | +4.4 / +6.6 | 9% |
| stp | 49.2 | 50.2 | 49.3 | +0.9 | +4.3 / +9.9 | 20% (n=50) |
| gal | 42.2 | 37.6 | 38.7 | −1.2 | +4.4 / +7.0 | 8% |
| per | 35.1 | 34.1 | 36.7 | −2.5 | −1.0 / +6.2 | 6% |

- Confirmed: Persia and Gaul are the weakest home cultures, and the cause is their generals' stats, not their
  rosters or traits (residuals −2.5 and −1.2). Persia's seven generals average command 63 / tactics 61; China's
  thirteen average 81 / 82. Fixing Persia by buffing its trait would be the wrong lever: its L2 lift (+6.2) is
  already in the pack.
- Confirmed: Greek L2 (+10.4 both drafters) is the strongest trait, but it is reached in ~7.5% of drafts and
  Greece's home-culture number (51.5–52.1) is unremarkable. Not dominant. India's greedy residual (−5.1) is the
  largest negative: its four generals are all defensive/attrition (doctrine = defensive, the weak plan; finding 3).
- Rome's +3.6 residual is `never_shaken_by_charge` plus moraleThreshold 1.10: the L2 lift is +9.7..+10.8. Fine.
- No culture is dead; the campaign completion column is the general lottery again (Persia 6%, Gaul 8% vs Macedon
  24%).

Generals: top 8 in the greedy report 65.7–79.0% (Hannibal, Alexander, Epaminondas, Bai Qi, Li Mu, Scipio,
Hamilcar, Han Xin); bottom 8 24.5–33.5% (Artaxerxes II, Bessus, Darius III, Flaminius, Regulus, Ariobarzanes,
Hasdrubal Gisco, Bindusara). Best-of-3 pool: E[best] 60.3%, E[median] 50.0%, E[worst] 39.6%. Recommendation as
in finding 1; additionally the general card should show command as the headline stat, since it is worth 1.6×
tactics and 4× logistics.

## Formula boundaries

Probes (400 seeds each unless stated; `scratchpad/balance/boundaries.ts`):

| Probe | Result |
|---|---|
| NaN / negative score, damage, morale, casualties across all probes | none |
| weakest 8 (F/D) vs strongest 8 (S/A), same general | 0.0% / 100% routs / A's general dies 94% |
| strongest with Bessus vs weakest with Hannibal | 99.0% (roster beats general at the extremes) |
| mirror strongest vs strongest | 53.0% (A-side bias from `sA >= sB` ties and seed order; within noise) |
| zero shooters vs zero shooters | 49.8%, routs 6% (no skirmish damage: battles go to the round limit) |
| all shooters (8) vs all line | 100%; all cavalry vs all line: 100% on plains, hills and forest |
| all center vs default (same roster) | 0.8%; all center vs all center 46.8% |
| empty center vs default | 1.0%, general dies 99% |
| 8 left vs 8 right (both centers empty) | 47.5%, routs 10% |
| front thresholds observed | 0.55 (levy wing, low charisma, aggressive, forest) to 1.16 (Greek L2 wall, charisma 100, defensive) |
| max damage per contest (edgeCap 0.6) | skirmish 0.48, contact 0.60, press 0.30/round, roll-up 0.48; skirmish+contact 1.08 |

Findings:
- No unbreakable or always-breaking state. Skirmish + contact (max 1.08) can break any front below threshold
  1.08, i.e. everything except a Greek-L2/high-charisma/defensive wall; four press rounds (max 2.28) break
  anything. Early breaks are 2–3.5% in the batch (spec target 10–25%); the `edgeCap` is what keeps them low.
- Empty fronts are correctly punitive: an empty wing is 0.25 army morale (`wingBreakShock` + `emptyFrontWeight`),
  an empty center 0.40, two empty wings 0.50 of the 0.80 `routLevel` (`resolveFronts.ts:185-195`, `289-293`).
- All cavalry beats all line 100% on every terrain because `defaultDeployment` puts all 8 line units in the
  center (both wings empty, −0.5 morale at contact) and `deploymentCandidates` (`deploy.ts:78`) never moves a
  line unit with mobility < 50 to a wing, so an all-hoplite/pike roster cannot fill its wings even as a reader.
  The greedy drafter always has two cavalry rows so this does not occur in play; it would matter if the board
  ever offered a no-cavalry draft.
- Hidden double terrain penalty: `prepare.ts:148-151` multiplies *all* stats by the terrain class multiplier,
  including discipline, so a cavalry wing's cohesion threshold falls 6–8% on hills/forest (0.939 → 0.885 / 0.864
  for an all-cavalry wing) on top of the ×0.5 wing stakes. Either exclude discipline or document it.
- Greek L1/L2 pushes discipline past 100 (Spartans 103.5); harmless, thresholds are linear.
- `rollInto` (`resolveFronts.ts:202-220`) with a held charge (edge 0) still marks the target flanked (×0.85 press
  per flank, stacking); intended per the design doc.
- Noise: `1 + 0.15·z` (`rng.ts:32-36`); a negative score needs z < −6.7 (p ≈ 1e-11). Safe.
- Plan multipliers are the intended magnitude (±5–15%) but are dominated by `styleMatchBonus` (finding 3) and
  `cmd` (finding 1), both of which sit outside `fronts.plans` and outside the cost loop.

## Draft economics

See finding 5 for the variant table. Additional numbers:
- Board: 8 rows × 4 cards, 3 on-class; home-culture rows 2.53 per board (tilt 0.30); trait L1 reached in 43.3% of
  greedy drafts, L2 in 7.5%. Rarity weights give 3.5 elite cards per raw board and 3.9 after rerolls.
- The elite cap is the binding constraint (80.5%), so the practical draft is "pick the two (or three) best elite
  cards, then the most expensive on-class card everywhere else". Culture chase is at best +1 point over cost-only.
- Rerolls: value ~1 point each for the first two, ~0 after; the greedy rule rerolls only rows whose best card is
  worth < 7, which is 1–2 rows per board. A player who rerolls a *good* row hoping for an elite is throwing away
  a point, so rerolls are a small trap rather than a resource.
- Random legal picks lose 86% to greedy: drafting matters enormously at the bottom, and not at all between
  reasonable heuristics. That is the signature of a single-heuristic draft.

## Deployment

See finding 2 for the table. Answers to the specific question "is there a deployment that is always right":
- No fixed shape. Center 2–6 all land at 32–37% against the reader AI; the batch's center-size curve (4 best at
  52–53%, 1 at 34%, 6 at 44%) is about the same width.
- The always-right *procedure* is the reader (simulate against the assumed enemy default), and it is only
  available to the AI. The roster-reading edge is +17 points (32 → 49) and it is spread across many moves
  (BALANCE.md: cavalry between wings 35%, ranged to a wing 19%, shock out 15%), so it is not a single trick a
  player can learn.
- Refusing a wing is never right (11.9%) and all-center is a loss (0.9%): the empty-front costs are doing their
  job.
- The AI's reader assumes the player deploys by the default; a player who *knows* that could in principle
  counter-read, but has no tool to do so. That is the information asymmetry finding 2 asks to close.

## Campaign curve and completion rate

See finding 4 for the table. Summary:
- Per-battle win rate for a parity player is 50% on every battle index and every terrain (hills 47.6, plains 52.9;
  the rest 50). There is no curve.
- Expected completion: ≈ 6.7% (default deployment), 15% (reader-equivalent deployment), 25% (plus best general in
  the pool). Because losses are terminal and correlated with the general, the distribution across days is wide:
  a day whose three foes are drawn from the top third will complete well under 10% even for the strong player.
- General death (18–20% of armies in the batch) is irrelevant to completion because any loss already ends the
  run; it only changes the recap line.
- "Heavier army wins" inside the campaign is only 52% because greedy armies cluster (SD 3.7 cost); the general
  and the deployment contest dominate.

## Point-budget recommendation

Against adding an army point budget now, on the numbers:
- Cost is not where the luck is. Greedy armies span 66–75 (p10–p90) around a mean of 70.2; corr(win, cost diff)
  is 0.19, and the typical cost mismatch (±4) is worth ±5 win-rate points. The general lottery is worth ±12 and
  the deployment contest ±17. A budget near the mean (e.g. 72) binds on ~30% of drafts, trims 2–3 points, and
  moves per-battle win rate by ~2 points; it would not be noticed.
- The elite cap already is a budget: it binds 80% of drafts and it is what makes S/A units scarce. Stacking a
  point cap on top gives the draft two constraints that both mostly say "you cannot have three elites".

If the goal is instead to *create* decisions in the draft (finding 5), a budget can do that, but only if it is set
low enough to bind on nearly every draft and force filler-vs-elite tradeoffs: about 62 (below p10 of the greedy
distribution, 66), with the elite cap removed so there is one currency. Expected effects at 62: greedy would lose
~8 cost points against today's armies (~10 win-rate points in isolation, but symmetric once every army is
capped), the cost loop would need re-running (units near the elite boundary re-price), and "most expensive
card" stops being optimal because the last two picks are forced cheap. That is a design change, not a tuning
change; do it after findings 1–3, when the draft's contribution to outcomes is visible again.

## Method

Existing tooling: `npx vitest run` (25 passed, 3 expected-fail), the two `out/final-fronts` reports (20,000
battles per drafter, seed 11, reader seeds 3, trait toggle). No project source or data was modified.

Scratch scripts (all under
`/private/tmp/claude-501/-Users-maxpeng-src-warlordDraft/e9c62f20-d8c9-4baa-b0ad-6a869f230e31/scratchpad/balance/`,
run with `npx tsx` from `packages/engine`, importing the engine source directly):
- `lib.ts`: a parametrised copy of the engine's greedy bot (rerolls, culture chase, elite bias, plan, general
  chooser) so variants are paired against the stock bot.
- `power.ts`: static power proxy per unit vs cost; batch outliers from both reports; OLS of general win rate on
  stats; culture residuals.
- `boundaries.ts`: extreme rosters, deployments, plans and terrains through `resolveBattleFronts`, checking for
  NaN/negatives, threshold range and one-sided outcomes (400 seeds per probe).
- `plans.ts` and `style_bonus.ts`: plan-vs-plan matrices (mirror and cross) over 300 greedy rosters; best plan per
  roster against a fixed field of 24 opponents; in-memory sweep of `styleMatchBonus`; general lottery from the
  batch win rates.
- `deploy.ts`: 1,200 paired greedy matchups, B deployed by `deployAgainst(…, 6)` as in `api.ts`, A re-deployed
  per variant.
- `draft_econ.ts`: 11 draft variants × 2,000 paired battles vs the stock greedy bot (both readers, 2 seeds);
  win rate by cost-difference bin; elite-cap and board-offer statistics.
- `campaign.ts`: 1,200 campaigns × 5 player variants replicating `campaignFromSeed` (seed mixing, terrain
  splice, greedy foe draft state, battle seeds) and `CampaignProvider.resolveAll` (foe deploys as a reader with
  6 seeds against the player's roster).

Caveats: the "player" is a bot; a human who reads cards well will sit between the greedy bot and the greedy-plus-
best-general row. Greedy-report unit deltas for cheap units have n of 200–500 and are noisy at ±4 points. Culture
residuals use a linear model in the four stats; the logistics ≥ 80 elite-slot threshold is not linear and is
under-credited by it.
