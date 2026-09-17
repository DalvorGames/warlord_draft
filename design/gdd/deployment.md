# Deployment — Design Document

---
**Status**: Reverse-Documented
**Source**: `packages/engine/src/deploy.ts`, `preview.ts`; client `apps/web/src/app/deploy/[battle]/page.tsx`, `apps/web/src/lib/deployText.ts`
**Date**: 2026-09-16
**Verified By**: designer (intent questions answered 2026-09-16; draft approved)
**Implementation Status**: Fully implemented; AI strength and the reserve preview flagged for change (§9)
---

> **Reverse-Documentation Notice**
>
> This design document was created **after** the implementation already existed. It captures current
> behaviour from code analysis plus design intent clarified with the designer. Plain-language companion:
> `docs/MECHANICS.md` §6.

## Summary

Deployment is the decision the player makes before every battle: seeing the enemy's eight units and the
ground, they hand-place their own eight units on the Left, Center or Right and choose a plan. The enemy's
shape is hidden, so loading a wing is a bet. Today the AI reads the player's roster and optimises against it;
the decided design is an AI that picks a good line from its own units and the ground, blind to the player.
This system owns the default heuristic, the AI's choice, and what the player is told.

> **Quick reference** — Layer: `Core` · Priority: `MVP` · Key deps: `Battle Resolution`, `Army Preparation`, `Units & Generals` · Consumed by: `Campaign`, `Battle Resolution`

---

## 1. Overview

**Purpose.** Turn a drafted roster into a battle line, once per battle, for both the player and the AI, and
give the player enough information to reason about the bet without revealing the answer.

**Scope.** The three fronts and who faces whom; the default deployment heuristic; the AI's candidate set and
selection; the Deploy screen's information (enemy roster, prose read, cohesion words, reserve counts, plan
picker); legality rules. Excluded: what happens once the lines meet (Battle Resolution), how stats and
cohesion are computed (Army Preparation, Preview).

**Current implementation.** `defaultDeployment`, `deploymentCandidates`, `deployAgainst` (exposed to the
client as `engine.aiDeploy`), `deployFor` (unused terrain lean), `withDeployment`, `deploymentString`. The
client starts each battle with an empty pitch, lets the player place units one at a time, shows live
cohesion per front via `deployPreview`, and resolves with the foe deployed by `aiDeploy(foe, mine, terrain)`.

**Design intent (clarified 2026-09-16).**
- The enemy's deployment is **hidden but guessable**. A player who reads the roster and reasons should win
  the deployment contest about as often as they lose it.
- In the campaign the AI **does not read the player at all**. It chooses a good layout from its own units and
  the ground, the way a player would if they could not see the enemy. It never sees the player's roster, line
  or plan. (Revised 2026-09-16, replacing an earlier "keep the roster reader, weakened" answer.) The same AI
  for every battle; difficulty escalation is not this system's job (see §9, dependency on Campaign).
- The player is given the **enemy roster and a prose read, no shape hint**. Deduction is the game.
- The pitch **starts empty and every unit is placed by hand**. The eight taps are the decision; no auto-deploy.
- The **plan is chosen per battle** on this screen, defaulting to the general's doctrine.

---

## 2. Player Fantasy

You are reading the other general. Six that stand and two that ride: his wings are thin, so do you strip
your own center to crush one, or does he expect that? You place each unit yourself and watch the front's
cohesion word change from BRITTLE to STEADY as you do. When the lines meet and your loaded wing finds one
cavalry unit opposite, you were right, and the roll-up is yours. When it finds four, you were read.

Emotional targets: the tension of commitment under hidden information; ownership of the line (you placed
every unit); a loss that reads as "I was out-thought", not "I was cheated".

---

## 3. Detailed Rules

### 3.1 Fronts

1. There are three fronts: Left (`L`), Center (`C`), Right (`R`).
2. Left faces the enemy's Right, Center faces Center, Right faces the enemy's Left (`OPPOSITE`).
3. A deployment is an array of eight fronts, one per draft slot, encoded in run strings as e.g. `LCCRCLRC`.

### 3.2 Legality

1. Any assignment of eight units to three fronts is legal for the player, including an empty Center or all
   eight on one front.
2. The player must place all eight units before the battle can be given (client rule).
3. A deployment whose length is not eight is ignored and the default is used (engine rule).

### 3.3 The default deployment

1. Units of class line, shock or ranged go to the Center.
2. Units of class cavalry, skirmish or special are wing units. Sort them by descending wing power and deal
   them alternately Left, Right, Left, … so the wings come out even.
3. If the roster has no Center-class unit at all, the three units with the highest STEADY hold the Center and
   the rest are dealt to the wings as above.

The default is what the engine uses for any army without a deployment, what the AI assumes the player will
do, and what the batch bots use.

### 3.4 The AI's deployment (`deployAgainst`)

1. Assume the enemy (the player) deploys by the default heuristic.
2. Build the candidate set from the AI's own default: the default; its mirror (Left and Right swapped);
   every single-unit move to a different front. A line-class unit with SPEED below 50 is never moved to a
   wing. A candidate must keep at least one unit in the Center. Roughly twenty shapes.
3. For each candidate, resolve the battle against the assumed enemy on the real ground over `seeds` fixed
   seeds (1001, 1002, …). These are the bot's own seeds, never the battle's.
4. Score each candidate (formula §4.2) and keep the highest. Ties keep the earliest, so the default wins ties.
5. With `seeds ≤ 0` the AI simply uses the default.

The client calls this with the default `seeds = 6`.

### 3.5 What the player sees

1. The enemy general, the eight enemy units with stats, and the ground.
2. A one-sentence prose read of the enemy roster (`enemyRead`): how many stand, ride and skirmish, plus one
   of four pieces of advice (heavy center; strong wings; no shooters; balanced).
3. For each of their own fronts as they place units: unit count, a cohesion word (FIRM ≥ 1.0, STEADY ≥ 0.92,
   BRITTLE below, NOTHING HERE when empty), and how many units would stand in reserve.
4. When holding a unit: what each front's cohesion word would become if it were placed there.
5. The plan picker with the plan's multipliers and whether it matches the general's doctrine.
6. The player never sees the enemy's deployment before the battle.

### 3.6 Plan per battle

The plan is stored per battle in the campaign save and defaults to `styleToPlan[general.style]`. The draft
state's single `plan` field is filled with the doctrine plan only to validate the draft.

### 3.7 States

| State | Entry | Exit | Behaviour |
|---|---|---|---|
| Empty pitch | battle begins | first unit placed | no preview; cannot give battle |
| Placing | ≥ 1 unit placed | all 8 placed | live cohesion and reserve per front; held-unit what-if |
| Ready | all 8 placed | player gives battle | plan confirmed; battle resolves; deployment saved per battle |
| Fought | battle given | — | deployment and plan frozen in the save and the run string |

---

## 4. Formulas

### 4.1 Wing power (default heuristic ordering)

```
wingPower(u) = SPEED × 0.4 + FIGHT × 0.4 + CHARGE × 0.2
```

| Variable | Range | Source |
|---|---|---|
| SPEED, FIGHT, CHARGE | 0–100 | `units.json` base stats (before terrain and traits) |

Output 0–100. Example: heavy cavalry SPEED 80, FIGHT 65, CHARGE 75 gives 73. Uses **base** stats, so it does
not notice that hills cut cavalry by 20%.

### 4.2 AI candidate score

```
score(d) = Σ_{s=1..seeds} [ (win ? 1 : 0) + 0.25 × (enemyMorale − ownMorale) ]
```

Morale values are the resolver's army-morale damage, 0 to about 1.3. With 6 seeds the range is roughly −2 to
+8. The morale term only breaks ties between candidates with equal wins.

### 4.3 Reserve count (shown to the player)

```
reserve(n, oppN) = n − min(n, ceil(max(1, oppN) × frontage))        frontage = 1.5
```

Example: 5 units on a front facing 2 gives `5 − min(5, 3) = 2` in reserve. **Defect:** the client supplies
`oppN` from the foe's *default* deployment, which the foe does not use (§9).

### 4.4 Cohesion word

Thresholds from `frontThreshold` (see Battle Resolution §4.1): FIRM ≥ 1.0, STEADY ≥ 0.92, BRITTLE > 0,
NOTHING HERE = 0.

---

## 5. Edge Cases

| Scenario | Behaviour | Source |
|---|---|---|
| Roster with no line, shock or ranged unit | Three steadiest units hold the Center; rest dealt to wings | `defaultDeployment` |
| Roster with no cavalry, skirmish or special unit | Default puts all eight in the Center; both wings empty; costs 0.50 morale at contact. Not guarded | `defaultDeployment` |
| Odd number of wing units | Left gets the extra (dealing starts Left) | `defaultDeployment` |
| Foot ranged units | Default puts them in the Center, where they shoot at half strength | `defaultDeployment`, resolver |
| Player leaves Center empty | Legal. Center gives way at contact: 0.40 morale on the spot | Battle Resolution §5 |
| AI candidate would empty its Center | Excluded from the candidate set | `deploymentCandidates` |
| AI roster of all slow line units | Candidate set is the default only; AI deploys everything Center | `deploymentCandidates` |
| Deployment array of wrong length | Default used silently | `prepareArmy`, `withDeployment` |
| Player changes plan after placing | Cohesion words recompute live (plan cohesion multiplier) | Deploy page |
| AI seeds | Fixed 1001–1006 for every battle; the AI's choice is deterministic given both rosters and the ground | `deployAgainst` |
| Player deploys by the default | The AI's assumption is exactly right; the player meets the AI's best counter | reviews: 32–40% win rate |
| Mid-placement refresh | Partial placement persists in the campaign save | `CampaignProvider` |
| AI simulates against the player's roster and chosen plan | The client passes the player's army with that battle's plan, so changing the plan can change the foe's shape. Leaks hidden information | ⚠ defect, see Campaign §5; fixed by making the campaign AI player-blind (§9.1) |

---

## 6. Dependencies

**Depends on**
- **Battle Resolution**: `deployAgainst` runs the resolver to score candidates; fronts, frontage and empty-front
  rules define what a deployment means.
- **Army Preparation / Preview**: `deployPreview` and `frontThreshold` for cohesion words and reserves.
- **Units & Generals**: unit class, base stats; `rules.fronts.frontage`; `styleToPlan`.

**Depended on by**
- **Battle Resolution**: consumes `Army.deployment`; falls back to `defaultDeployment`.
- **Campaign**: stores plan and deployment per battle; calls `aiDeploy` for the foe at resolve time.
- **Draft** (AI drafters and batch tooling): `withDeployment` gives bot armies the default.
- **Deploy screen, Rules page**: the Rules page teaches "cavalry on a wing, heavy infantry in the center",
  i.e. the default.

---

## 7. Tuning Knobs

| Knob | Current | Affects | Safe range | Notes |
|---|---|---|---|---|
| Campaign AI deployment | `deployAgainst(foe, player, ground)`, 6 seeds | whether the AI reacts to the player | **own-roster layout, player-blind** | ⚠ decided: see §9.1 |
| Own-roster layout quality (not implemented) | — | how good the AI's line is | default, or best-of-candidates against a neutral mirror | the dial for AI skill once it is player-blind |
| Near-tie window (not implemented) | — | how unpredictable the AI's line is | candidates within about 5–10% of the top score | ⚠ decided: the AI picks among near-tied layouts using the campaign seed (§9.1) |
| Candidate breadth | default, mirror, single moves (~20) | how far the AI strays from the default | single moves only | two-unit moves would make it stronger |
| Score morale weight | 0.25 | tie-breaking toward convincing wins | 0–0.5 | |
| Slow-line rule | SPEED < 50 stays Center | AI realism | 40–60 | |
| `frontage` (`rules.fronts`) | 1.5 | reserve counts | 1.2–2 | owned by Battle Resolution |
| Wing power weights | 0.4 / 0.4 / 0.2 | default wing ordering | keep equal to the wing press weights | mirrors Battle Resolution §4.5 |
| Cohesion word cut-offs | 1.0 / 0.92 | what reads as BRITTLE | 0.88–0.95 for STEADY | client copy only |

**Target after the change:** a reasoned player deployment wins at least as often as the AI's (the AI has no
read, the player does), and the default heuristic does not win more than 60% against alternatives on the same
roster. Measure with
`npx tsx src/cli/deploy_swap.ts`.

---

## 8. Acceptance Criteria

**Verified by existing tests**
- ✅ Default deployment puts infantry in the Center and mounted troops on the wings (`fronts.test.ts`).
- ✅ Preview cohesion equals the resolver's threshold on every ground; partial placements leave unplaced units
  off every front; reserves follow the frontage rule (`preview.test.ts`).

**Batch targets**
- ❌ Deployment is a decision: default heuristic ≤ 60% against alternatives on the same roster. Fails today
  against the reader (reader 56–68%).
- ❌ A reasoned player deployment wins ≥ 45% per battle against the AI at cost parity and equal generals.
  Today 32–40%. (This isolates deployment skill. Campaign's tiered per-battle targets of about 80 / 65 / 55–60%
  vary the foe's general and army cost on top of it; the campaign simulator should report both from one run.)
- ❌ **The AI's line is not derivable from its roster and the ground alone**: for the same foe roster and
  ground, different campaign seeds produce at least two distinct lines in most cases; and the same campaign
  seed produces the same line for every player (Pillar 4). Not built.
- ⚠ When measuring "default ≤ 60%", compare the default against *other player deployments* versus the same
  AI. If the AI is itself close to the default, default-versus-AI lands near 50% for the wrong reason.

**Not covered by any test**
- ❌ No-infantry roster: three steadiest hold the Center.
- ❌ Candidate set never empties the Center and never moves a slow line unit to a wing.
- ❌ `deployAgainst` is deterministic and returns the default when `seeds ≤ 0`.
- ❌ The mirror candidate is present.

**Definition of done**
- [ ] Campaign AI deploys player-blind and both batch targets pass.
- [ ] Reserve preview no longer assumes the foe's default (§9 item 2).
- [ ] The four missing unit tests exist.
- [ ] Rules page copy reviewed so it does not coach the one shape the AI is best at countering.

---

## 9. Open Questions and Follow-Up Work

### Decided 2026-09-16
1. **The campaign AI is player-blind** (revised 2026-09-16). It picks a good layout from its own units and
   the ground and never sees the player's roster, line or plan. This removes the plan leak and the "AI beats
   every reasoned deployment" finding at once. Options to build it, simplest first:
   (a) the default heuristic plus a ground-aware adjustment that actually measures better than the default
   (the existing `deployFor` lean measured worse, so it needs rework);
   (b) best-of-candidates simulated against a **neutral mirror** (its own army in its default shape) rather
   than against the player.
   `deployAgainst` stays in the engine for a future 1v1 bot or a hard mode. Measure with `deploy_swap.ts`.
   **Measured 2026-09-16:** against an AI that simply uses the default line, a player who reasons about the
   roster wins **66.5%** at equal cost (the default-versus-default baseline is 48.8%). A default-deploying
   blind AI is too easy a read, so option (b) or a better own-roster line is needed, plus the seeded choice
   below. See `docs/reviews/2026-09-16-measurements.md` §1.
   **Staying a bet (decided 2026-09-16):** a player-blind AI whose line depends only on its roster and the
   ground could be computed by a player who learns the procedure. So the AI scores its candidate layouts and
   then **picks among the near-tied top few using the campaign seed**. The line is the same for everyone
   that day, can be precomputed into the campaign spec, and cannot be derived from the roster alone.
2. **Roster plus prose, no shape hint.** Follow-up: the reserve preview currently computes `oppN` from the
   foe's default deployment, which implies knowledge the player does not have and is wrong. Change it to a
   neutral assumption (e.g. 8/3 ≈ 3 per front, which `deployPreview` already does when `opposing` is omitted)
   or show reserves as a range.
3. **Empty pitch, hand placement only.** No auto-deploy button. No change needed.
4. **Plan per battle** is the implemented and intended behaviour. `docs/MECHANICS.md` corrected.

### Open
5. **Where does the difficulty curve come from?** The designer chose one AI strength for all three battles,
   so escalation must come from the Campaign system (foe general tiers, foe army cost bands). Tracked there.
6. **`enemyRead` advice can mislead.** "Pack the center and his wings are one unit each" is advice against
   the default shape, which the AI does not use. Review the four advice lines once the AI is player-blind.
7. **Default sends foot archers to the Center** where they shoot at half strength. Intended (they are the
   line's missile screen) or should the default put one ranged unit on each wing?

### Deferred (decide later, with the other dead-code items)
8. **`deployFor` terrain lean** measured worse than the default (−4 points overall, −13 in forest) and is
   unused unless `lean` is passed. Cut or keep for experiments.

### Flagged follow-up work
- [ ] Add the four missing unit tests (§8).
- [ ] Add a CHARGE-stacking deployment variant to `deploy_swap.ts` (Battle Resolution §9 item 5).
- [ ] Guard or warn: a roster whose default leaves both wings empty.

---

## 10. Version History

| Date | Author | Changes |
|---|---|---|
| 2026-09-16 | Claude (reverse-doc) | Initial reverse-documentation from `packages/engine/src/deploy.ts` and the Deploy screen; intent on AI strength, player information and pitch start clarified with the designer |
| 2026-09-16 | designer | Revised: the campaign AI deploys from its own roster and the ground and never reads the player |
| 2026-09-16 | designer + Claude | Cross-review fixes: summary, dependency direction, naming, stale "weakened" wording. Decision: seeded choice among near-tied layouts so the line stays a bet |

*Generated by `/reverse-document design packages/engine/src/deploy.ts`.*
