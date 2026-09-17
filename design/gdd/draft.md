# Draft — Design Document

---
**Status**: Reverse-Documented, with a decided redesign (§3.B) not yet implemented
**Source**: `packages/engine/src/draft.ts`, `src/batch/drafters.ts`; data `rules.json` (`slots`, `cardsPerRow`, `onClassCardsPerRow`, `draftRarity`, `rerolls`, `homeCultureTilt`, `generalPool`, `eliteCap`, `traitThresholds`); client `apps/web/src/lib/draftRules.ts`
**Date**: 2026-09-16
**Verified By**: designer (intent questions answered 2026-09-16; draft approved)
**Implementation Status**: Current board fully implemented; target board is design direction only
---

> **Reverse-Documentation Notice**
>
> Created after the implementation existed. §3.A is what the code does today. §3.B is the direction the
> designer chose on 2026-09-16 and is **not built**. Plain-language companion: `docs/MECHANICS.md` §4.

## Summary

The draft is where a run's army is made: pick one of three generals, then take one unit from each of eight
rows of four cards, with two rerolls and a cap on elite units. Units carry a culture, and enough of one
culture switches on that culture's trait. The draft is deterministic from one seed, so everyone playing the
daily sees the same board and a run can be replayed from a short string.

> **Quick reference** — Layer: `Core` · Priority: `MVP` · Key deps: `Units & Generals`, `Deployment` (bots' default line) · Input: a seed, supplied by `Campaign` · Consumed by: `Army Preparation`, `Campaign`

---

## 1. Overview

**Purpose.** Give the player eight meaningful picks that produce an army with an identity, from a board
everyone shares, with no hidden state.

**Scope.** General pool and pick; board generation; picks, unpicks and rerolls; the elite cap; culture counts
and trait levels; draft validation; run strings and replay; the two AI drafters. Excluded: what traits do
(Army Preparation); the plan and deployment (Deployment), though the draft state carries fields for both.

**Current implementation.** Immutable `DraftState` transitions: `startDraft`, `pickGeneral`, `rerollRow`,
`pickCard`, `unpickRow`, `setPlan`, `setDeployment`; views `summarize`, `validateDraft`, `toArmy`;
serialisation `toRunString`, `parseRunString`, `replayDraft`. One mulberry32 stream from `draftSeed`; the
stream state is stored so rerolls resume it.

**Design intent (clarified 2026-09-16).**
- The current board is **too prescriptive**. Eight typed rows decide the army's shape for the player, and
  single-culture rows make culture something that happens to you. Both are to change (§3.B).
- **Culture should be a choice inside every row**: cards in a row come from any culture, so taking the
  Roman card over the better Persian one is the decision.
- **Level I traits are a build-around**: a player who chases a culture should usually get there. **Level II
  is a rare treat.**
- **SUPPLY is the army-building stat**, graded: higher SUPPLY nudges the cards toward better grades a
  little, and 80 or more grants a third elite.
- **The elite cap is the only hard constraint for now.** A per-grade budget (so many S, so many A, so many
  B), possibly raised by SUPPLY, is a future option, not current scope.

---

## 2. Player Fantasy

You are raising an army from what the world offers this morning. Every row is a small dilemma: the best
card, the card that fits your general's people, or the card your line is missing. By the fourth pick the
army has a character, a Roman core with Numidian horse, and the last picks are about finishing it. The
board is the same for everyone today, so your army is an argument you can compare with your friends'.

---

## 3. Detailed Rules

### 3.A Current behaviour (implemented)

**General pool**
1. `generalPool` (3) distinct generals are drawn uniformly from all 81.
2. The player picks one. The board is generated at that moment, because it depends on the general's culture.

**Board**
3. Eight rows, slot types in fixed order: line, line, shock, cavalry, cavalry, ranged, ranged, flex.
4. Each row has **one culture**: with probability `homeCultureTilt` (0.30) the general's culture, otherwise
   uniform over the other eight.
5. Each row shows `cardsPerRow` (4) cards from that culture: `onClassCardsPerRow` (3) on-class units and one
   off-class unit that is legal in the slot, each drawn without replacement weighted by grade rarity
   (S 0.05, A 0.15, B 0.30, C 0.30, D 0.15, F 0.05). If a pool runs short the row is filled from the other
   pool (a cavalry row has no legal off-class card, so it shows four cavalry). Cards are then shuffled.
6. On-class: a flex row accepts anything; a ranged row accepts ranged and skirmish; otherwise class = slot.
7. Each card records a slot penalty and a wrecked flag from the v1 model. The fronts resolver and the web UI
   ignore both; the greedy AI drafter still uses them.

**Picking**
8. One card per row, in any order. A pick can be changed (`unpickRow`, then pick again).
9. **Elite cap.** At most `eliteCap.base` (2) units of grade A or S; `withLogistics` (3) if the general's
   SUPPLY ≥ `logisticsThreshold` (80); plus any `eliteSlots` from an active culture trait (Persia +1). A pick
   that would exceed the cap is refused.
10. **Rerolls.** `rerolls` (2) per run. A reroll redraws one row that has no pick yet, including its culture,
    from the stored RNG state. Rerolls are logged in order because each consumes RNG draws.

**Cultures and traits**
11. Culture counts = picked units per culture, plus one for the general's culture.
12. Trait level: count ≥ 4 → I; count ≥ 6 → II.

**Completion**
13. A draft is valid when a general is picked, all eight rows have a pick, a plan is set, and the elite cap
    holds. `toArmy` refuses an invalid draft. (The web client fills the plan with the general's doctrine for
    validation; the real plan is chosen per battle.)

**Run strings**
14. `v=<dataVersion>&d=<seed>&g=<generalIndex>&p=<pick per row>&r=<reroll log>&plan=<plan>[&dep=<LCR×8>]`.
    `replayDraft` rebuilds the state and refuses a string from a different data version.

**AI drafters**
15. *Random*: uniform legal picks, random plan, no rerolls. Measures units, not skill.
16. *Greedy* (the campaign's foes): values a card at `cost × penalty`, −6 if wrecked, +2.5 if it completes a
    trait threshold, +1 if one short; rerolls its weakest unpicked row while that row's best is below 7;
    picks the globally best legal card repeatedly; frees an elite slot by swapping when a row is all-elite;
    plan = its general's doctrine.

**Measured reach today** (3,000 greedy drafts): any trait 52%, level II 8%, combined arms 97%, median army
cost 70 (5th–95th percentile 64–76).

### 3.B Target design (decided 2026-09-16, not implemented)

1. **Board shape:** `slots = [line, line, cavalry, ranged, flex, flex, flex, flex]`. The four typed rows
   guarantee every player is offered a center, a wing and a shooter; the four flex rows are where the army's
   identity, and combined arms, are decided.
2. **Mixed-culture rows:** each card draws its culture independently: with probability `homeCultureTilt` the
   general's culture, otherwise uniform over the rest. A row no longer has a culture. A typed row still
   draws mostly on-class units; a flex row draws any class.
3. **Trait reach targets** (to be hit by tuning `homeCultureTilt`, `traitThresholds` and card counts):
   a drafter that chases its general's culture reaches level I in about 60–70% of drafts; level II appears
   in under about 10% of all armies.
4. **SUPPLY, graded, both levers kept and jointly capped:** the general's SUPPLY shifts grade rarity slightly
   toward better cards (a small, linear nudge, e.g. up to +20% relative weight on A and S at SUPPLY 100, none
   at SUPPLY 50), and SUPPLY ≥ 80 still grants the third elite. The cross-review flagged this as a double dip
   with no downside (the third elite alone measures about +9 win-rate points). Decision: keep both, under
   **one joint limit** — a SUPPLY-100 general's armies win no more than about 5 points more than a SUPPLY-50
   general's, generals otherwise equal. Whatever advantage remains is priced by the ladder's general
   handicap, which is based on measured win rate (Campaign §3.4).
5. **Rerolls:** two per run, plus **one extra rewarded reroll open to every player, including on the daily**.
   Because everyone has the same access, the game is balanced around three. (Game concept anti-pillar:
   power is never for sale; anything that affects the ranked daily is open to all on equal terms.)
6. **Constraint:** the elite cap stays as the only hard limit. Future option, out of scope: a per-grade budget
   (N of S, N of A, N of B …) that SUPPLY can raise.
7. **Consequences to handle when built:** row headers and the "row culture" UI go away; `consequenceLine`,
   `cultureTallies` and the row reading hints in the client assume a row culture; the greedy drafter must drop
   slot penalties; every existing run string becomes unreplayable, so `dataVersion` must bump and old
   versions' data must stay served.

### States

| State | Entry | Exit | Behaviour |
|---|---|---|---|
| Pool | `startDraft` | general picked | three generals shown; no board yet |
| Drafting | general picked | all rows picked | pick, unpick, reroll (unpicked rows only) |
| Complete | 8 picks, cap holds | — | `toArmy` succeeds once a plan is set |

---

## 4. Formulas

### 4.1 Elite cap

```
cap = (SUPPLY ≥ 80 ? 3 : 2) + Σ eliteSlots of active traits
```

24 of 81 generals have SUPPLY ≥ 80. Persia at level I or II adds 1, so a Persian army under a SUPPLY-80
general may hold 4 elites.

### 4.2 Card draw weight

```
P(card) ∝ draftRarity[grade]        S 0.05, A 0.15, B 0.30, C 0.30, D 0.15, F 0.05
```

Sampling is without replacement within the row's culture and class pool, so a small pool (Steppe shock: one
unit) distorts the odds and triggers the fill rule.

### 4.3 Home-culture reach (current board)

```
E[home rows] = 8 × 0.30 = 2.4;  P(level I needs ≥ 3 home rows) ≈ 45% before rerolls and off-culture fills
```

Matches the measured 52% "any trait" rate once other cultures and rerolls are counted.

### 4.4 Greedy card value (AI)

```
v = cost × penalty − (wrecked ? 6 : 0) + (completes a threshold ? 2.5 : one short ? 1 : 0)
```

---

## 5. Edge Cases

| Scenario | Behaviour | Note |
|---|---|---|
| Row pool too small | Filled from the other pool; may show 4 on-class or several off-class cards | Steppe shock, any cavalry row |
| Every card in a row is elite and the cap is full | Player is stuck unless they unpick an earlier elite; the UI shows "ELITE CAP FULL — DROP ONE TO TAKE THIS"; bots swap automatically | |
| Reroll a picked row | Refused. Unpicking the row first makes it rerollable again | `rerollRow`, `unpickRow` |
| Reroll with none left | Throws | UI disables the button |
| Reroll order | Two players who reroll the same rows in a different order get different boards | logged in the run string |
| Same unit offered in two rows | Allowed; an army may hold duplicates | |
| General's culture with few generals | Steppe has 3 generals, India 4: those home cultures are rarely played | see Units & Generals |
| Off-culture card in a row | Only via the fill rule; counts toward its own culture | client handles it in `consequenceLine` |
| Draft edited after a battle | Allowed by the client; past results are recomputed from the new army | ⚠ defect, see Campaign §5 |
| Run string from another data version | `replayDraft` throws | old data must stay served |
| Persia trait lost by unpicking | Cap falls by 1; `validateDraft` reports the excess elite | |

---

## 6. Dependencies

**Depends on**
- **Units & Generals**: the roster, grades, classes, cultures; all draft rules data.
- **Deployment**: bots receive the default deployment via `withDeployment`.

*Input, not a dependency:* the draft takes a **seed** as a parameter. Campaign supplies it (daily date or free
seed) and persists the resulting `DraftState`, but Draft needs nothing else from Campaign, so there is no
cycle. What a trait level is *worth* is defined in Army Preparation; Draft only counts cultures and levels.

**Depended on by**
- **Army Preparation**: `cultureCounts`, `traitLevel`, `slotPenalty` (v1 only).
- **Campaign**: foes are greedy drafts stored as run strings; the player's army comes from `toArmy`.
- **Draft screens** (`general`, `draft/[row]`, `draft/board`): consequence lines, culture tallies, elite counter.
- **Verification (Phase B)**: the server replays run strings with the granted reroll count.

---

## 7. Tuning Knobs

| Knob | Current | Affects | Safe range | Notes |
|---|---|---|---|---|
| `slots` | L L S C C R R F | how prescribed the army's shape is | **L L C R F F F F** | ⚠ decided |
| Row culture model | one culture per row | whether culture is a choice | **per-card culture** | ⚠ decided |
| `homeCultureTilt` | 0.30 per row | trait reach | 0.15–0.35 per card | re-tune to the §3.B targets |
| `traitThresholds` | [4, 6] | trait reach | [3–4, 5–6] | level II must stay rare. Shared with Army Preparation; Draft owns it |
| `cardsPerRow` | 4 | choice per pick | 3–5 | phone layout fits 4 |
| `onClassCardsPerRow` | 3 | how often a typed row tempts you off-class | 2–4 | |
| `draftRarity` | 5/15/30/30/15/5 | how often elites appear | — | ⚠ SUPPLY to shift this slightly |
| SUPPLY rarity nudge | none | value of SUPPLY below 80 | 0–25% relative on A/S | ⚠ decided, curve open |
| `eliteCap` | 2, or 3 at SUPPLY ≥ 80 | army ceiling | 2–3 | |
| `rerolls` | 2 | variance control | 1–3 | verified play may grant more |
| `generalPool` | 3 | general choice | 3–4 | |
| Greedy thresholds | reroll below 7; +2.5 / +1 culture bonus | foe army quality | — | foe strength lever for Campaign |

---

## 8. Acceptance Criteria

**Verified by existing tests** (`packages/engine/test/draft.test.ts`)
- ✅ Three distinct generals are offered.
- ✅ Eight typed rows of four legal cards, no duplicates within a row.
- ✅ The elite cap is enforced on pick.
- ✅ Only unpicked rows can be rerolled, and rerolls are consumed.
- ✅ A run string replays the exact same army and battle.
- ✅ Both drafters produce valid armies over many seeds.

**Not covered by any test**
- ❌ The SUPPLY ≥ 80 third elite and Persia's extra elite slot.
- ❌ The fill rule when a culture's pool is short.
- ❌ Reroll order changes the board (two orders, two boards).
- ❌ `replayDraft` refuses a run string from another data version.

**Batch targets for the target design**
- [ ] A culture-chasing drafter reaches level I in 60–70% of drafts.
- [ ] Level II appears in under 10% of all greedy armies.
- [ ] Combined arms is active on roughly 25–45% of greedy armies (today 97%).
- [ ] No single draft heuristic (cost-only, culture-chase, elite-first) beats the others by more than 5 points.
- [ ] Fewer than 2% of boards leave a player unable to field at least two Center-class units and one wing unit.
- [ ] SUPPLY joint cap: a SUPPLY-100 general's armies win no more than about 5 points more than a SUPPLY-50
  general's, other general stats equal, with the rarity nudge **and** the third elite both active.
- [ ] The third reroll's value on the new board is measured, and costs are tuned with three rerolls as the
  baseline (today the first two are worth about 1 point each and a third about 0).
- [ ] **Gate:** "no single draft heuristic beats the others by more than 5 points" must pass before the
  redesign ships. The cross-review expects "take the highest grade, fill elites first" to stay dominant
  unless the culture pull is strong enough; if it fails, revisit the per-grade budget (§9).

**Definition of done for the redesign**
- [ ] `rules.slots` and board generation changed; `dataVersion` bumped; v2 data still served.
- [ ] Greedy drafter no longer reads slot penalties.
- [ ] Client row UI reworked for rows without a culture.
- [ ] Rules and Numbers pages updated.

---

## 9. Open Questions and Follow-Up Work

### Decided 2026-09-16
1. Board shape 2 line / 1 cavalry / 1 ranged / 4 flex.
2. Mixed-culture rows, culture drawn per card.
3. Level I buildable, level II rare (targets in §3.B).
4. SUPPLY graded: slight rarity nudge, third elite at 80+.
5. Elite cap only, for now; per-grade budget is a future option.
6. SUPPLY keeps both levers under one joint win-rate cap; the ladder handicap prices the remainder.
7. One extra rewarded reroll, open to everyone including the daily; balance around three.

### Open
6. **How does a flex row draw?** Uniform over all classes would flood the board with line and cavalry (the
   biggest pools). Options: class-balanced weights, or weight toward what the army lacks.
7. **Does a typed row still show one off-class card?** With four flex rows the temptation card may be redundant.
8. **Should duplicates be allowed** once rows are mixed-culture? The chance of the same unit in two rows rises.
9. **Foe drafts.** The greedy bot drafts on the same board rules; the new board changes foe strength. Re-measure
   the campaign's per-battle win rates after the change.

### Deferred
10. Slot penalties and the wrecked flag: remove from cards and from the greedy drafter, or keep for v1 comparison.

### Flagged follow-up work
- [ ] Prototype the target board in the batch tool before touching the client: measure the six targets in §8.
- [ ] Use `/quick-design` or `/design-system draft` to turn §3.B into an implementable spec once measured.

---

## 10. Version History

| Date | Author | Changes |
|---|---|---|
| 2026-09-16 | Claude (reverse-doc) | Initial reverse-documentation from `packages/engine/src/draft.ts`; redesign direction (board shape, mixed-culture rows, trait reach, graded SUPPLY) recorded from the designer |
| 2026-09-16 | designer + Claude | Cross-review fixes: dependency direction, seed as an input, shared knob note. Decisions: SUPPLY joint cap, rewarded reroll for everyone, draft-heuristic target made a gate |
