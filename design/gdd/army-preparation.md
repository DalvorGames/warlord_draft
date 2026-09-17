# Army Preparation — Design Document

---
**Status**: Reverse-Documented
**Source**: `packages/engine/src/prepare.ts`; data `rules.json` (`plans`, `fronts.plans`, `terrain`, `styleToPlan`, `styleMatchBonus`, `traitThresholds`), `cultures.json`
**Date**: 2026-09-16
**Verified By**: designer (intent questions answered 2026-09-16; draft approved)
**Implementation Status**: Fully implemented; three formula changes decided, not yet made (§9)
---

> **Reverse-Documentation Notice**
>
> Created after the implementation existed. Captures current behaviour plus intent clarified with the
> designer. Plain-language companion: `docs/MECHANICS.md` §2, §4, §5.

## Summary

Army Preparation turns a drafted army (a general, eight units, a plan, a deployment) and a ground into the
numbers the battle uses: each unit's effective stats, the army-wide multipliers for each stage, the COMMAND
factor, and the inputs to cohesion. It is where culture traits, combined arms, the plan, the doctrine match
and the ground all take effect. Nothing here is random.

> **Quick reference** — Layer: `Core` · Priority: `MVP` · Key deps: `Units & Generals`, `Draft` (culture counts, trait level), `Deployment` (default), consumed by `Battle Resolution` and `Deployment` (preview)

---

## 1. Overview

**Purpose.** One pure function, `prepareArmy(data, army, terrain, opts)`, that every consumer shares, so the
Deploy preview, the AI's simulations and the real battle all see the same army.

**Scope.** Trait application; combined arms; plan multipliers; doctrine match; ground stat multipliers; the
COMMAND factor; the cohesion inputs (`moraleParts`); trait rule flags; the v1-to-fronts phase mapping.
Excluded: scoring and morale (Battle Resolution); choosing the plan or deployment (Deployment); counting
cultures at the draft (Draft owns `cultureCounts` and `traitLevel`, this system calls them).

**Current implementation.** Returns a `PreparedArmy`: `units` (with `stats`, `front`), `phaseMult` for four
phases, `steadinessMult`, `rollupMult`, `tacticsMult`, `cmd`, `moraleThreshold`, `moraleParts`, `rules` flags,
`traits`, `combinedArms`, `styleMatch`, `cultureCounts`, `totalCost`. In the fronts model the four v1 phase
names map to: skirmish → skirmish, charge → contact and roll-ups, grind → center press, flank → wing press.

**Design intent (clarified 2026-09-16).**
- The **ground changes how well a unit fights there, not how brave it is.** Ground multipliers should apply
  to combat stats only, not STEADY. Today they hit every stat.
- **COMMAND should matter without dominating.** The factor is to narrow; the working assumption is halfway,
  pending measurement. A wide spread between generals matters less once the ladder ranks weaker generals
  higher (Campaign §3.4).
- The **plan is a real decision**; the flat doctrine bonus is to shrink or become fight-specific.
- **Combined arms is kept** as a reward for a rounded army. Today it is on 97% of armies because the board
  hands it out; it is to be re-measured after the draft board changes (target: about a third of armies).
- **Level I traits are a build-around; level II is a rare treat.** Trait *effects* live here; trait *reach*
  is the Draft's problem.

---

## 2. Player Fantasy

Your army is more than eight cards. Four Romans and their general make a legion that does not break; a
Carthaginian commander makes every mercenary fight a little better; the right doctrine under the right
general clicks. And the ground matters: you do not send horse into a forest. The player should be able to
predict these effects from one line of text each and see them confirmed in the battle report ("brings
Manipular Reserve I, Combined Arms, hammer doctrine").

---

## 3. Detailed Rules

Steps run in this order. Order matters (see §5).

1. **Validate.** Unknown general, unknown unit, unknown plan, unknown ground, or a slot count other than
   eight throws.
2. **Plan row.** In the fronts model the plan's fronts row is read (skirmish, contact, steadiness, center,
   wing, moraleThreshold). `steadinessMult` starts at the plan's steadiness value.
3. **Units and fronts.** Each unit starts with its base stats, role = its class, penalty 1, and the front
   from `army.deployment`; if the deployment is missing or the wrong length, the default deployment is used.
   (In the v1 model slot penalties are applied here instead; out of scope.)
4. **Culture traits.** Count units per culture, with the general counting as one of their own culture
   (`generalCountsAsUnit`). For each culture at level 1 (count ≥ 4) or level 2 (count ≥ 6), apply that
   level's entries (level 2 replaces level 1, it does not stack on it):
   - `{phase, mult}`: multiply that phase's army multiplier.
   - `{stat, mult, scope}`: multiply that stat (or all six) on units of that culture (`culture`) or of every
     other culture (`other_cultures`).
   - `{moraleThreshold}`: multiply the cohesion multiplier.
   - `{steadiness}`, `{rollup}`: multiply `steadinessMult`, `rollupMult`.
   - `{generalStat: "tactics", phase: "flank"}`: multiply `tacticsMult`.
   - `{rule}`: set a flag the resolver reads (`pikes_ignore_shaken`, `never_shaken_by_charge`,
     `half_morale_damage_from_lost_grind`, `rampage_chance_halved`).
   - `{eliteSlots}`: draft-time only, ignored here. `{phaseWeight}`: v1 only, ignored by the fronts resolver.
5. **Combined arms.** If the army has at least one line-class unit, one cavalry-class unit, and one ranged-
   or skirmish-class unit: wing press ×1.10, center press ×1.05.
6. **Plan.** Multiply each phase multiplier by the plan's value; multiply the cohesion multiplier by the
   plan's `moraleThreshold`.
7. **Doctrine match.** If `styleToPlan[general.style] === plan`, multiply all four phase multipliers by
   `styleMatchBonus` (1.08). Hammer → Aggressive; Envelopment → Envelopment; Attrition and Defensive →
   Defensive; Skirmish → Skirmish.
8. **Ground.** For each unit, `m = terrain[subtype] × terrain[class]` (each defaulting to 1). If `m ≠ 1`,
   multiply **all six stats** by `m`.
9. **COMMAND factor.** `cmd = 0.85 + 0.30 × COMMAND/100`.
10. **Cohesion inputs.** `moraleParts = { avgDiscipline (army-wide, after all multipliers), charisma, mult }`.
    The per-front threshold is computed from these by `frontThreshold` using each front's own units.

`opts.traits = false` skips step 4 (used by the batch tool to measure trait lift).

### Culture traits (effects)

| Culture | Trait | Level I (4) | Level II (6) |
|---|---|---|---|
| Macedon | Combined Arms | wing press ×1.25 | wing press ×1.35; roll-ups ×1.3; pikes ignore shaken |
| Greece | Hoplite Cohesion | Greek units STEADY ×1.15; cohesion ×1.05 | same; steadiness ×1.04 |
| Persia | Weight of Numbers | +1 elite slot; steadiness ×1.05 | +1 elite slot; steadiness ×1.08; center press ×1.10 |
| Carthage | Mercenary Army | non-Carthaginian units all stats ×1.05 | ×1.08; TACTICS contribution ×1.2 on the wings |
| Rome | Manipular Reserve | cohesion ×1.10 | cohesion ×1.10; never shaken by a charge |
| China | Crossbow Volleys | skirmish ×1.20 | skirmish ×1.30; (`phaseWeight`, no effect in fronts) |
| Steppe | Refuse Battle | skirmish ×1.25 | skirmish ×1.25; half damage from a lost center press |
| India | Elephant Line | contact ×1.08 | contact ×1.15; rampage chance halved |
| Gauls | Furor | contact ×1.08 | contact ×1.18; cohesion ×0.95 |

---

## 4. Formulas

### 4.1 Phase multiplier

```
phaseMult[p] = Π traitMult[p] × combinedArms[p] × plan[p] × (styleMatch ? 1.08 : 1)
```

Range in practice about 0.85–2.0. Example: Macedon I, combined arms, Envelopment, matched doctrine, wing
press: 1.25 × 1.10 × 1.25 × 1.08 = 1.86. The same army's center press: 1.05 × 0.90 × 1.08 = 1.02. The ceiling
is Macedon II with the same stack: 1.35 × 1.10 × 1.25 × 1.08 = 2.00. Scores feed an edge capped at 0.6, so a
2× multiplier saturates the cap against an unboosted opponent of equal strength.

### 4.2 COMMAND factor

```
cmd = 0.85  + 0.30 × COMMAND/100         current:      55 → 1.015, 70 → 1.06, 95 → 1.135   (spread 12%)
cmd = 0.875 + 0.25 × COMMAND/100         provisional:  55 → 1.013, 70 → 1.05, 95 → 1.113   (spread 10%)
cmd = 0.90  + 0.20 × COMMAND/100         alternative:  55 → 1.01,  70 → 1.04, 95 → 1.09    (spread 8%)
```

Applied by the resolver to every score. The constants live in `rules.command` (`base`, `slope`), with
today's values as the fallback for older data sets.

**Measured 2026-09-16** (20,000 battles per variant): general win rates span 23–83% today (SD 11.9), 23–82%
halfway (11.0), 26–79% fully softened (10.2), and still 34–67% (6.9) with COMMAND removed entirely. The four
general stats are strongly correlated in the data (COMMAND–TACTICS 0.78, COMMAND–CHARISMA 0.53), so TACTICS
and CHARISMA carry the spread when COMMAND is muted. **Softening COMMAND is not the lever for the general
lottery.** The handicap ladder (Campaign §3.4) or de-correlated general data is. See `docs/reviews/2026-09-16-measurements.md` §2.

### 4.3 Ground stat multiplier

```
m(u) = terrain[u.subtype] × terrain[u.class]
```

| Ground | Multipliers |
|---|---|
| plains | cavalry 1.05, chariot 1.05 |
| hills | cavalry 0.8, chariot 0.7, elephant 0.85, ranged 1.1, skirmish 1.1 |
| forest | cavalry 0.7, chariot 0.6, pike 0.75, elephant 0.8, skirmish 1.15, warband 1.1 |
| river | pike 0.85 (and `chargeAttacker` 0.7, unused by the fronts resolver) |

Subtype and class stack: a chariot (class special) only has a subtype entry, but a future "cavalry" subtype
entry would multiply with the class entry. Stats are not clamped to 100 after multiplication.

### 4.4 Cohesion inputs

```
moraleMult = Π trait moraleThreshold × plan.moraleThreshold
threshold(front) = (0.55 + 0.35 × avgSTEADY(front)/100 + 0.20 × CHARISMA/100) × moraleMult
```

Owned jointly with Battle Resolution §4.1. `avgSTEADY` uses effective STEADY, after traits and ground.

---

## 5. Edge Cases

| Scenario | Behaviour | Note |
|---|---|---|
| Ground multiplies STEADY | Forest cavalry is ×0.7 on STEADY too, so its wing's cohesion falls about 0.06 and it breaks sooner | ⚠ decided: exclude STEADY from the ground multiplier |
| Traits then ground | Greek STEADY ×1.15 is applied before ground; both multiply | order is fixed |
| Two cultures at level I | Both traits apply (4 + 4, or 3 + general and 4) | possible, rare |
| Level II | Replaces the level I entries, does not add to them | Rome II = ×1.10 cohesion once |
| Carthage trait with a Carthaginian general and no Carthaginian units | Count is 1; no trait | general alone never triggers |
| Carthage I with 4 Carthaginians | Boosts only the other 4 units | trait rewards a mixed army |
| Stat above 100 after multipliers | Not clamped; curves like `(CHARGE/100)` exceed 1. Traits and ground stack: a CHARGE 90 cataphract under Carthage II on plains is 90 × 1.08 × 1.05 = 102, and squared impact is 104 against 81 unboosted (+29% from a +13% stat) | unmeasured; see Battle Resolution §5 |
| Combined arms via a special unit | Specials do not count as line, cavalry or shooter | elephants do not complete the set |
| Plan off-doctrine | No bonus, no penalty | |
| `opts.traits = false` | Traits skipped, everything else applies | batch measurement only |
| Deployment missing | Default deployment used silently | see Deployment §3.2 |

---

## 6. Dependencies

**Depends on**
- **Units & Generals**: base stats, class, subtype, culture, general stats and style; `cultures.json` entries;
  all rules data named above.
- **Draft**: `cultureCounts`, `traitLevel` (thresholds 4 and 6; general counts as one).
- **Deployment**: `defaultDeployment` when the army has none.

**Depended on by**
- **Battle Resolution**: consumes the whole `PreparedArmy`.
- **Deployment** (`deployPreview`, `deployAgainst`): cohesion words, reserve counts, AI simulations.
- **Battle report and Deploy screen**: `traits`, `combinedArms`, `styleMatch` are shown to the player.
- **Batch tooling**: `totalCost`, trait toggles.

---

## 7. Tuning Knobs

| Knob | Current | Affects | Safe range | Notes |
|---|---|---|---|---|
| `rules.command` (`base`, `slope`) | 0.85, 0.30 | general dominance | 0.85–0.90, 0.20–0.30 | measured 2026-09-16: a weak lever (spread 60 → 53 points at full softening). Owned here; also listed in Battle Resolution §7 |
| `styleMatchBonus` | 1.08 | doctrine lookup | **1.00–1.04**, or fight-specific | ⚠ decided: plan must be a real decision. Owned here; also listed in Battle Resolution §7 |
| `fronts.plans.*` | see `docs/MECHANICS.md` §5 | what each plan is good at | 0.85–1.3 per cell | re-tune with the doctrine bonus |
| Ground stat multipliers | §4.3 | which units belong on which ground | 0.6–1.2 | ⚠ decided: stop applying to STEADY |
| Combined arms bonus | wing 1.10, center 1.05 | reward for a rounded army | 1.05–1.15 | re-measure reach after the board change |
| Combined arms condition | ≥ 1 line, ≥ 1 cavalry, ≥ 1 shooter | how many armies qualify | — | target about a third of armies |
| `traitThresholds` | [4, 6] | trait reach (with Draft) | [3–4, 5–6] | owned by Draft; listed here because trait effects depend on it |
| `generalCountsAsUnit` | true | trait reach | — | |
| Trait effect sizes | table §3 | how much a culture army feels different | ±5–35% | |
| Cohesion constants | 0.55 / 0.35 / 0.20 | how long fronts stand | base 0.5–0.6 | shared with Battle Resolution (§4.1, §7) |

---

## 8. Acceptance Criteria

**Verified by existing tests**
- ✅ Culture traits apply (Alexander with 7 Macedonians reaches level II) — `resolve.test.ts`.
- ✅ Ground is asymmetric: hills hurt the cavalry-heavy side — `resolve.test.ts`, `fronts.test.ts`.
- ✅ Preview thresholds equal resolver thresholds on every ground — `preview.test.ts`.

**Not covered by any test**
- ❌ Level II replaces level I rather than stacking.
- ❌ `other_cultures` scope boosts only non-matching units.
- ❌ Doctrine match sets `styleMatch` and multiplies all four phases; off-doctrine does not.
- ❌ Combined arms requires all three kinds; specials do not count.
- ❌ After the decided change: ground never alters STEADY.
- ❌ `cmd` equals the documented formula at COMMAND 55, 70 and 95.

**Batch targets after the decided changes**
- [ ] General stats explain well under half of general win-rate variance (today 92%).
- [ ] The doctrine plan is best for no more than about 60% of rosters (today 98.8%). Measured 2026-09-16:
  this needs `styleMatchBonus` of about 1.02–1.03 (1.04 gives 75.8%, 1.02 gives 52.5%); and with no bonus
  Defensive is the best plan for only 10% of rosters, so the plan table needs Defensive strengthened. 75% is Pillar 1's own
  line for a fake decision, so the target sits well under it.
- [ ] Combined arms active on roughly 25–45% of greedy-drafted armies (today 97%).

---

## 9. Open Questions and Follow-Up Work

### Decided 2026-09-16
1. **Ground affects combat stats only.** Change step 8 to skip `discipline`. Re-run the hills/plains cavalry
   target afterwards (cavalry-heavy armies ≥ 5 points better on plains than hills).
2. **Soften COMMAND, provisionally halfway** to `0.875 + 0.25 × COMMAND/100`; decide between that and
   `0.90 + 0.20` only after measuring general win-rate spread with all other changes applied.
3. **Shrink or localise the doctrine bonus** so the plan is a decision. Candidates: a flat 1.04, or style-
   specific (Hammer boosts contact only, Envelopment wings only, Attrition/Defensive center and cohesion,
   Skirmish skirmish only). Measure "best plan share" with the batch tool. Caution from the cross-review: a
   style-specific bonus stacks on the plan table's own peak cell (Envelopment's wing is already 1.25), so it
   can recreate a narrower lookup for Envelopment and Skirmish generals. Check candidates against the table's
   peaks, not just against the flat-bonus baseline.
4. **Keep combined arms**, re-measure after the board change, tighten the condition if it is still near-universal.

All four change battle outcomes, so they need a `dataVersion` bump to keep old run strings replayable. They
are to be **measured together in one batch run** before any ships alone (cross-review 2026-09-16).

### Deferred (with the other dead-code items)
5. `phaseWeight` trait entry (China II) and `terrainChargeMult` (river) are computed here and ignored by the
   fronts resolver.
6. v1 slot-penalty path in step 3 is unreachable while `battleModel` is `"fronts"`.

### Flagged follow-up work
- [ ] Add the six missing unit tests (§8).
- [ ] Decide whether stats should clamp at 100 after multipliers.

---

## 10. Version History

| Date | Author | Changes |
|---|---|---|
| 2026-09-16 | Claude (reverse-doc) | Initial reverse-documentation from `packages/engine/src/prepare.ts`; intent on ground, COMMAND, doctrine and combined arms clarified with the designer |
| 2026-09-16 | designer + Claude | Cross-review fixes: multiplier range, stat-overflow worst case, knob ownership. Decisions: COMMAND halfway pending measurement, plan target tightened to about 60% |
