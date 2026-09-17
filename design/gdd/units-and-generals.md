# Units & Generals (Roster Data) — Design Document

---
**Status**: Reverse-Documented
**Source**: `packages/engine/data/units.json`, `generals.json`, `cultures.json`, `rules.json` (`grades`, `matchups`); `packages/engine/src/data.ts`, `types.ts`; authoring `packages/engine/scripts/build_data.mjs`, `tune_costs.mjs`
**Date**: 2026-09-16
**Verified By**: designer (intent questions answered 2026-09-16; draft approved)
**Implementation Status**: Fully implemented at data version 2; roster imbalances noted (§5, §9)
---

> **Reverse-Documentation Notice**
>
> Created after the implementation existed. Plain-language companion: `docs/MECHANICS.md` §2–§3.

## Summary

This is the content of the game: 135 units across nine cultures and 81 historical generals, each defined by
a handful of numbers. A unit is six stats, a class, a subtype, a cost and its grade; a general is four stats
and a style. The matchup table says which kinds of unit beat which. Everything the other systems compute
starts here, and balance is tuned here first, by moving unit costs.

> **Quick reference** — Layer: `Foundation` · Priority: `MVP` · Key deps: none; consumed by `Draft`, `Army Preparation`, `Battle Resolution`, `Deployment`, `Campaign`

---

## 1. Overview

**Purpose.** A single, validated, versioned data set that the engine loads as plain JSON, small enough to
ship to a phone and stable enough that a run string replays forever against its data version.

**Scope.** Unit and general schemas; the six unit stats and four general stats as data; classes, subtypes,
archetypes and tags; cost and grade bands; cultures as rosters; the matchup table; load-time validation; the
authoring and cost-tuning pipeline. Excluded: what the stats do in battle (Battle Resolution, Army
Preparation), trait effects (Army Preparation), draft odds (Draft).

**Current implementation.** `scripts/build_data.mjs` is the source of truth: units are declared as an
archetype plus stat deltas, a cost and tags; it writes the four JSON files. `buildData` validates on load and
builds `unitById` / `generalById`. `tune_costs.mjs` runs the batch simulator and moves costs toward each
grade's mean win rate, editing `build_data.mjs` in place. The web app serves the JSON under `data/v2/`.

**Design intent (clarified 2026-09-16).**
- Stats are **words the player can read**: FIGHT, SHOOT, ARMOR, SPEED, STEADY, CHARGE; COMMAND, TACTICS,
  SUPPLY, CHARISMA. Each should have one clear job.
- **COMMAND is currently too strong** and is to be softened (Army Preparation §9). **SUPPLY is currently
  almost meaningless** below 80 and is to become a graded draft stat (Draft §3.B).
- Generals should matter without the general pick deciding the run. The pick is to become a **tradeoff**: a
  weaker general ranks higher on the ladder, via a published **handicap** per general (Campaign §3.4).
- Cost is the **balance lever**, tuned by simulation, not by hand.

---

## 2. Player Fantasy

These are real armies and real commanders. Silver Shields, Numidian horse, Qin crossbows; Hannibal, Alexander,
Bai Qi. A player who knows the history should find the numbers plausible: the Sacred Band is steady, scythed
chariots hit hard and break fast, Flaminius is a poor general. A player who does not know the history should
be able to read a card in two seconds: six words, one grade letter.

---

## 3. Detailed Rules

### 3.1 Unit

| Field | Meaning |
|---|---|
| `id` | `<culture>_<slug>`, unique |
| `name` | display name, may include a gloss in brackets |
| `culture` | one of nine culture keys |
| `class` | `line`, `shock`, `cavalry`, `ranged`, `skirmish`, `special`. Decides which draft rows offer it and where the default deployment puts it |
| `subtype` | one of 20; keys the matchup table and the ground table |
| `archetype` | the authoring template it was built from (24 archetypes; several share a subtype, e.g. `levy` → `spear`, `peltast` → `javelin`, `scythed` → `chariot`) |
| `cost` | 2–15, the balance lever |
| `grade` | derived from cost, must match on load |
| `period` | `early`, `mid`, `late`. Data only; **no system reads it** |
| `stats` | `melee`, `ranged`, `armor`, `mobility`, `discipline`, `shock`, each 0–100 |
| `tags` | flavour and rule hooks. Only `elephant` is read by the engine (rampage). Others: allied, armored, chariot, elite, guard, lancer, levy, manipular, mercenary, phalanx, reformed, rhomphaia, skirmish, veteran |

### 3.2 General

| Field | Meaning |
|---|---|
| `id`, `name`, `culture`, `period`, `note` | identity; `note` is a historical one-liner |
| `stats.command` | multiplies every battle score (Army Preparation §4.2) |
| `stats.tactics` | multiplies the wing press (Battle Resolution §4.5) |
| `stats.logistics` (SUPPLY) | third elite at ≥ 80 (Draft §4.1); to become graded |
| `stats.charisma` | adds to every front's cohesion (Battle Resolution §4.1) |
| `style` | `hammer`, `envelopment`, `attrition`, `skirmish`, `defensive`; maps to a plan for the doctrine match |
| *handicap* (decided, not built) | Derived per data version from the general's measured win rate in the batch tool, not from the stat sum. Shown on the general card and result card; the ladder's tiebreak after battles won |

### 3.3 Grades

| Grade | Cost | Units | Draft weight |
|---|---|---|---|
| S | 13–15 | 8 | 0.05 |
| A | 10–12 | 16 | 0.15 |
| B | 7–9 | 36 | 0.30 |
| C | 5–6 | 51 | 0.30 |
| D | 3–4 | 19 | 0.15 |
| F | 1–2 | 5 | 0.05 |

A and S are **elite** and count against the elite cap.

### 3.4 Classes and subtypes

| Class | Units | Subtypes |
|---|---|---|
| line | 38 | pike, hoplite, spear, legion, halberd, light_inf |
| shock | 22 | elite_inf, sword, warband |
| cavalry | 36 | heavy_cav, cataphract, medium_cav, light_cav, horse_archer |
| ranged | 17 | archer, crossbow, slinger |
| skirmish | 13 | javelin |
| special | 9 | elephant, chariot |

### 3.5 Cultures

Nine cultures of exactly 15 units each: Macedon & Successors, Greek City-States, Achaemenid Persia, Carthage,
Rome, Warring States China, Steppe Nomads, India (Nanda / Maurya), Gauls & Celts. Each has a trait with two
levels (effects in Army Preparation §3).

### 3.6 Matchups

`rules.matchups[attackerSubtype][defenderSubtype or defenderClass]`, default 1, range 0.6–1.4. The resolver
averages an attacker's values over the enemy units on its front and multiplies **every** contribution the
unit makes (shooting, impact, steadiness, press). The shape of the table:

- Spears of every kind beat horse: pike ×1.3, halberd ×1.2, hoplite and spear ×1.15.
- Horse beats shooters: heavy cavalry and cataphracts ×1.4 against archers and slingers.
- Horse loses to spears (×0.7–0.85) and badly to elephants (×0.6).
- Elephants beat all horse (×1.3–1.4) and lose to javelins and slingers (×0.7).
- Shooters beat pikes and elephants (×1.1–1.3); horse archers beat formed infantry (×1.2–1.35).
- Legions edge most infantry (×1.05–1.15) and elephants (×1.1).

### 3.7 Validation on load (`buildData`)

Throws on: duplicate unit or general id; unknown culture; unknown class; a stat outside 0–100 or not a
number; a grade that does not match its cost; a general style with no plan mapping; `rules.slots` not of
length 8. Tags, subtypes and matchup keys are **not** validated.

### 3.8 Authoring and tuning pipeline

1. Edit `scripts/build_data.mjs`: `U(id, name, archetype, cost, period, [six stat deltas], tags, classOverride)`.
   Stats = archetype base + deltas, clamped to 0–100.
2. `npm run build:data` writes the JSON.
3. `node scripts/tune_costs.mjs` loops: run the batch, move any unit whose on-class win rate is more than
   `--band` (5) points from its grade's mean by one cost point, regenerate, repeat.
4. A rules or roster change that alters outcomes requires a `dataVersion` bump; the web app serves data by
   version so old run strings still replay.

---

## 4. Formulas

### 4.1 Grade from cost

```
grade(cost) = S if 13–15, A if 10–12, B if 7–9, C if 5–6, D if 3–4, F if 1–2
```

### 4.2 Unit stats from archetype

```
stat[k] = clamp(archetypeBase[k] + delta[k], 0, 100)
```

Example: Argyraspides = `pike` base [65, 0, 55, 35, 75, 45] + deltas → [77, 0, 65, 35, 90, 50], cost 9, grade B.

### 4.3 Matchup multiplier

```
matchup(u, enemyFront) = mean over d in enemyFront of ( table[u.subtype][d.subtype] ?? table[u.subtype][d.class] ?? 1 )
```

Example: heavy cavalry facing one pike unit and one archer unit: (0.7 + 1.4) / 2 = 1.05.

### 4.4 Cost-tuning move

```
if |winRate(u) − meanWinRate(grade(u))| > band and n(u) ≥ minN:  cost(u) += sign(delta)      (clamped 1–15)
```

### 4.5 Class stat profiles (roster means)

| Class | FIGHT | SHOOT | ARMOR | SPEED | STEADY | CHARGE |
|---|---|---|---|---|---|---|
| line | 64 | 5 | 55 | 42 | 69 | 42 |
| shock | 72 | 2 | 47 | 52 | 61 | 67 |
| cavalry | 58 | 23 | 40 | 82 | 59 | 59 |
| ranged | 29 | 72 | 19 | 59 | 52 | 8 |
| skirmish | 48 | 56 | 25 | 76 | 53 | 28 |
| special | 63 | 8 | 57 | 65 | 39 | 83 |

### 4.6 General stat ranges

| Stat | Min | Median | Max |
|---|---|---|---|
| COMMAND | 55 | 70 | 95 |
| TACTICS | 40 | 70 | 100 |
| SUPPLY | 45 | 70 | 90 |
| CHARISMA | 40 | 70 | 100 |
| Sum of four | 220 (Bessus, Flaminius) | 290 | 375 (Hannibal) |

---

## 5. Edge Cases

| Scenario | Behaviour | Note |
|---|---|---|
| Culture with a thin class | Steppe has 8 cavalry and 1 shock unit; Gauls have 7 shock and 2 line; Greece has 7 line and no specials; only Macedon, Persia, Carthage, China, India and Gauls have specials | today this starves some typed rows (fill rule); with mixed-culture rows it mainly affects trait chasing |
| Culture with few generals | Steppe 3, India 4, Persia 7, Gauls 7, against Macedon 14 and China 13 | home-culture boards for Steppe and India are rare |
| Style skew | 32 of 81 generals are Hammer; all 7 Gauls are Hammer, all 3 Steppe are Skirmish; India has no Hammer | doctrine variety is uneven by culture |
| Grade skew by culture | Persia has 6 D-grade and one A; Macedon has 3 S and 3 A; Steppe has 9 C | cheap cultures are weak to chase unless the trait compensates |
| COMMAND skew by culture | mean COMMAND: China 81, Macedon 78 … Persia 63, Gauls 64 | the measured "Persia and Gaul are weak" is their generals, not their units |
| Unknown subtype in the matchup table | Treated as 1; no error | a typo silently removes a counter |
| Unknown tag | Ignored; no error | only `elephant` has an effect |
| `period` | Present on every unit and general, read by nothing | reserved for a future era filter |
| Stat of 0 | Legal. SHOOT 0 contributes nothing to the skirmish; CHARGE 0 gives zero impact | |
| Cost 1 | Legal per the grade table but no unit uses it (minimum is 2) | |
| Duplicate display names | Legal; ids are unique | e.g. two "Thracian Peltasts" rows can appear from one unit |

---

## 6. Dependencies

**Depends on**: nothing. This is the foundation layer.

**Depended on by**
- **Draft**: roster, grades, classes, cultures, rarity, elite definition, general pool.
- **Army Preparation**: base stats, subtype and class for ground, culture trait entries, general stats and style.
- **Battle Resolution**: effective stats, subtypes for matchups, `elephant` tag, `fronts` and `events` rules.
- **Deployment**: class and base stats for the default heuristic.
- **Campaign**: foes are drafted from the same roster; data version pins replay.
- **Client copy** (`text.ts`): stat words, culture colours and short names, trait gists, grade styling.

---

## 7. Tuning Knobs

| Knob | Current | Affects | Safe range | Notes |
|---|---|---|---|---|
| Unit `cost` | 2–15 | unit balance within its grade | ±1 per tuning round | the primary lever; tuned by `tune_costs.mjs` |
| Tuning `band` | 5 points | how tight costs track win rate | 3–6 | |
| Grade bands | table §3.3 | what counts as elite; draft odds | — | changing them re-grades units |
| Archetype bases | `build_data.mjs` | a whole family of units at once | ±5 per stat | |
| Matchup values | 0.6–1.4 | rock-paper-scissors strength | 0.6–1.4 | affects every stage, so small moves matter |
| General stats | 40–100 | general strength | — | spread is what makes the general pick a lottery; see COMMAND softening |
| Generals per culture | 3–14 | how often each home culture is played | aim ≥ 6 per culture | content work |
| Units per culture per class | see §5 | row starvation, trait reach | aim ≥ 2 per class where history allows | content work |

---

## 8. Acceptance Criteria

**Verified today**
- ✅ Data loads and validates (`buildData` invariants); the web build fails if it does not.
- ✅ Batch target: unit on-class win rate within 5 points of its grade mean after cost tuning (worst today 6.8, per the 2026-09-16 balance review; one unit outside the band).
- ✅ Grades are monotonic in win rate (S > A > B > C > D > F).

**Not verified**
- ❌ Every subtype named in `matchups` and `terrain` exists on at least one unit (typo guard).
- ❌ Every unit subtype has a matchup row or is deliberately neutral.
- ❌ Culture residual win rates within ±5 points with generals held equal (true today per the balance review, not enforced).
- ❌ General win-rate spread (today 24.5%–79%) within an agreed band, e.g. 35%–65%, measured with COMMAND
  softening **and** graded SUPPLY applied together (the two pull in opposite directions).
- ❌ Every general has a published handicap, and the handicap explains most of the remaining spread.

**Definition of done**
- [ ] Load-time validation covers subtype and tag typos.
- [ ] The two unenforced batch targets are part of the batch report.

---

## 9. Open Questions and Follow-Up Work

### Decided elsewhere on 2026-09-16, affecting this data
1. COMMAND softened, provisionally halfway, pending measurement (formula, not data). Re-check whether general
   stat *ranges* also need narrowing once measured.
2. SUPPLY becomes graded, both levers under one joint cap (Draft §3.B). No data change; the 45–90 range is
   already usable.
3. A handicap per general is derived data, published with each data version (Campaign §3.4).

### Open
3. **Roster gaps for mixed-culture boards.** Do Steppe and India need more generals, and do Persia and Gauls
   need stronger ones, or is "their generals are weak" historically the point?
4. **`period`**: cut, or reserve for an era-restricted mode?
5. **Tags**: keep as flavour, or give a few of them rules (veteran, levy, mercenary are obvious candidates)?
6. **Cost correlates weakly with power** (0.19 within armies, per the balance review). Acceptable while cost only
   sets grade and rarity; it matters if a budget is ever added (Draft §9).

### Flagged follow-up work
- [ ] Add subtype and tag validation to `buildData`.
- [ ] Add culture-residual and general-spread lines to the batch report.

---

## 10. Version History

| Date | Author | Changes |
|---|---|---|
| 2026-09-16 | Claude (reverse-doc) | Initial reverse-documentation from the data files, `data.ts` and the build scripts |
| 2026-09-16 | designer + Claude | Cross-review: general handicap as derived data; spread target measured with COMMAND and SUPPLY changes together |
