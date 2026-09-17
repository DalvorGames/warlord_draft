# Battle Resolution (Three Fronts) — Design Document

---
**Status**: Reverse-Documented
**Source**: `packages/engine/src/resolveFronts.ts`, `prepare.ts`, `preview.ts`, `data/rules.json` (`fronts` block, data version 2)
**Date**: 2026-09-16
**Verified By**: designer (intent questions answered 2026-09-16; cross-review decisions recorded 2026-09-16)
**Implementation Status**: Fully implemented; decided changes and deferred items are listed in §9
---

> **Reverse-Documentation Notice**
>
> This design document was created **after** the implementation already existed. It captures current
> behaviour from code analysis plus design intent clarified with the designer on 2026-09-16. The plain-language
> companion is `docs/MECHANICS.md`; the original design note is `docs/battle-design-three-fronts.md`.

## Summary

Battle resolution turns two deployed armies, a ground and a seed into a winner, a loser and a beat-by-beat
report. Three front pairs fight in parallel through a skirmish, a contact and up to four press rounds; each
contest converts a score gap into morale damage, fronts break at a cohesion threshold, and an army routs at
0.8 morale. It exists so that where the player puts eight units matters more than what the units are.

> **Quick reference** — Layer: `Core` · Priority: `MVP` · Key deps: `Army Preparation (stats, traits, plan, command)`, `Deployment`, `Units & Generals` · Consumed by: `Campaign`, `Deployment` (AI simulation), `Battle Report`

---

## 1. Overview

**Purpose.** Decide a battle from inputs only, deterministically, so any client or server replays the same
result from the same run strings and seed. Produce enough structure (contests, fronts, rounds, events) for
the client to narrate it one beat at a time.

**Scope.** Everything from two prepared armies to a `BattleResult`: scoring, morale, breaks, roll-ups,
routs, the reckoning, casualties, events and the recap text. Excluded: how armies are drafted, how stats are
multiplied before the battle (Army Preparation), how the AI chooses a deployment (Deployment), and what the
campaign does with the result.

**Current implementation.** `resolveBattleFronts(data, armyA, armyB, terrain, seed, opts)` in
`resolveFronts.ts`, selected when `rules.battleModel === "fronts"`. The v1 phase resolver remains reachable
for comparison and is out of scope here. Pure function; the only randomness is a mulberry32 stream from
`seed`.

**Design intent (clarified 2026-09-16).**
- Deployment is the general's decision and must be a bet: the enemy's shape is hidden but **guessable**, so
  a player who reads the roster can out-think the AI. The current roster-reading AI is a defect, not the
  design; the campaign AI is to become player-blind (see §9, item 3, and Deployment §9.1).
- The **plan** (doctrine) is meant to be a real decision per roster and ground, not a lookup. The flat
  ×1.08 style-match bonus defeats that and is flagged for tuning (§9, item 1).
- Generals should matter without dominating. COMMAND multiplying every score is stronger than intended and
  is flagged to soften (§9, item 2).
- Every unit fights in every stage it is present for. Curves reward specialists; no class is excluded.
- Battles are text-first. The result must carry named contributors per contest so the report can say who
  won the missile exchange, not just that it was won.

---

## 2. Player Fantasy

You are the general on the hill. You have read the enemy's roster, guessed where his horse will be, and
weighted your own line to meet it. The battle then unfolds in beats you cannot interrupt: the missile
exchange, the crash of contact, the shoving match on the center, a wing that breaks and wheels into the
enemy's flank. When you win, it is because your deployment was right and your fronts held longer than his.
When you lose, the report should let you see which front gave way and why.

The emotional targets, in order: the tension of the hidden bet; the satisfaction of a wing rolling up a
center you predicted would be thin; the legibility of a loss.

---

## 3. Detailed Rules

### 3.1 Inputs and setup

1. Each army is prepared by Army Preparation into eight `PreparedUnit`s with effective stats, a front
   (`L`, `C`, `R`), and per-army multipliers (`phaseMult`, `steadinessMult`, `rollupMult`, `cmd`,
   `moraleParts`, trait rule flags).
2. Units are grouped by front. Each front records its units, its deployed count, damage (starts 0), a
   cohesion threshold, and flags: broken, shaken, flanked (count), rolledUp.
3. Front pairs are fixed: A's Left faces B's Right, Center faces Center, A's Right faces B's Left.
4. One battle event may be rolled before any fighting (§3.8).

### 3.2 The contest, the one rule everything uses

Every fight compares two scores and applies damage:

1. `edge = |scoreA − scoreB| / max(scoreA, scoreB)`, capped at `edgeCap` (0.6). If both scores are 0, edge
   is 0 and A is recorded as the winner.
2. `base = weight × groundStakes × edge × 2`.
3. The loser's front takes `base`; the winner's front takes `base × 0.25`. Event modifiers may scale either.
4. Every score is multiplied by the side's `cmd` factor and by a luck draw `1 + N(0, noiseSD)` with
   `noiseSD` 0.15, drawn fresh per score.

### 3.3 Frontage

A front with `n` units facing `oppN` enemy units counts at most `k = min(n, ceil(max(1, oppN) × frontage))`
units at full weight; the remainder count at `reserveMult`. With frontage 1.5 and reserveMult 0.25, eight
units against three fight as five full plus three at a quarter. The multiplier is
`(k + (n − k) × reserveMult) / n` applied to the summed contribution. Applies to contact, press and both
sides of a roll-up. Does not apply to the skirmish.

### 3.4 Stage order

1. **Skirmish** (round 0). Each front shoots the front opposite; a front facing an empty front shoots the
   enemy center instead; center units shoot at `lineSkirmishMult` (0.5). Pairs where both fronts are empty,
   or where both scores are 0, are skipped. Then breaks are checked.
2. **Contact** (round 0), only if neither side has routed. All three pairs. An empty front facing a manned
   front breaks immediately with no contest. Losing by more than `shakenEdge` (0.25) marks the losing front
   **shaken** unless its army has `never_shaken_by_charge`. Elephant rampage is checked on the loser (§3.7).
   Then breaks are checked.
3. **Press** rounds 1 to `rounds` (4), while neither side has routed. Each round: roll-ups first (§3.6),
   then a press contest on every pair where both fronts are manned and unbroken, then breaks.
4. **Reckoning** (§3.9).

### 3.5 Breaks, morale and rout

After each stage, for every deployed, unbroken front: if `damage ≥ threshold` the front **breaks** (its units
stay listed but no further contests involve it) and the stage is recorded as `brokenAt`.

Then each army's morale is recomputed:

```
morale = Σ_fronts [ deployed/total × min(1, damage/threshold) ]   (broken fronts count as 1)
       + wingBreakShock (0.10) per broken wing
       + centerBreakShock (0.25) if the center is broken
       + emptyFrontWeight (0.15) per empty front that has "broken" (given way)
```

An army **routs** when `morale ≥ routLevel` (0.8) or when every front it deployed is broken. Routing ends
the battle after the current stage.

### 3.6 Roll-ups

At the start of each press round, each side checks each of its fronts. A front is **free** if it is manned,
unbroken, not already rolled up, and the enemy front opposite it is broken.

- A free **wing** wheels into the enemy **center**. If the enemy center is broken or empty, the wing is
  marked rolled up with a note and does nothing.
- A free **center** turns onto the enemy wing that is still fighting, choosing the side where its own wing
  has the highest damage fraction. If no enemy wing is still fighting, nothing happens.
- The roll-up is one-directional. Charger score = impact × frontage × `rollupMult` (1.5) × army rollup trait
  × plan.contact × cmd × luck. Target score = `steadinessCoef` × steadiness × steadinessMult × frontage ×
  plan.contact × cmd × luck. `edge = (charger − target) / charger` if positive, else 0, capped at 0.6.
- Only the target takes damage: `weights.rollup (0.4) × stakes("rollup") × edge × 2`. The target's
  `flanked` count increases by one regardless of the edge.
- The charging units are moved onto the target's front (for a wing, they join the center fight; for a
  center, they join that wing's fight) and the source front is emptied and marked rolled up.
- The Cavalry-pursues-off-field event consumes the first free wing of the battle instead.

### 3.7 Shaken, flanked, rampage

- **Shaken**: every unit on that front contributes at `shakenMult` (0.9) in contact impact and press for the
  rest of the battle. Pikes on an army with `pikes_ignore_shaken` are exempt.
- **Flanked**: the center's press score is multiplied by `flankedMult` (0.85) raised to the number of times
  it has been rolled into. Stacks.
- **Rampage**: when a front loses contact by more than `shakenEdge` and fields elephant-tagged units, each
  elephant unit independently rolls `rampageChance` (0.3, halved with `rampage_chance_halved`). A rampaging
  elephant adds `weights.contact × (its share of the front's impact)` damage to its own front.

### 3.8 Events

One roll per battle: with probability `events.chancePerBattle` (0.08) one event is drawn by weight from the
list, excluding `rampage` (handled in §3.7), excluding campaign-only events unless `opts.campaign`, and
excluding elephant-requiring events when neither side has elephants.

| Event | When | Effect |
|---|---|---|
| Downpour | skirmish | both sides' skirmish damage ×0.3 |
| The general falls | contact | if the center loses contact, that center's threshold is recomputed without charisma and ×0.85 |
| Cavalry pursues off-field | press | the first free wing leaves instead of rolling up |
| Flank collapses | contact | the losing wing takes ×2 damage (not applied to a center) |
| Reinforcements | pre-battle, campaign only | the side with higher SUPPLY gets center press ×1.2 |

The result records the event and whether it actually applied.

**Requirement (Pillar 3, not met today):** every event that applied must be told to the player in the battle
report, in one sentence, at the beat where it took effect. Today only elephant rampage is narrated; Downpour,
The general falls, Flank collapses and Cavalry pursues off-field change outcomes silently. Note the naming
clash: the *event* "The general falls" (center cohesion cut at contact) is not the *result flag*
`generalFell` (center broke and the battle was lost). The event should be renamed, e.g. "The general is struck
down at the clash".

### 3.9 Reckoning

1. If exactly one side routed, the other wins; `brokeInPhase` is the stage the loser routed in.
2. If both routed in the same stage, the side with higher morale loses.
3. If neither routed after the last round, the side with higher morale loses and `brokeInPhase` is `"break"`.
4. `margin = min(1, |moraleA − moraleB|)`.
5. **Casualties**: loser `min(loserMax 0.8, 0.12 + 0.35 × margin + 0.15 × pursuit)` where pursuit is the
   winner's average wing SPEED / 100; winner `max(0.02, 0.04 + 0.12 × (1 − margin))`. Reported only.
6. **General fell** for a side iff it lost and its center is broken.
7. A recap of 6 to 10 lines is generated from the contests (deployments, traits, missile exchange, contact,
   round notes, the ending, the general's fate, casualties).

### 3.10 States and transitions

| Entity | State | Entry | Exit | Behaviour |
|---|---|---|---|---|
| Front | manned | deployed ≥ 1 | broken or rolled up | fights every stage |
| Front | empty | deployed = 0 | — | breaks at contact if faced; skipped otherwise |
| Front | shaken | lost contact, edge > 0.25 | never | units ×0.9 |
| Front | broken | damage ≥ threshold | never | no contests; counts 1 in morale |
| Front | rolled up | wheeled into an enemy front, or free with no target | never | source emptied |
| Army | routed | morale ≥ 0.8 or all fronts broken | never | battle ends after stage |

---

## 4. Formulas

Variable ranges: unit stats 0–100 after preparation (terrain and traits can push above 100); general stats
40–100; `matchup` is the average of the unit's subtype row against the enemy units on that front, 0.6–1.4,
default 1.

### 4.1 Cohesion threshold (per front)

```
threshold = (0.55 + 0.35 × avgSTEADY/100 + 0.20 × charisma/100) × moraleMult
```

`moraleMult` is the plan's cohesion multiplier times trait multipliers (Rome ×1.1, Greece ×1.05, Gauls II
×0.95). Empty front: 0. Typical range 0.85–1.05. Example: STEADY 70, charisma 55, Defensive plan (×1.05):
(0.55 + 0.245 + 0.11) × 1.05 = 0.95.

### 4.2 Skirmish

```
shot(u)   = SHOOT × (0.7 + 0.3 × SPEED/100) × matchup × (front is center ? 0.5 : 1)
score     = Σ shot × (1 − avgARMOR_target/100 × 0.5) × phaseMult.skirmish × cmd × luck
damage    = 0.4 × stakes.skirmish × edge × 2      (loser; winner 25%)
```

Maximum loser damage before stakes: 0.48. Example: three units with SHOOT 70/60/0, SPEED 80/70/40, matchup
1, against ARMOR 50: (70 × 0.94 + 60 × 0.91) × 0.75 = 90.3 before army multipliers.

### 4.3 Contact

```
impact     = Σ CHARGE × (CHARGE/100)^chargeCurve × matchup × shaken
steadiness = Σ (STEADY × 0.6 + ARMOR × 0.4) × matchup
score      = (impact + steadinessCoef × steadiness × steadinessMult) × frontage × phaseMult.charge × cmd × luck
damage     = 0.5 × stakes.contact × edge × 2
```

`chargeCurve` is 1, so impact is CHARGE²/100: CHARGE 80 gives 64, CHARGE 40 gives 16. `steadinessCoef` is
0.6. Example, one unit CHARGE 65, STEADY 85, ARMOR 65: impact 42.3, steadiness 77, score 42.3 + 46.2 = 88.5
before army multipliers.

### 4.4 Press, center

```
q(u)  = (FIGHT × 0.5 + ARMOR × 0.3 + STEADY × 0.2) × matchup × shaken
score = Σ q × frontage × N^lanchester × phaseMult.grind × flankedMult^flanked × cmd × luck
damage = 0.25 × stakes.center × edge × 2      per round
```

`lanchester` is 0.3: N = 4 gives ×1.52. Example, four units averaging q = 62: 248 × 1.52 = 377.

### 4.5 Press, wing

```
p(u)  = (SPEED × 0.4 + FIGHT × 0.4 + CHARGE × 0.2) × (SPEED/100)^wingCurve × matchup × shaken
score = Σ p × frontage × N^lanchester × (0.7 + 0.6 × TACTICS/100 × tacticsMult) × phaseMult.flank × cmd × luck
damage = 0.25 × stakes.wing × edge × 2      per round
```

`wingCurve` is 0.5. A SPEED 36 unit fights at 60% of a SPEED 100 unit before anything else. TACTICS 40 gives
×0.94, 70 ×1.12, 100 ×1.30.

### 4.6 Roll-up

See §3.6. Charger uses the contact impact formula ×1.5; target uses the contact steadiness term only.

### 4.7 Army-level multipliers (inputs from Army Preparation)

```
cmd        = 0.85 + 0.30 × COMMAND/100          (×1.02 to ×1.14 across the roster)   ⚠ to soften
phaseMult  = plan × traits × combinedArms × (styleMatch ? 1.08 : 1)                   ⚠ 1.08 to revisit
```

### 4.8 Ground stakes

| Ground | skirmish | contact | wing | center | rollup |
|---|---|---|---|---|---|
| plains | 1 | 1 | 1.1 | 1 | 1.1 |
| hills | 1.1 | 1 | 0.5 | 1 | 0.5 |
| forest | 1.2 | 0.8 | 0.5 | 1 | 0.5 |
| river | 1 | 0.7 | 1 | 1 | 1 |

Rollup stakes fall back to the wing value. Ground also scales unit stats by type in Army Preparation.

---

## 5. Edge Cases

| Scenario | Behaviour | Source |
|---|---|---|
| Both fronts in a pair empty | No contest at any stage; no damage | `resolveFronts.ts` contact loop |
| One front empty, other manned | Empty front breaks at contact without a contest; army takes 0.15 + break shock (0.25 wing, 0.40 center) | `checkBreaks`, `armyMorale` |
| All eight in the center | Both wings empty: 0.50 morale on the spot at contact; enemy wings then roll into the center's flanks; usually a loss (tested) | `fronts.test.ts` |
| Both scores 0 in a contest | Edge 0, A recorded winner, no damage; skirmish pairs with both 0 are skipped entirely | `contest`, skirmish loop |
| No shooters on a side | Skirmish score 0, takes full capped edge (0.48 × stakes) per pair; does not rout on the spot (tested) | `fronts.test.ts` |
| Both armies rout in the same stage | Higher morale loses; `brokeInPhase` is that stage | reckoning |
| Neither routs by round 4 | Higher morale loses; `brokeInPhase` = "break"; narrated as "night falls" | reckoning |
| Free wing, enemy center already broken/empty | Wing marked rolled up, no charge, note recorded | roll-up loop |
| Free center, no enemy wing still fighting | Center marked rolled up with a note | roll-up loop |
| Roll-up fully absorbed (edge 0) | No damage; target still marked flanked (×0.85 stacking on its press) | `rollInto` |
| Rampage with impact 0 | Share is 0, no damage | rampage block |
| Threshold 0 (empty front) | Damage fraction treated as 0 in morale; never breaks | `armyMorale` |
| Same unit picked twice (duplicate ids) | Allowed; both fight; contributions listed twice | no guard |
| Deployment length ≠ 8 | Army Preparation falls back to the default deployment | `prepareArmy` |
| `opts.campaign` not passed | Reinforcements never eligible. **The web client does not pass it**, so it never fires in the app | `CampaignProvider.tsx:51` |
| General dies | Only narration and `generalFell`; in the campaign a loss already ends the run | reckoning |
| A front breaks before the press | Possible and **intended, but rare**. Maximum pre-press damage is 0.48 (skirmish) + 0.60 (contact) = 1.08 on plains, against cohesion of about 0.85–1.05; in forest the skirmish alone can reach 0.576 and break a very brittle front. A shock army shattering a wing at contact is wanted drama. The report must call it out | decided 2026-09-16 |
| Effective stat above 100 | Not clamped. Realistic worst case about CHARGE 102 (a CHARGE 90 cataphract under Carthage II on plains): impact 104 against 81 unboosted, a 29% gain from a 13% stat gain because impact is squared. Unmeasured | Army Preparation §5 |

---

## 6. Dependencies

**Depends on**
- **Army Preparation** (`prepare.ts`): effective unit stats after terrain and traits; `phaseMult`,
  `steadinessMult`, `rollupMult`, `tacticsMult`, `cmd`, `moraleParts`, rule flags, fronts per unit.
- **Deployment** (`deploy.ts`): `FRONTS`, `OPPOSITE`, and the default deployment used when an army has none.
- **Units & Generals** (`units.json`, `generals.json`, `rules.json`): stats, subtypes, tags, matchup
  table, the `fronts` and `events` rule blocks.
- **RNG** (`rng.ts`): mulberry32 with `gaussian`, `weightedIndex`, `next`.
- **Preview** (`preview.ts`): `frontThreshold`, shared so the Deploy screen shows the same cohesion the
  resolver uses.

**Depended on by**
- **Campaign** (`apps/web/src/lib/campaign/CampaignProvider.tsx`): calls `engine.resolve` once per battle
  with the daily seed; any loss ends the run.
- **Battle screen** (`apps/web/src/lib/battleView.ts`, `app/battle/[battle]/page.tsx`): renders `rounds`,
  `contests`, `fronts`, `topA/topB`, morale per round as Key/Every beats.
- **Result and Between screens**: `winner`, `casualties`, `generalFell`, `recap`.
- **AI Deployment** (`deployAgainst`): runs the resolver on its own seeds to choose a shape.
- **Batch tooling** (`src/batch`, `src/cli`): win rates, sweeps, deployment swaps.

Each of those documents must list Battle Resolution in return.

---

## 7. Tuning Knobs

All live in `rules.json` under `fronts` unless noted. Safe ranges are the reviewer's judgement from the
formulas, not measured; measure with `npm run batch` before shipping a change.

| Knob | Current | Affects | Safe range | Notes |
|---|---|---|---|---|
| `rounds` | 4 | battle length, rout rate | 3–6 | more rounds → more routs, fewer "night falls" |
| `edgeCap` | 0.6 | max damage per contest | 0.4–0.8 | lower = slower, more even battles |
| `weights.skirmish` | 0.4 | missile stakes | 0.25–0.5 | |
| `weights.contact` | 0.5 | contact stakes | 0.35–0.65 | drives early breaks (target 10–25%) |
| `weights.press` | 0.25 | per-round stakes | 0.15–0.35 | |
| `weights.rollup` | 0.4 | flank charge stakes | 0.25–0.6 | |
| `chargeCurve` | 1 | how much CHARGE is squared | 0.5–1.5 | 0 = linear. Measured 2026-09-16: stacking is not dominant and the curve has little aggregate effect (§9 item 5) |
| `wingCurve` | 0.5 | SPEED gate on wings | 0.25–1 | |
| `lineSkirmishMult` | 0.5 | center shooting | 0.3–0.7 | |
| `steadinessCoef` | 0.6 | steadiness vs impact at contact | 0.4–0.8 | |
| `lanchester` | 0.3 | numbers bonus in press | 0–0.5 | |
| `frontage` | 1.5 | units that can engage | 1.2–2 | |
| `reserveMult` | 0.25 | reserve weight | 0.1–0.5 | |
| `emptyFrontWeight` | 0.15 | cost of an empty front | 0.1–0.3 | |
| `wingBreakShock` | 0.10 | flat shock per broken wing | 0.05–0.2 | |
| `centerBreakShock` | 0.25 | flat shock for a broken center | 0.15–0.35 | |
| `routLevel` | 0.8 | rout line | 0.7–0.9 | |
| `rollupMult` | 1.5 | roll-up impact | 1.2–2 | |
| `flankedMult` | 0.85 | per-flank press penalty | 0.75–0.95 | stacks |
| `rampageChance` | 0.3 | per elephant unit | 0.1–0.5 | |
| `shakenMult` (root) | 0.9 | shaken units | 0.8–0.95 | |
| `shakenEdge` (root) | 0.25 | when shaken triggers | 0.15–0.35 | |
| `noiseSD` (root) | 0.15 | luck per score | 0.08–0.2 | |
| `terrain.*` stakes | see §4.8 | which fronts matter where | 0.5–1.3 | |
| `styleMatchBonus` (root) | 1.08 | doctrine lookup | **1.00–1.04** | ⚠ §9 item 1: to shrink or make fight-specific. Shared with Army Preparation, which owns it |
| `cmd` formula (`prepare.ts:155`) | 0.85 + 0.30·C | general dominance | **0.875 + 0.25·C** provisional; 0.90 + 0.20·C the alternative | ⚠ §9 item 2: measure before fixing. Shared with Army Preparation, which owns it |
| Cohesion constants | 0.55 / 0.35 / 0.20 | how long fronts stand | base 0.5–0.6; STEADY share 0.3–0.4; CHARISMA share 0.15–0.25 | formula in §4.1. Shared with Army Preparation |
| `events.chancePerBattle` (root) | 0.08 | event rate | 0.05–0.15 | |
| `casualties.*` (root) | see §3.9 | report only | any | no gameplay effect |

---

## 8. Acceptance Criteria

**Verified by existing tests** (`packages/engine/test/fronts.test.ts`, `preview.test.ts`):
- ✅ Same inputs and seed give an identical result; different seeds differ.
- ✅ Result has rounds, three fronts per side, and a recap.
- ✅ An empty center gives way at contact and the army loses badly.
- ✅ Eight in the center loses to a balanced deployment of the same roster.
- ✅ The general dies only when the center broke and the battle was lost.
- ✅ A zero-shooter army takes heavy skirmish damage but does not rout on the spot.
- ✅ Cavalry-heavy wings do worse on hills than plains.
- ✅ The Deploy preview's thresholds equal the resolver's on every ground.

**Batch targets** (from `docs/battle-design-three-fronts.md` and `docs/BALANCE.md`; pass/fail via `npm run batch`):
- ✅ Early breaks (a front broken in the skirmish or at contact, before any press round) 10–25% of battles. *The measured figure counts contact-stage breaks; confirm skirmish-stage breaks are included.*
- ✅ Routs before the round limit not above ~70%.
- ✅ Class value in the same slot within 5 points after cost tuning.
- ✅ Zero-shooter armies lose most of the time but not all.
- ✅ Cavalry-heavy armies ≥ 5 points better on plains than hills.
- ❌ **Deployment is a decision**: the default heuristic should not win > 60% against alternatives on the
  same roster. Currently the AI reader beats the default 56–68% (balance review). Fails.
- ❌ **Plan is a decision**: the doctrine plan should be the best plan for no more than about 60% of rosters
  (75% is Pillar 1's own line for a fake decision, so the target sits well under it). Currently 98.8%. Fails.
- ✅ **CHARGE stacking is not dominant**: deployments that mass the highest-CHARGE units on one front lose to
  the default by 11–24 points (measured 2026-09-16, `deploy_swap.ts`).

**Not yet covered by any test**
- ❌ Roll-up mechanics: a free wing damages the enemy center and marks it flanked; a fully absorbed roll-up
  still flanks; the charging units join the target front.
- ❌ Shaken applies ×0.9 and Rome II / Macedon II pikes are exempt.
- ❌ Rampage: only fires on a losing front with elephants, per-unit chance, damage to own front.
- ❌ Every event applies as described in §3.8 and `event.applied` is set correctly.
- ❌ Every applied event produces a sentence in the battle report (§3.8 requirement).
- ❌ Frontage: 8 vs 3 counts as 5 full + 3 at 0.25.
- ❌ Both-rout and no-rout tie-breaks in the reckoning.

**Definition of done**
- [ ] All batch targets pass, including the two that currently fail.
- [ ] The six untested rules above have unit tests.
- [ ] The Rules page and Numbers page match §3 and §4 (no dead rules described to the player).

---

## 9. Open Questions and Follow-Up Work

### Decided 2026-09-16
1. **Plan is meant to be a real decision.** The ×1.08 flat doctrine bonus is a defect. Follow-up: shrink to
   ~1.04 or make the match fight-specific (e.g. Hammer boosts contact only), then re-tune the plan table so
   each plan wins somewhere. Measure with `npm run batch`.
2. **COMMAND is stronger than intended.** Working assumption: soften **halfway**, to
   `0.875 + 0.25 × COMMAND/100`, with `0.90 + 0.20 × COMMAND/100` as the alternative. **Nothing is final until
   measured.** A wide spread between generals is less of a flaw once the ladder ranks weaker generals higher
   (Campaign §3.4). **Measured 2026-09-16** (constants now live in `rules.command`): softening barely shrinks
   the general lottery. General win rates span 23–83% today, 23–82% halfway, 26–79% fully softened, and still
   34–67% with COMMAND removed, because the four general stats are strongly correlated in the data
   (COMMAND–TACTICS 0.78). The lever is the handicap ladder or de-correlated general data, not this formula.
   See `docs/reviews/2026-09-16-measurements.md` §2.
3. **AI deployment should be guessable.** The roster-reading optimiser (`deployAgainst`, 6 seeds, ~20
   candidates) is a defect against the "guessable, not known" intent. Resolved in the Deployment doc (§9.1):
   the campaign AI deploys from its own units and the ground and never reads the player.

4. **Early breaks are intended and should stay rare** (10–25% of battles, skirmish-stage breaks included).
5. **CHARGE² measured, 2026-09-16: not a dominant stat-stack.** Six CHARGE-stacking deployments were added to
   `deploy_swap.ts`; every one loses to the plain default by 11–24 points (best 37.9% against 48.8%), and
   flattening `chargeCurve` from 1 to 0.5 moves no aggregate by more than a point or two. `chargeCurve` stays
   at 1. Results: `docs/reviews/2026-09-16-measurements.md` §1.
6. **All decided changes are measured together** in one batch run before any of them ships alone
   (cross-review 2026-09-16).

### Deferred (decide later)
4. **River `chargeAttacker` ×0.7** is read into `terrainChargeMult` and never used by this resolver.
5. **China II `phaseWeight: skirmish 0.6`** sets a v1 weight; this resolver reads `fronts.weights.skirmish`.
   The UI tells the player "the skirmish counts for more". Either honour it here or replace the trait entry.
6. **Slot penalties** are ignored by this resolver (by design) but the greedy AI drafter still discounts
   them, so the AI sometimes skips the best card.
7. **`opts.campaign`** is never passed by the web client, so Reinforcements is dead in the app. Decide whether
   the client should pass it or the event should go.
8. **General death has no consequence** beyond narration in the campaign. Keep as flavour, or give it one.

### Flagged follow-up work
- [ ] Add the six missing unit tests (§8).
- [ ] Narrate every applied event in `beats.ts`; rename the "general falls" event.
- [ ] Tune `styleMatchBonus` and the `cmd` formula; bump `dataVersion` if run strings must stay replayable.
- [ ] Reverse-document **Army Preparation**, **Deployment**, **Draft**, **Unit & General Data**, **Campaign**
  so §6 dependencies are bidirectional.
- [ ] Write `design/gdd/game-concept.md` and `systems-index.md`, then run `/review-all-gdds`.

---

## 10. Version History

| Date | Author | Changes |
|---|---|---|
| 2026-09-16 | Claude (reverse-doc) | Initial reverse-documentation from `packages/engine/src/resolveFronts.ts`; intent on plan, COMMAND and AI deployment clarified with the designer; dead-code items deferred |
| 2026-09-16 | designer + Claude | Cross-review fixes: section pointers, dependency direction, naming, cohesion knob row. Decisions: COMMAND halfway pending measurement, early breaks intended, CHARGE² measured first, events must be narrated |

*Generated by `/reverse-document design packages/engine/src/resolveFronts.ts`. Companion: `docs/MECHANICS.md`.*
