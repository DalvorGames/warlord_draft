# Traits — Design Document

> **Status**: In Design (proposal; sizes measured, nothing shipped)
> **Author**: designer, with Claude
> **Last Updated**: 2026-09-16
> **Implements Pillars**: 1 (every choice is a tradeoff), 3 (battles are explainable), 5 (historical first)
> **Replaces**: culture traits as built (Army Preparation §3), the general `style` and the doctrine bonus
> **Evidence**: `docs/reviews/2026-09-16-measurements.md`; scripts `packages/engine/src/cli/lab/traits.ts`, `trait_combos.ts`; sizes in `trait_pool.ts`

## Summary

One shared pool of fifteen traits gives both generals and cultures their character. A trait is a word and a
sentence. A general carries zero to three of them; a culture grants its one trait when you draft four of its
units, and a second level at six. The same trait from different sources stacks, up to level III. Players
learn fifteen words once and meet them everywhere. The general's style label and the doctrine bonus go away.

> **Quick reference** — Layer: `Core` · Priority: `MVP` · Key deps: `Units & Generals`, `Army Preparation`, `Battle Resolution`, `Draft` · Consumed by: `Campaign` (handicap), every run screen

---

## 1. Overview

**Purpose.** Make generals and cultures differ in *how you play*, not only in how big their numbers are, using
one small vocabulary the daily-puzzle player can hold in their head.

**Why now.** Measured on 2026-09-16: the four general stats are so correlated that generals act as one number,
and softening COMMAND barely shrinks the resulting lottery (win rates 23–83% today, 26–79% fully softened).
Culture traits today are passive multipliers, several of them the same one (India and Gauls both contact +8%;
China and Steppe both skirmish +20–25%), worth anything from −2 to +8 points at level I. And the doctrine
bonus made the plan a lookup.

**Scope.** The trait pool; how generals and cultures acquire traits; levels and stacking; sizes; the engine
hooks. Excluded: which of the 81 generals gets which traits beyond the examples here (content work); the
general stats themselves (kept, flatter; Units & Generals); the ladder handicap (Campaign §3.4).

**Decisions taken by the designer, 2026-09-16.**
- Generals **keep their four stats** and gain traits on top. Stats say how good; traits say how he plays.
- **Greater generals have more traits** (up to three), lesser ones fewer or none.
- **Doctrine goes**: the `style` label and the matching bonus are deleted. A general's traits tell the player
  how to fight with him, in words. The per-battle plan picker stays for now and is judged after Defensive is
  fixed; if it still measures as a formality, it goes too.
- **Each culture has its own trait** from the pool; two cultures may share one only where history insists.
- **The same trait stacks to level III** (general + culture at four + culture at six).
- **Reserves become real**: they help guard a flanked front and step in as the line thins. Deep ranks is built
  on that idea.
- Fifteen traits.

---

## 2. Player Fantasy

Hannibal is not a bigger Flaminius. He is the general whose wings close like a trap, who knows where you are
heaviest before you deploy, and whose men fight in the hills as if they were plains. Rome is not "cohesion
+10%": it is the army whose fresh ranks keep stepping up. The player reads three words on a general's card
and knows what kind of battle to fight; reads one word on the enemy's and knows what to fear. When a trait
decides a battle, the report says so by name.

---

## 3. Detailed Rules

### 3.1 The pool

Eleven **scaling** traits have levels I–III and stack. Four **rule** traits are on or off and are carried by
generals only, so stacking never arises for them.

| # | Trait | Kind | What the player is told | Culture | Generals who fit (in the roster) |
|---|---|---|---|---|---|
| 1 | Deep ranks | scaling | Fresh ranks step up: your fronts recover a little each round | Rome | Camillus, Scipio Africanus, Philip II |
| 2 | Steady | scaling | Your fronts take more punishment before they break | Greece | Agesilaus, Chabrias, Fabius Cunctator, Lian Po |
| 3 | Hammer and anvil | scaling | A wing of yours that breaks its opponent wheels into his center harder | Macedon | Alexander, Parmenion, Craterus |
| 4 | Numbers | scaling | Weight of numbers counts for more in the press | Persia | Darius III, Artaxerxes II, Chandragupta |
| 5 | Mercenary captain | scaling | Units from outside your general's culture fight better | Carthage | Hamilcar, Xanthippus, Eumenes, Memnon |
| 6 | Volley | scaling | Your center shoots harder | China | Wu Qi, Meng Tian, Iphicrates |
| 7 | Harass | scaling | Your wings win the missile exchange more heavily | Steppe | Ateas, Spitamenes, King Wuling, Li Mu |
| 8 | Terror | scaling | Fronts that lose the clash to you shake sooner and fight worse for it | India | Porus, Pyrrhus, Antiochus III |
| 9 | Furor | scaling | You hit harder at the clash, and a little weaker every round after | Gauls | both Brennuses, Viridomarus, Pelopidas |
| 10 | Envelopment | scaling | Your wings press harder | — | Hannibal, Han Xin, Bai Qi, Philopoemen, Claudius Nero |
| 11 | Oblique order | scaling | Your most heavily loaded front hits harder at the clash | — | Epaminondas, Pelopidas, Alexander |
| 12 | Delayer | rule | None of your fronts can break before the second round | — | Fabius Cunctator, Memnon, Lian Po |
| 13 | Rally | rule | The first of your fronts to break holds for one more stage | — | Alexander, Pyrrhus, Marcellus, Xiang Yu |
| 14 | Master of ground | rule | Ground penalties on your units are halved | — | Hannibal, Tian Dan, Timoleon |
| 15 | Scouts | rule | Before you deploy, you are told which of his fronts is heaviest | — | Hannibal, Sun Bin, Xenophon, Scipio Africanus |

### 3.2 Acquiring traits

1. A **general** has 0–3 traits, fixed in the data. At most one is a rule trait unless he is among the very
   greatest. Each of a general's scaling traits counts as one level.
2. A **culture** grants its trait at **four** units of that culture (one level) and again at **six** (a second
   level). The general still counts as one unit of his culture. Level II is the same effect, stronger; it
   never adds a new rule.
3. **Stacking:** levels of the same scaling trait from all sources add, capped at **III**. Fabius (Steady)
   leading six Greeks fields Steady III. Rule traits do not stack; a second copy does nothing.
4. Different traits simply all apply.
5. A famous general may also carry a **flaw**, a trait that hurts (e.g. *Rash*, *Far from home*). Optional,
   later; Furor, with its built-in price, is the model.

### 3.3 What the player sees

6. General card: up to three trait words with their one-line text. Culture tally: the trait word and the
   count toward it. Enemy card at deploy: his trait words. Level shown as a numeral: *Steady II*.
7. Percentages are **not** shown on cards. The measured sizes are small numbers (cohesion +4%) that undersell
   a trait worth four points of win rate. The Numbers page lists them.
8. **Every trait that mattered in a battle is named in the report** at the beat where it acted ("Fresh ranks
   step up on the left: Rome's line recovers"). A trait that cannot produce such a sentence is too abstract to
   keep.
9. The player only ever needs two in mind: their own (chosen) and the foe's (printed on his card).

### 3.4 Removed

10. `General.style`, `rules.styleToPlan`, `rules.styleMatchBonus`, and the "brings X doctrine" report line.
11. Culture trait definitions in `cultures.json` (`level1`, `level2`) are replaced by one trait id per culture.
12. Persia's extra elite slot goes with its old trait. (SUPPLY still governs elites; Draft §3.B.)

---

## 4. Formulas

Sizes were found by search: for each trait and level, the magnitude that lifts win rate by the target over
3,000 paired battles (same armies, ground and seed, with and without the trait; bot-drafted armies, default
lines, today's culture traits and doctrine bonus off). Targets: **+4 / +8 / +12 points** at levels I / II /
III, chosen so that depth matches breadth (§4.3).

### 4.1 Scaling traits

| Trait | Engine hook | Level I | Level II | Level III | Measured lift |
|---|---|---|---|---|---|
| Deep ranks | each unbroken front sheds this fraction of its cohesion in damage after each press round | 1.0% | 2.0% | 2.9% | +4.0 / +8.0 / +12.0 |
| Steady | cohesion multiplier | ×1.04 | ×1.075 | ×1.12 | +4.2 / +8.0 / +12.5 |
| Hammer and anvil | roll-up impact and roll-up damage | ×1.8 | ×3.3 | ×5 | +3.9 / +8.0 / **+8.7** |
| Numbers | added to the press numbers exponent (base 0.30) | +0.03 | +0.06 | +0.10 | +3.8 / +7.5 / +12.1 |
| Mercenary captain | FIGHT of units not of the general's culture | ×1.12 | ×1.25 | ×1.42 | +4.0 / +8.2 / +11.9 |
| Volley | center shooting strength (base 0.50) | 0.68 | 0.92 | 1.39 | +4.0 / +8.0 / +12.0 |
| Harass | wing shooting | ×1.25 | ×1.62 | ×2.29 | +4.0 / +8.0 / +12.0 |
| Terror | enemy shaken above edge 0.15 (base 0.25), and his shaken units fight at | ×0.84 | ×0.70 | ×0.59 (base ×0.90) | +3.8 / +8.2 / +11.8 |
| Furor | contact multiplier, with press scores losing this much per round (floored at half) | ×1.06, −1.5% | ×1.17, −4.2% | ×1.51, −12.7% | +4.0 / +8.1 / +12.1 |
| Envelopment | wing press | ×1.10 | ×1.22 | ×1.38 | +4.1 / +7.8 / +12.0 |
| Oblique order | contact on the single most heavily loaded front (no bonus on a tie) | ×1.08 | ×1.16 | ×1.28 | +4.2 / +7.8 / +11.9 |

### 4.2 Rule traits

| Trait | Engine hook | Measured lift |
|---|---|---|
| Delayer | no front breaks before press round 2 (damage still accrues) | +9.0 (round 1 only: +3.2; round 3: +15.6) |
| Rally | the first front that would break does not; it holds with its cohesion fully spent until damaged again | +11.9 (this is the floor: restoring any cohesion is stronger still) |
| Master of ground | 50% of every ground penalty removed; bonuses untouched | +9.4 (22% → +4, 41% → +8, 70% → +12) |
| Scouts | none: information for the player | not measurable with fixed lines |

A rule trait is worth roughly a level II–III scaling trait, which fits their being reserved for great generals.

### 4.3 How traits combine (measured)

| Army A carries | Lift |
|---|---|
| One-trait general: Steady I | +4.2 |
| Two-trait general: Steady I + Delayer (a Fabius) | +12.3 |
| Three-trait general: Envelopment I + Master of ground + Scouts (a Hannibal) | +13.0 |
| Three-trait general: Oblique order I + Hammer and anvil I + Rally (an Alexander) | +19.0 |
| **Depth**, culture at 4 + matching general: Steady II | +8.0 |
| **Breadth**, culture at 4 + different general trait: Steady I + Envelopment I | +8.5 |
| **Depth**, culture at 6 + matching general: Steady III | +12.5 |
| **Breadth**, culture at 6 + different general: Steady II + Envelopment I | +12.2 |
| The ceiling: Steady III + Envelopment I + Rally | +25.2 |

Lifts add almost linearly. With levels sized 4 / 8 / 12, matching your general's culture (depth) and mixing
(breadth) are worth the same, so the choice is about the board, not the arithmetic. (An earlier sizing of
4 / 7 / 10 made breadth better by a point.)

Trait against trait at level I, both sides carrying one: every pairing tested lands within 2 points of even
(49.9–53.1% against a 51.2% baseline). No trait counters another hard.

### 4.4 What this does to the general lottery

A traitless general sits at the baseline; the best three-trait general is about +19. With flatter stats, the
spread between generals comes mostly from traits, which the player can read, rather than from four correlated
numbers they cannot. The ladder handicap (Campaign §3.4) should be the general's **measured win rate**, not
his trait count, because a rule trait is worth two scaling ones.

---

## 5. Edge Cases

| Scenario | Behaviour |
|---|---|
| General trait and culture trait are the same | Levels add, capped at III |
| Two cultures at four units each | Both traits apply at level I |
| Rule trait from two sources | Cannot happen: cultures never grant rule traits |
| Oblique order with a tied heaviest front (3 / 3 / 2) | No bonus. The trait rewards committing to an uneven line |
| Oblique order with everything in the center | Center is heaviest and gets the bonus, but both wings are empty and give way; still a losing line |
| Mercenary captain with an all-home-culture army | No units qualify; the trait does nothing. Carthage's own culture trait therefore rewards *not* going all-Carthaginian beyond four |
| Furor in a long battle | By press round 4 at level III, press scores are at the 50% floor. Win by round two or lose |
| Delayer and an empty front | An empty front still gives way at contact; Delayer protects manned fronts only |
| Delayer and rout | Fronts cannot break early, but army morale still rises with damage; a rout before round 2 remains possible in principle (not measured) |
| Rally on the center when the general would fall | The center holds, so the general does not fall at that moment |
| Rally and Delayer together | Delayer acts first; Rally is kept for the first real break |
| Terror against "never shaken" or pikes that ignore shaken | Those fronts are not shaken; Terror does nothing to them |
| Master of ground on plains | No penalties exist on plains; no effect |
| Volley with no shooters in the center | No effect. The trait asks you to put archers in the line |
| Scouts when two enemy fronts tie for heaviest | The player is told it is a tie between those two |
| Scouts against the seeded AI line (Deployment §9.1) | Still one true fact about the line actually chosen |
| Trait levels above III | Capped; extra levels are lost |

---

## 6. Dependencies

**Depends on**
- **Units & Generals**: generals gain a `traits` list; cultures gain a `trait` id; `style` is removed.
- **Army Preparation**: applies trait entries to the prepared army (the hooks exist; §7).
- **Battle Resolution**: consumes the hooks (center and wing shooting, shaken edge and multiplier, press decay,
  numbers exponent, relief, roll-up damage, rally, no-break-before, heaviest-front contact).
- **Draft**: culture counting and thresholds (4 and 6) are unchanged and owned there.

**Depended on by**
- **Campaign**: the handicap is measured from generals as they play with their traits.
- **Deployment**: Scouts changes what the Deploy screen shows; Oblique order and Volley change what a good line is.
- **Battle Report**: must name traits when they act.
- **General, Draft, Deploy, Rules and Numbers screens**: trait words and text.

Army Preparation, Battle Resolution, Units & Generals and Draft must list Traits in return when this proposal
is accepted.

---

## 7. Tuning Knobs

| Knob | Current proposal | Affects | Safe range | Notes |
|---|---|---|---|---|
| Level targets | +4 / +8 / +12 points | how much a trait matters | I: 3–5; keep II = 2 × I and III = 3 × I | equal steps keep depth equal to breadth |
| Per-trait magnitudes | §4.1 | each trait's lift | re-run `traits.ts` after any resolver change | sizes are only valid for the rules they were measured under |
| Max traits per general | 3 | general spread | 2–3 | the greatest general gets three, never four |
| Max level | III | ceiling of a matched army | III | |
| Culture thresholds | 4 and 6 (Draft) | trait reach | see Draft §7 | |
| Delayer round | 2 | +9 | 1 (+3) to 3 (+16) | |
| Master of ground fraction | 50% | +9 | 22% (+4) to 70% (+12) | "halved" is the clean sentence |
| Rally | hold one more stage | +12 | — | cannot be made weaker without changing the rule (e.g. wings only) |
| Hammer and anvil level III | ×5 | +8.7 | — | cannot reach +12: roll-ups happen in only some battles. Accept, or add "wheels in the same round" |

**Engine status.** All hooks exist in `types.ts` (`TraitEntry`), `prepare.ts` and `resolveFronts.ts`, neutral by
default; `Army.extraTraits` carries a general's entries. No shipped data uses them: tests pass and a reference
battle is numerically identical to before. Lab data: `packages/engine/src/cli/lab/trait_pool.ts`.

---

## 8. Acceptance Criteria

**Measured 2026-09-16**
- ✅ Every scaling trait can be sized to +4 / +8 / +12 within 0.5 points, except Hammer and anvil III (+8.7).
- ✅ Depth and breadth are within a point of each other at both culture thresholds.
- ✅ No tested trait-versus-trait pairing strays more than 2 points from the baseline.
- ✅ Adding the hooks changes no existing battle (25 tests pass; reference battle identical).

**To verify when built**
- [ ] Each of the nine cultures' traits lifts a culture-committed army by 3–5 points at four units, measured
  through the draft rather than injected (today's traits range from −2 to +8).
- [ ] General win rates, with flatter stats and traits assigned, span no more than about 35–70%, and the
  handicap (measured win rate) is published per data version.
- [ ] A bot that always picks the general with the most traits does not beat a bot that picks by fit with the
  board by more than 5 points once the handicap is in the ranking.
- [ ] Every trait that alters a contest produces a sentence in the battle report.
- [ ] The Rules page states each trait in one sentence, and no trait is described that the engine lacks.
- [ ] Scouts: a player told the heaviest front wins no more than about 5 points more than one who is not.
- [ ] Unit tests for every hook (one per `TraitEntry` kind), including stacking to III and the cap.

---

## 9. Open Questions and Follow-Up Work

### Open
1. **Assigning traits to 81 generals.** Proposal: the ~20 famous names get two or three; about 35 get one;
   the rest none. A traitless general with decent stats is a legitimate low-handicap pick. Content work.
2. **Flattening the stats.** How far? Traits now carry identity, so ranges could narrow (say 55–85) and the
   COMMAND–TACTICS correlation (0.78) should be broken up. Measure with `command_sweep.ts` after assignment.
3. **Rally is strong (+12) and cannot be dialled down.** Options: keep it as the rarest trait; restrict it to
   wings; or make the rallied front fight shaken.
4. **Hammer and anvil cannot reach level III's target.** Accept +8.7, or let a free wing wheel in the same
   round it breaks through, which also makes Macedon feel faster.
5. **Real reserves.** Deep ranks is implemented as per-round recovery, which always applies. The designer's
   fuller idea (reserves guard a flank and step in as the line thins) is a Battle Resolution change of its
   own; the old frontage rule barely ever bites (a frontage trait measured at +1.5 at most). Design it, then
   re-size Deep ranks and revisit Numbers.
6. **Does the plan picker survive?** Decide after Defensive is strengthened and the doctrine bonus is gone.
7. **Sizes were measured with default lines and bot armies.** Oblique order and Volley depend on the line the
   player chooses; their real value in human hands will differ. Re-measure with the reasoning-player bot.
8. **A sixteenth trait?** "Center press hits harder" is the honest filler if one is needed; it was left out
   for having no character.

### Deliberately left out
- *Quartermaster* (a third elite): SUPPLY already does this and is already a flagged double dip.
- *Inspiring*, *Tactician*: these are CHARISMA and TACTICS, which stay as stats.
- *Unshakeable*: measured at only +2.8; too weak to be a rule trait.

### Flagged follow-up work
- [ ] Data: `traits` on generals, `trait` on cultures; remove `style`, `styleToPlan`, `styleMatchBonus`. Bump
  `dataVersion`.
- [ ] Client: trait words on general, enemy and tally UI; remove doctrine copy.
- [ ] `beats.ts`: a sentence per trait.
- [ ] Update Army Preparation, Battle Resolution, Units & Generals, Draft and the game concept when accepted.

---

## 10. Version History

| Date | Author | Changes |
|---|---|---|
| 2026-09-16 | designer + Claude | Proposal: shared pool of fifteen traits for generals and cultures, stacking to level III, doctrine removed. Engine hooks added (neutral by default). Sizes found by search at +4 / +8 / +12; combinations and trait-versus-trait measured |
