# Warlord Draft — Engine Handoff v0.2

**Goal:** build a pure, deterministic, client-side engine that takes the data in `./data/` and produces (a) a draft board, (b) a resolved battle with a narrated recap, (c) a batch-sim report. No UI is required for this handoff; a UI consumes the engine's outputs.

**Working title:** Warlord Draft. **Era 1:** The Classical World, 400–200 BC. See `classical-world-design-plan.md` (v0.3) for design rationale; this document is the build spec.

---

## 1. Package contents

```
warlord-draft/
  build_data.mjs           # source of truth for the roster; edit here, run `node build_data.mjs` to regenerate data/
  data/units.json          # 135 units, 15 per culture
  data/generals.json       # 81 generals
  data/cultures.json       # 9 cultures with 2-level traits
  data/rules.json          # every tunable: slots, penalties, plans, terrain, matchups, weights, events, casualties
  sim_v0.1_reference.mjs   # the first resolver; correct in shape, known-wrong in three places (see §7). Use as a reference, not a base.
  HANDOFF.md               # this file
```

Every number in `rules.json` is a balance knob. Nothing in the engine should hard-code a value that exists in `rules.json`.

---

## 2. Data shapes

**Unit** — `{ id, name, culture, class, subtype, archetype, cost, grade, period, stats:{melee, ranged, armor, mobility, discipline, shock}, tags[] }`
- `class` ∈ line · shock · cavalry · ranged · skirmish · special. Decides which slot rows the unit is on-class for and which phases it contributes to.
- `subtype` is the matchup-table key (pike, hoplite, heavy_cav, elephant, …).
- `cost` 1–15 is the balance lever; `grade` S/A/B/C/D/F derives from it (`rules.grades`). Grade drives draft rarity (`rules.draftRarity`) and the elite cap (A and S count as elite).
- `period` is stored but ignored in Era 1.
- `tags` are **descriptive only in v1**. The engine reads exactly one: `elephant` (required by the rampage event). Do not build synergies on tags yet — they are the candidate second axis for Phase 2 (culture = origin, tag = class: `phalanx`, `veteran`, `mercenary`, `elite`, `levy`, `guard`, `allied`). Keep them in the data so that axis can be added without re-authoring.

**General** — `{ id, name, culture, period, stats:{command, tactics, logistics, charisma}, style, note }`
- `style` maps to a battle plan via `rules.styleToPlan`; matching plan grants `rules.styleMatchBonus` on all four phases.
- Counts as one unit of `culture` toward trait thresholds.

**Culture** — `{ name, trait, level1[], level2[] }` where each entry is one of:
- `{ phase, mult }` — multiply that side's score in that phase
- `{ stat, mult, scope }` — multiply a stat (`"all"` = every stat) on units where scope is `culture` (same culture) or `other_cultures`
- `{ moraleThreshold }` — multiply the side's morale threshold
- `{ eliteSlots }` — add to elite cap (draft-time)
- `{ phaseWeight, value }` — override a phase weight
- `{ generalStat, mult, phase }` — multiply the general's stat contribution in that phase
- `{ rule }` — named rule the engine implements: `pikes_ignore_shaken`, `never_shaken_by_charge`, `half_morale_damage_from_lost_grind`, `rampage_chance_halved`

**Army** (engine input) — `{ generalId, slots:[{slot, unitId}] ×8, plan }` where `slot` ∈ line · shock · cavalry · ranged · flex.

---

## 3. Draft

Inputs: `draftSeed`. All randomness comes from one seeded RNG (mulberry32 or xoshiro; must be portable so the same seed replays in any client).

1. **General pool:** 3 generals, uniform random across all 81, no duplicates. Player picks one.
2. **Elite cap** = `rules.eliteCap.base`; if general `logistics ≥ rules.eliteCap.logisticsThreshold` use `withLogistics`. Persia level-1 trait adds `eliteSlots` once the threshold is reached — recompute the cap live as units are picked.
3. **Board:** 8 rows in the order of `rules.slots`. For each row:
   - Roll culture: with probability `rules.homeCultureTilt` it is the general's culture; otherwise uniform over the other 8.
   - Draw `rules.onClassCardsPerRow` (3) units from that culture that are **on-class for the row** (flex row: any class), weighted by `rules.draftRarity[grade]`, no duplicates within the row. If the culture has fewer eligible units than needed, draw what exists.
   - Draw `cardsPerRow − onClass` (1) unit from the same culture that is **off-class and allowed** in this row per `rules.slotPenalties` (not `null`).
   - Row order within cards is random.
   - A unit already picked in another row may appear again (duplicates across rows are RNG, by design).
   - "Ranged" rows accept `ranged` and `skirmish` classes as on-class.
4. **Picks** happen in any order. Enforce: elite cap (A/S count), and that off-class picks are allowed per `slotPenalties`. Nothing else is enforced — no culture cap, no unit-type cap.
5. **Rerolls:** `rules.rerolls` per draft. A reroll re-rolls one entire row (culture + cards) using the *next* RNG draws, and is only allowed on a row not yet picked from.
6. **Plan:** player chooses one of `rules.plans`.
7. **Run string:** `v=<dataVersion>&d=<draftSeed>&g=<pickIndex>&p=<8 pick indices>&r=<reroll row indices>&plan=<plan>` fully reproduces the army. The engine must expose `replayDraft(runString) → Army`.

Trait counters and the elite counter must be derivable from an `Army` at any time (`summarize(army)`), because the UI shows them live.

---

## 4. Army preparation (before any phase)

Compute once per army; produce a `PreparedArmy` with per-unit effective stats and per-side modifiers.

1. **Slot penalty:** for each unit, `mult = rules.slotPenalties[unit.class][slot.class]` (flex row = no penalty; light_cav/horse_archer in a ranged row = `rules.lightCavInRangedSlot`). Multiply all six stats. If `mult ≤ rules.wreckedThreshold`, mark the unit `wrecked` → the side starts the battle **shaken** (see §5).
2. **Role in the sim** is the **slot's** class, not the unit's: a cavalry unit in a line slot fights in the grind and not in the flank phase; an infantry unit in a ranged slot fires in the skirmish phase with its (penalized) ranged stat.
3. **Culture traits:** count units per culture, +1 for the general's culture. Apply `level1` at ≥ `traitThresholds[0]`, replace with `level2` at ≥ `traitThresholds[1]`. Apply stat entries to unit stats, phase entries to a per-side `phaseMult`, morale entries to `moraleThreshold`, rules as flags.
4. **Combined arms:** if the army has ≥1 unit playing line, ≥1 playing cavalry, and ≥1 playing ranged/skirmish → `flank ×1.10`, `grind ×1.05`.
5. **Plan:** multiply `phaseMult` and `moraleThreshold` by `rules.plans[plan]`. If `rules.styleToPlan[general.style] === plan`, multiply all four phases by `rules.styleMatchBonus`.
6. **Command:** `cmd = 0.85 + command/100 × 0.30` — multiplies every phase score.
7. **Morale threshold:** `(0.55 + avgDiscipline/100 × 0.35 + charisma/100 × 0.20) × moraleThresholdMult`. Morale damage accumulates from 0; the side routs when damage ≥ threshold.
8. **Terrain** (`rules.terrain[name]`): keys are unit classes or subtypes, plus `chargeAttacker`. Multiply the matching units' stats for the battle. `chargeAttacker` multiplies the charge score of *both* sides (each side is attacking in its own charge computation) — it is asymmetric because it only hurts sides with charge units. Never apply terrain as a flat per-phase multiplier to both sides; that cancels out.

---

## 5. Battle resolution

`resolveBattle(armyA, armyB, terrain, seed) → BattleResult`. Seeded RNG; every score gets `× gaussian(1, rules.noiseSD)`. Phases run in order; after each, check for rout.

Let `mm(u, defenders)` = mean over defenders of `rules.matchups[u.subtype][d.subtype] ?? rules.matchups[u.subtype][d.class] ?? 1`.

**Skirmish.** Shooters = units playing ranged/skirmish, plus cavalry with `ranged > 30`. Targets = enemy units playing line/shock/special.
`raw = Σ (ranged×0.7 + mobility×0.3) × mm(u, targets)`; `cover = avgArmor(targets)/100 × 0.5`;
`score = raw × (1 − cover) × phaseMult.skirmish × cmd × noise`.

**Charge.** Chargers = units playing shock/cavalry/special with `shock ≥ 50`. Wall = enemy units playing line/shock.
`impact = Σ shock × mm(u, wall)`; `steadiness = Σ_wall (discipline×0.6 + armor×0.4)`;
`score = (impact + 0.3×steadiness) × phaseMult.charge × terrain.chargeAttacker × cmd × shakenMult × noise`.
If a side loses the charge with `edge > 0.25` it becomes **shaken** (`rules.shakenMult` on grind and flank) unless it has `never_shaken_by_charge`; pikes are exempt under `pikes_ignore_shaken`.

**Grind.** Fighters = units playing line/shock/special; `bodies = Σ rules.grindBodyWeight[class]`.
`quality = mean over fighters of (melee×0.5 + armor×0.3 + discipline×0.2) × mm(u, enemyFighters)`;
`score = quality × bodies^rules.lanchesterExponent × phaseMult.grind × cmd × shakenMult × noise`.

**Flank.** Cav = units playing cavalry. `power = Σ (mobility×0.5 + melee×0.3 + shock×0.2) × mm(u, enemyCav or enemyLine)`;
`tactics = 0.7 + general.tactics/100 × 0.6` (× culture `generalStat` mult if any);
`score = (power + 40) × tactics × phaseMult.flank × cmd × shakenMult × noise`.

**Damage per phase.** `edge = |sA − sB| / max(sA, sB)`; loser takes `rules.phaseWeights[phase] × edge × 2`; winner takes 25% of that. Steppe level-2 halves grind damage when losing the grind. After each phase: if either side's damage ≥ threshold → rout; record `brokeInPhase`.

**Break.** If nobody routed after four phases, the side with the higher `damage/threshold` loses; `brokeInPhase = "break"`.

**Events.** Once per battle, with probability `rules.events.chancePerBattle`, pick one event from `rules.events.list` weighted by `weight`, skipping any whose `requires` isn't met or that is `campaignOnly` outside a campaign. Apply its effect in the named phase. India level-2 halves the rampage weight. Events are rolled from the battle seed so they replay.

**Casualties.** `margin = min(1, |fracA − fracB|)` where `frac = damage/threshold`; `pursuit = avg mobility of winner's cavalry / 100`.
Loser: `min(loserMax, loserBase + loserMargin×margin + pursuit×pursuitCoef)`. Winner: `max(0.02, winnerBase + winnerCloseness×(1−margin))`.

**Recap.** 6–8 lines: header (generals, plans, terrain), active traits per side, one line per phase naming the top-cost contributing unit on the winning side and whether the loser's line held/wavered, the event if any, the outcome line, casualties. Templates in `sim_v0.1_reference.mjs → narrate()` are a starting point.

**BattleResult** — `{ seed, winner, brokeInPhase, event, phaseLog[{phase, scoreA, scoreB, damageA, damageB}], moraleFraction{A,B}, casualties{A,B}, recap[] }`.

---

## 6. Batch sim (required deliverable)

`batch.mjs` must:
1. Draft N random armies (default 10,000) using random seeds, random generals, random terrain; play each against another random army.
2. Report per **unit**: appearances, win rate, win rate relative to cost bucket. Flag any unit outside 45–55% within its grade.
3. Report per **general**, per **culture trait** (with a `--trait-toggle` mode that plays the same seeds with traits disabled to measure lift), per **plan**, per **terrain**, and per **off-slot placement** (how often each off-class placement wins vs. the on-class alternative).
4. Report `brokeInPhase` distribution — early routs should be 10–25% of battles, not 0% and not 60%.
5. Report the upset rate: when one army's summed cost is ≥ 20% higher, it should win ~75–80%.

Acceptance for Phase 0: (a) no unit or trait more than 8 points off its target; (b) terrain changes win rates by a measurable amount (≥ 5 points for cavalry-heavy armies on hills vs. plains); (c) early routs in the 10–25% band; (d) every off-class placement loses to its on-class alternative on average.

---

## 7. Known issues in the v0.1 reference — do not carry these forward

1. Grind used `N^1.5` over raw unit count, so an army with more melee bodies (elephants, warbands counted as full line) won 66%. **Fix:** `grindBodyWeight` and `lanchesterExponent = 1.3` in `rules.json`.
2. Terrain multiplied both sides' phase scores equally and therefore cancelled. **Fix:** class-keyed asymmetric terrain (§4.8).
3. Phase weights were too low for any early rout (0 of 6,000). **Fix:** weights raised in `rules.json`; verify against §6.4.

---

## 8. Roster notes for the engine and for balancing

- **Steppe** has 3 generals (Ateas, Spitamenes, Arsaces I) — historically honest; the general pool is uniform over all 81 so Steppe generals are simply rarer. Steppe also has 8 cavalry and 1 shock unit: expect Steppe rows to lean on off-class placement (horse archers in a ranged row at 0.95).
- **Gauls** have 2 line units and 7 shock units; warbands go into line rows at 0.90. This is intended — a Gallic line is a shock line.
- **S-grade units (7):** Companion Cavalry, Argyraspides, Spartan Hoplites, Wei Wuzu, Libyan Veterans, Punic War Veterans, Armored War Elephants. One per culture for Macedon, Greeks, China, Carthage, Rome, India. **Persia, Steppe and Gauls have no S unit by design** — their identities are numbers, mobility and ferocity; expect them to draft cheap and deep. Armored War Elephants (cost 14) is the only S that isn't line/cavalry; watch it first in the batch.
- **Persia's "Weight of Numbers"** is the only draft-time trait; the elite cap must recompute live.
- **Carthage's "Mercenary Army"** scales *other cultures'* units; with the general counting as Carthaginian, a Hannibal army needs 3 Carthaginian units and gets +5% on the other 5.
- `cost` was hand-authored from historical reputation with the accuracy dial set to "historical first" (§ design plan). Expect the batch to move several units one grade in either direction; that is the process working.
- Rome eligibility rule: any general who commanded in the field before 200 BC. Flamininus (first command 198) is deliberately excluded.

---

## 9. Suggested build order

1. `rng.ts` (seeded, portable) → `data.ts` (load + validate JSON, derive grade from cost) → `draft.ts` (board, picks, rerolls, run string) → `prepare.ts` (§4) → `resolve.ts` (§5) → `recap.ts` → `batch.ts` (§6).
2. Write `resolve.ts` tests against three hand-checkable fixtures: pike wall vs. cavalry-heavy on plains (pikes should win ~70%), horse archers vs. slow heavy infantry on plains (horse archers ~65%), elephants vs. javelin-heavy skirmish army (skirmishers ~60%).
3. Run the batch; tune `rules.json` and unit `cost` only. Do not touch formulas until costs are exhausted as a lever.
