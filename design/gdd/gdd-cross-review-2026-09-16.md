# Cross-GDD Review Report

**Date:** 2026-09-16
**GDDs reviewed:** 6 system docs, plus `game-concept.md` and `systems-index.md`
**Systems covered:** Units & Generals, Draft, Army Preparation, Deployment, Battle Resolution, Campaign
**Method:** `/review-all-gdds`. Phase 2 (consistency) by a `systems-designer` agent, Phase 3 (design holism) by a `game-designer` agent, run in parallel with fresh context; Phase 4 (scenario walkthrough) by the main session. Entity registry was empty, so consistency relied on full reads.
**Pillars:** every choice is a tradeoff; deployment is a hidden-information bet; battles are explainable; one board for everyone; historical first and a stat sim.
**Anti-pillars:** no control during battle; no grind or unlocks; no paying for power.

---

## Verdict: FAIL

Blocking issues exist, of two very different kinds.

- **Consistency: 15 blocking, 10 warnings.** Nearly all are drafting errors from writing six docs in one day: broken section pointers, dependency directions stated backwards, one line left over from before the AI decision changed, and three arithmetic errors. Fixable in one editing pass. None reflects a disagreement about the design.
- **Design theory: 5 blocking.** All five are interactions between decisions recorded in different docs. Most are predictions from the documented maths, not measurements. One combined batch run with every decided change applied would confirm or retire most of them.
- **Scenarios: 1 blocker, 4 warnings, 1 info.**

### Required before re-running

1. Apply the consistency fixes (section "Phase 2" below lists each with the exact edit).
2. Designer decisions needed:
   - **SUPPLY:** one lever or two (third elite at 80, rarity nudge, or both with a joint cap).
   - **Difficulty curve:** general tiers alone are predicted to give a 15–20 point spread against the 25+ wanted; choose a second lever (foe army cost bands, ground correlated with battle index, or weighted general power).
   - **Player-blind AI:** add randomness among near-tied layouts, or accept a learnable AI as a mastery reward, and add an acceptance criterion either way.
   - **CHARGE²:** measure a "stack CHARGE on one front" deployment before shipping anything else; then soften `chargeCurve`, or document it as intended.
   - **Rewarded reroll:** restrict to free campaigns, or re-measure after the draft redesign.
   - **Early breaks:** say whether a front breaking in skirmish plus contact alone is intended.
3. **Decided 2026-09-16 during this review:** raise the per-battle win targets to about **80% / 65% / 55–60%**, giving roughly 29–31% completion. The previous 75 / 60 / 50–55 multiplied to 22.5–24.75%, below the stated 25–35%.
4. Make "all decided changes measured together in one batch run" a gate before any of them ships alone.

---

## GDDs flagged for revision

| GDD | Reason | Type | Priority |
|---|---|---|---|
| battle-resolution.md | Header and §1 point at "§7, Q4" etc.; content is in §9. Quick-ref lists Campaign as a dependency. Missing cohesion-constants knob row. CHARGE² never assessed. Early-break edge case missing. Events not required to be narrated | Consistency + Design | Blocking |
| deployment.md | Quick-ref lists Campaign as a dependency. §9.6 still says "after the AI is weakened". No criterion protects the player-blind AI from a player who learns its procedure. "Default ≤ 60%" target may pass vacuously | Consistency + Design | Blocking |
| draft.md | §6 lists Army Preparation on both sides. SUPPLY double dip. "Take the best card" risk unmeasured on the new board. Reroll value changes under the redesign | Consistency + Design | Blocking |
| army-preparation.md | §4.1 range 0.85–1.75 contradicted by its own 1.86 example (true ceiling about 2.0). Stat overflow worst case understated. Plan target of 75% sits on Pillar 1's own violation line | Consistency + Design | Blocking |
| campaign.md | §4.2 loser casualties "12–80%" (formula maximum is 62%). §4.1 completion arithmetic below target (resolved: targets raised). Difficulty levers conflict with COMMAND softening and random ground. "Foe ≠ player's general" breaks the shared board as written | Consistency + Design | Blocking |
| systems-index.md | Dependency map contradicts its own table for Draft. Draft↔Campaign cycle undocumented | Consistency | Blocking |
| units-and-generals.md | General-spread target not reconciled with the SUPPLY change | Design | Warning |
| game-concept.md | "Rewarded reroll never buys power" unverified under the redesign. Pillar 3's one-sentence test is met only on the Numbers page, which the primary player does not read. Pillar 4 wording unqualified against the local-date daily | Design | Warning |

---

# Phase 4 — Cross-System Scenario Walkthrough

Scenarios walked: 6.

### 🔴 BLOCKER — Draft edited after a battle (Campaign, Draft, Battle Resolution, Save & History)
1. Player wins battle 1. `giveBattle` resolves from inputs and, if the run ended, writes a history entry once.
2. The draft screens stay reachable. Player changes a pick.
3. `army` recomputes; `resolveAll` recomputes battle 1 from the new army. The result can flip.
4. `score.over` and the live result now disagree with any history entry already written. A lost daily can show as won in the run screens while history says "Fell at battle 1".
**Failure mode:** broken state transition. Inputs-only saves (Pillar 4) are correct; the missing rule is that draft inputs freeze when the first battle is given. No GDD states that rule as a requirement; campaign.md lists it only as a defect.

### ⚠️ WARNING — A battle with an event (Battle Resolution, Battle Report)
8% of battles roll an event. `beats.ts` and the client narrate only elephant rampage. Downpour (skirmish damage ×0.3), The general falls (center cohesion recomputed without charisma, ×0.85), Flank collapses (losing wing takes ×2), and Cavalry pursues off-field (a free wing leaves instead of rolling up) change outcomes with no line in the report. "The general falls" also shares a name with the end-of-battle `generalFell` flag, which means something different (center broke and battle lost). Pillar 3 violation; battle-resolution.md §3.8 defines the events and never requires them to be told.

### ⚠️ WARNING — Foe tiering plus "foe is not the player's general" (Campaign, Draft)
campaign.md §3.6.13 says a foe should not be the player's general. Foes are derived from the seed at campaign start, before the player picks. Making foes depend on the pick gives different players different foes and breaks Pillar 4. **Option:** the pool of three generals is also fixed by the seed, so exclude all three from the foes. Same board for everyone, no collisions.

### ⚠️ WARNING — Persia trait, then unpick (Draft, Army Preparation)
Four Persians raise the elite cap by one. Player takes a third elite, then swaps out a Persian. The trait drops, the cap drops, the draft now holds more elites than allowed. `validateDraft` reports it and `army` becomes null, so the run cannot proceed. No GDD defines what the player is shown. Undefined messaging.

### ⚠️ WARNING — Data version bump mid-daily (Units & Generals, Draft, Campaign)
The board redesign requires a `dataVersion` bump. A player with a save on the old version loads the app; `replayDraft(spec.foe)` throws on the version mismatch inside `resolveAll`. campaign.md lists the crash; no GDD specifies the required behaviour (load the save's data version, or reset gracefully). Matters on the day the redesign ships.

### ℹ️ INFO — Deploying for battle 2 (Campaign, Deployment, Battle Resolution)
`battles` is memoised on `save`. Every placement tap changes `save`, so every tap recomputes battle 1's result, including `aiDeploy` (about 20 candidates × 6 seeds = 120 simulated battles). Noticeable on a phone. The decided player-blind AI removes most of this if the foe's line is precomputed into the spec.

---

# Phase 2 — Cross-GDD Consistency (systems-designer agent, verbatim)

## 2a — Dependency bidirectionality

**🔴 BLOCKING — draft.md §6 lists Army Preparation as both a dependency and a dependent (self-contradiction)**
`design/gdd/draft.md` §6:
> **Depends on**
> - **Army Preparation**: defines what a trait level is worth; shares `cultureCounts` and `traitLevel`.
>
> **Depended on by**
> - **Army Preparation**: `cultureCounts`, `traitLevel`, `slotPenalty` (v1 only).

The same system, Army Preparation, appears in both lists in the same §6 with near-identical subject matter (`cultureCounts`/`traitLevel`). This is directly contradicted by `systems-index.md`'s "Circular Dependencies" section, which resolves the Draft↔Army Preparation relationship the other way: *"Draft owns culture counting and trait levels; Preparation owns trait effects... shared helper functions live in Draft; Preparation imports them."* That resolution implies Army Preparation depends on Draft, not the reverse. `army-preparation.md` §6 correctly lists Draft only under "Depends on" and never lists itself as depended-on-by-Draft — so `army-preparation.md`'s "Depended on by" list (Battle Resolution, Deployment, Battle report/Deploy screen, Batch tooling) does not reciprocate draft.md's "Depends on: Army Preparation" bullet at all.
**Fix (non-design-deciding):** Delete the "Army Preparation" bullet from draft.md §6's "Depends on" list (it belongs only under "Depended on by," which already exists). Also remove the corresponding "Army Preparation" mention from draft.md's Quick-reference line ("Key deps: ... `Army Preparation` (trait effects) ...") since that direction is backwards per systems-index's own resolution.

**🔴 BLOCKING — Quick-reference "Key deps" line names a downstream consumer as a dependency (Deployment doc)**
`design/gdd/deployment.md` line 24 (Quick reference):
> Key deps: `Battle Resolution`, `Army Preparation`, `Unit & General Data`, `Campaign`

But deployment.md §6 "Depends on" list is only Battle Resolution, Army Preparation/Preview, Unit & General Data — **Campaign is not in it.** Campaign appears only under "Depended on by" (*"Campaign: stores plan and deployment per battle; calls `aiDeploy` for the foe at resolve time."*). The Quick-reference line states the dependency direction backwards, which would mislead an implementer skimming just the summary line into thinking Deployment needs something from Campaign to function.
**Fix:** Remove `Campaign` from the Quick-reference "Key deps" line in deployment.md (or relabel the line to separate "depends on" vs "consumed by").

**🔴 BLOCKING — same error in Battle Resolution's Quick-reference line**
`design/gdd/battle-resolution.md` line 24:
> Key deps: `Army Preparation (stats, traits, plan, command)`, `Deployment`, `Unit & General Data`, `Campaign`

battle-resolution.md §6 "Depends on" list (Army Preparation, Deployment, Unit & General Data, RNG, Preview) does not include Campaign; Campaign is only in "Depended on by" (*"Campaign ...: calls `engine.resolve` once per battle..."*).
**Fix:** Same as above — remove `Campaign` from the Quick-reference "Key deps" line.

**🔴 BLOCKING — systems-index.md's own Dependency Map contradicts its own Enumeration table and draft.md**
`systems-index.md` Systems Enumeration table, row 2:
> Draft | ... | Units & Generals, Army Preparation, Campaign, Deployment

`systems-index.md` Dependency Map, Core Layer item 1:
> 1. **Draft** — depends on: Units & Generals.

These two sections of the *same document* give different dependency lists for Draft (four systems vs. one). draft.md §6 itself matches the Enumeration table (Units & Generals, Army Preparation, Campaign, Deployment), so the Dependency Map is the outlier.
**Fix:** Either the Dependency Map's simplified per-layer listing needs a footnote explaining it only shows *foundational* dependencies within/below a system's own layer (and is not a complete dependency list), or it should be expanded to match the Enumeration table. As written, a reader relying on the Dependency Map alone would miss that Draft depends on Campaign (seed) and Deployment (bot default).

**🔴 BLOCKING — undocumented Draft↔Campaign circular dependency violates the stated layering**
draft.md §6 "Depends on" includes *"**Campaign**: supplies the seed (daily date or free seed) and persists the `DraftState`."* campaign.md §6 "Depends on" includes *"**Draft**: `startDraft`, `replayDraft`, `toRunString`, `aiDraftState` (greedy) for foes..."* — this is a genuine two-way dependency (Draft needs a seed from Campaign; Campaign needs Draft's functions to build foes and the player's army). Yet systems-index.md's "Circular Dependencies" section lists only three resolved cycles (Deployment↔Battle Resolution, Army Preparation↔Deployment, Draft↔Army Preparation) — **Draft↔Campaign is missing.** This also directly conflicts with the project's own layering rule in `design/CLAUDE.md` ("Design order: Foundation → Core → Feature → Presentation → Polish") and systems-index's own layer assignment (Draft = Core Layer, Campaign = Feature Layer): a Core-layer system should not depend on a Feature-layer system above it.
**Fix (design question, not mine to resolve):** Either (a) document this as a fourth circular dependency with the same kind of resolution note the other three get (e.g., "Draft only needs a *seed value* from Campaign, not the CampaignSpec itself, so the dependency is one-way at the data level"), or (b) reclassify Draft's need for a seed as an input parameter rather than a system dependency. Flag to game-designer/systems-index owner.

**⚠ WARNING — naming drift: "Unit & General Data" vs "Units & Generals"**
The canonical doc title (units-and-generals.md) and every other doc (draft.md, army-preparation.md, campaign.md, systems-index.md) use **"Units & Generals."** But `deployment.md` (Quick-reference line and §6 bullet: *"**Unit & General Data**: unit class, base stats; `rules.fronts.frontage`; `styleToPlan`."*) and `battle-resolution.md` (Quick-reference line and §6 bullet: *"**Unit & General Data** (`units.json`, `generals.json`, `rules.json`): ..."*) both consistently use **"Unit & General Data"** instead. This is cosmetic but breaks find/replace and cross-reference tooling, and is exactly the drift pattern the task called out.
**Fix:** Rename both instances in deployment.md and battle-resolution.md to "Units & Generals."

**⚠ WARNING — traitThresholds tuning-knob row is missing a reciprocal ownership note**
`army-preparation.md` §7: *"`traitThresholds` | [4, 6] | trait reach (with Draft) | [3–4, 5–6] | owned with Draft"* — explicitly notes joint ownership. `draft.md` §7: *"`traitThresholds` | [4, 6] | trait reach | [3–4, 5–6] | level II must stay rare"* — no reciprocal "shared with Army Preparation" note, even though the values are identical (see 2d).
**Fix:** Add "shared with Army Preparation" to draft.md's traitThresholds row for symmetry (values already agree, so this is purely a documentation-completeness fix, no design decision needed).

---

## 2b — Rule contradictions

**🔴 BLOCKING — deployment.md §9 still uses the superseded "weakened AI" framing after the player-blind revision**
deployment.md's Design intent (§1) explicitly documents the revision:
> "In the campaign the AI **does not read the player at all**... (Revised 2026-09-16, replacing an earlier "keep the roster reader, weakened" answer.)"

But `deployment.md` §9, item 6 (Open, not superseded/struck-through):
> "**`enemyRead` advice can mislead.** ... Review the four advice lines after the AI is weakened."

"After the AI is weakened" is exactly the superseded framing ("keep the roster reader, weakened") the doc's own §1 says was replaced by "player-blind." This is precisely the kind of stale open-question language the review was asked to hunt for — an implementer skimming Open Questions (rather than the Design intent bullet) could reasonably build toward "weakened reader," not "player-blind."
**Fix:** In deployment.md §9 item 6, change "after the AI is weakened" to "after the AI is player-blind" (or similar), matching §1's revised language.

**⚠ WARNING — "plan" field ownership is ambiguous between Draft and Deployment/Campaign**
draft.md §3.A point 13 requires "a plan is set" for `toArmy`/draft validity, and draft.md's States table (§3) lists "Complete" as entered when "8 picks, cap holds" and exited by "`toArmy` succeeds once a plan is set" — implying Draft's `DraftState` owns a canonical single `plan` field. But deployment.md §3.6 clarifies: *"The plan is stored per battle in the campaign save and defaults to `styleToPlan[general.style]`. The draft state's single `plan` field is filled with the doctrine plan only to validate the draft."* Both docs do reconcile eventually (draft.md's own point 13 parenthetical: *"the real plan is chosen per battle"*), but a reader who only skims draft.md's States table or Detailed Rules point 13's first sentence (without the parenthetical) could conclude the plan is a single per-run decision owned by Draft.
**Fix:** Add an explicit forward-pointer in draft.md's States table row ("Complete" behaviour column) noting the draft's `plan` field is a placeholder only, with a "see Deployment §3.6" cross-reference, so the per-battle ownership is unambiguous without reading the parenthetical.

**Confirmed consistent (no issue, checked per task instructions):** trait thresholds (4/6, general-counts-as-one) — draft.md §3.A points 11–12 and army-preparation.md §3 step 4 agree exactly. Elite cap (base 2, SUPPLY≥80→3, Persia +1) — draft.md §3.A/§4.1 and army-preparation.md's Persia trait row agree exactly. Combined arms condition (≥1 line, ≥1 cavalry, ≥1 ranged/skirmish; specials don't count) — stated identically in army-preparation.md §3 step 5 and §5 Edge Cases. Empty-front costs (0.25 wing / 0.40 center) — verified below in 2e, arithmetically consistent with the morale formula. General death (narration only, no gameplay consequence) — battle-resolution.md §3.9/§9 and campaign.md §5/§9 agree. Reinforcements/`opts.campaign` (never passed by the web client, dead in the app) — battle-resolution.md §5/§9 and campaign.md §5/§9 agree.

---

## 2c — Stale references

**🔴 BLOCKING — battle-resolution.md header cites the wrong section and the wrong count**
Document header (line 8):
> **Implementation Status**: Fully implemented; three inconsistencies deferred (see §7)

§7 in battle-resolution.md is **"Tuning Knobs"** — a table of numeric levers, not a discussion of inconsistencies. The actual "Decided 2026-09-16" / "Deferred" writeups live in **§9 "Open Questions and Follow-Up Work."** Also, the count is wrong under either reading: §9's "Decided" list has 3 items (plan bonus, COMMAND, AI deployment) but §9's separate "Deferred (decide later)" list has 5 items (river chargeAttacker, China II phaseWeight, slot penalties, `opts.campaign`, general death) — "three inconsistencies deferred" doesn't match either list precisely, and definitely doesn't match anything in §7.
**Fix:** Change "(see §7)" to "(see §9)" and either say "three decided fixes and five deferred items (§9)" or restate accurately.

**🔴 BLOCKING — "(see §7, Q4)" points at content that doesn't exist**
battle-resolution.md §1, Design intent:
> "The current roster-reading AI is a balance defect, not the design (see §7, Q4)."

§7 (Tuning Knobs) contains tags "⚠ Q1" (styleMatchBonus row) and "⚠ Q2" (cmd formula row) only — **there is no "Q4" anywhere in the document.** The actual content (AI deployment defect, resolved via player-blind AI) is in §9, "Decided 2026-09-16," item 3: *"AI deployment should be guessable... Resolved in the Deployment doc (§9.1)..."* — which is correctly cross-referenced there but not reachable from the broken "§7, Q4" pointer in §1.
**Fix:** Change "(see §7, Q4)" to "(see §9, item 3)" in §1's Design intent bullet.

**⚠ WARNING — "(§7, Q1)" and "(§7, Q2)" are technically findable but the labeling scheme is inconsistent and half-defined**
battle-resolution.md §1: *"...the doctrine bonus... is flagged for tuning (§7, Q1)"* and *"COMMAND multiplying every score... is flagged to soften (§7, Q2)."* These do resolve to real tags in §7's table (styleMatchBonus row has "⚠ Q1", cmd row has "⚠ Q2"), so they are not broken links — but the *substantive* decision writeups for these same two items live in §9's "Decided 2026-09-16" list as unlabeled items 1 and 2 (no "Q1"/"Q2" tags appear anywhere in §9). So the "Q" numbering exists only as a shorthand inside §7's table cells and has no canonical definition or cross-reference back from §9, making the scheme fragile (as demonstrated by the broken "Q4" case above, which has no home in §7 or §9).
**Fix:** Either drop the "Q1"/"Q2"/"Q4" shorthand entirely in favor of "(§9, item 1)" / "(§9, item 2)" / "(§9, item 3)" style references (recommended, since §9 is where the actual explanation lives), or add matching "(Q1)"/"(Q2)"/"(Q3)" labels to §9's three "Decided" list items so the shorthand has a definition.

**Confirmed correct references (checked per task instructions, no issue):** army-preparation.md §4.4 "Owned jointly with Battle Resolution §4.1" → battle-resolution.md §4.1 is indeed the matching Cohesion threshold formula, identical. army-preparation.md §5 "see Deployment §3.2" → deployment.md §3.2 "Legality" does state the default-deployment fallback rule. units-and-generals.md §3.2's four general-stat cross-refs (Army Preparation §4.2, Battle Resolution §4.5, Draft §4.1, Battle Resolution §4.1) all resolve correctly to matching content. deployment.md's "Campaign §5" and "§9.1" self/cross-references, and campaign.md's "Deployment §9.1" references (appearing three times) all resolve correctly. systems-index.md's "draft.md §8" (six measurable targets) and "campaign.md §3.5" (Save) references both resolve correctly.

---

## 2d — Tuning-knob ownership conflicts

| Knob | Docs it appears in | Values/ranges agree? | Ownership stated? |
|---|---|---|---|
| `styleMatchBonus` | army-preparation.md §7, battle-resolution.md §7 | Yes — both: current 1.08, target 1.00–1.04 (army-prep also allows "or fight-specific") | ⚠ Neither row says "shared with [other doc]" |
| `cmd` formula | army-preparation.md §7, battle-resolution.md §7 | Yes — both: current `0.85+0.30·C`, target `0.90+0.20·C` | ⚠ Neither row says "shared with [other doc]" (battle-resolution's row at least cites the file location `prepare.ts:155`) |
| Cohesion constants (0.55/0.35/0.20) | army-preparation.md §4.4/§7 only | N/A | 🔴 army-preparation.md §7 says *"shared with Battle Resolution"* but battle-resolution.md §7's Tuning Knobs table has **no corresponding row at all**, despite battle-resolution.md §4.1 using the identical formula |
| `frontage` | deployment.md §7, battle-resolution.md §7 | Yes — both 1.5, range 1.2–2 | ✅ deployment.md explicitly says "owned by Battle Resolution" — correct, no issue |
| `traitThresholds` | draft.md §7, army-preparation.md §7 | Yes — both [4,6], range [3–4, 5–6] | ⚠ army-preparation.md says "owned with Draft"; draft.md's row does not reciprocate (see 2a) |
| `homeCultureTilt` | draft.md §7 only | N/A | Single-owner, no conflict found (the prompt names it as a knob to check; verified it does not appear in army-preparation.md or elsewhere) |
| Combined arms bonus/condition | army-preparation.md §7 only (values); draft.md references only the *measured outcome* (§3.A, §8), not the knob itself | N/A | Appropriately separated — Army Preparation owns the mechanic's knobs; Draft's board redesign is a lever that indirectly changes the measured reach. No conflict. |

**⚠ WARNING — Cohesion constants knob is undocumented in one of its two joint-owner docs**
army-preparation.md §7: *"Cohesion constants | 0.55 / 0.35 / 0.20 | how long fronts stand | base 0.5–0.6 | shared with Battle Resolution"* — but battle-resolution.md §7's Tuning Knobs table (26 rows, `rounds` through `casualties.*`) has no row for these constants, even though battle-resolution.md §4.1 states the identical formula and both docs' §4.1/§4.4 explicitly claim joint ownership.
**Fix:** Add a "Cohesion threshold constants (0.55/0.35/0.20)" row to battle-resolution.md §7 with a safe range (army-preparation.md's stated "base 0.5–0.6" would need the systems-designer's judgement on whether that's the right range for this doc, or the two docs should share one canonical row and cross-reference it — a call for whoever owns the knob).

**⚠ WARNING — `styleMatchBonus` and `cmd` formula: dual-listed without cross-reference**
Both are duplicated verbatim (same current value, same target value) in both army-preparation.md §7 and battle-resolution.md §7. Values agree, so this is not a contradiction, but the missing "shared with X" annotation (present for `frontage` and cohesion constants) is inconsistent formatting that could let the two copies drift apart in a future edit to only one doc.
**Fix:** Add "shared with Battle Resolution" / "shared with Army Preparation" annotations to both rows in both docs, matching the pattern already used for `frontage` and cohesion constants.

---

## 2e — Formula compatibility

**🔴 BLOCKING — army-preparation.md §4.1 contradicts its own worked example**
> "Range in practice 0.85–1.75. Example: Macedon I, combined arms, Envelopment, matched doctrine, wing press: 1.25 × 1.10 × 1.25 × 1.08 = **1.86**."

1.86 exceeds the stated upper bound of 1.75, in the very same sentence. This is a direct internal arithmetic contradiction, not a cross-doc one, but it propagates: battle-resolution.md §4.7 restates `phaseMult = plan × traits × combinedArms × (styleMatch ? 1.08 : 1)` without giving its own range, so a reader relying on army-preparation's "0.85–1.75" figure for balancing (e.g. for edgeCap headroom judgements) would be using a wrong ceiling.
**Worst case is actually higher still:** using Macedon **II** (wing press ×1.35, not the ×1.25 used in the example) with the same combined-arms/Envelopment/doctrine stack: 1.35 × 1.10 × 1.25 × 1.08 ≈ **2.00** — an even more extreme, equally legal combination the doc doesn't mention at all.
**Fix:** Correct "Range in practice 0.85–1.75" to something that actually bounds the shown example and the Macedon II case (e.g., "0.85–2.0" or state that the range excludes stacked doctrine-match + max-level trait combinations and give a separate worst-case line). This is a factual correction, not a design decision, since it's the document's own arithmetic that's wrong.

**⚠ WARNING — worst-case stat overflow via trait+ground stacking is understated by the "safe today" edge case**
army-preparation.md §5 Edge Cases: *"Stat above 100 after multipliers | Not clamped; curves like `(CHARGE/100)` exceed 1 | e.g. CHARGE 90 × 1.08 = 97; safe today"* — this example uses a single ×1.08 multiplier. But Carthage's trait ("non-Carthaginian units all stats ×1.05" at level I, "×1.08" at level II, applying to **all six stats**, per §3's trait rule types) stacks multiplicatively with ground (§4.3, up to ×1.15 for forest skirmish, applied to all six stats when `m ≠ 1`), since traits (step 4) run before ground (step 8) in the same pipeline. Worst case: base CHARGE 100 × 1.08 (Carthage II) × 1.15 (forest skirmish ground) = **124.2**, not 97. Fed into battle-resolution.md §4.3's contact impact curve `CHARGE × (CHARGE/100)^1` (i.e. CHARGE²/100), effective impact = 124.2²/100 = **154.3** vs. the unclamped-max-at-100 impact of 100 — a ~54% inflation from a 24% stat overflow, because the curve is squared. (By contrast the same overflow fed into battle-resolution.md §4.5's `(SPEED/100)^0.5` wing-speed curve is *dampened*, not amplified — sqrt(1.134) ≈ 1.065 for a comparable SPEED overflow.) Neither doc discusses this stacking case or the asymmetric amplification between the two curves; the "safe today" claim in army-preparation.md's edge-case table is based on an example that doesn't actually reach the stack's worst case.
**Fix (flagging for measurement, not deciding):** Either quantify and accept this via the batch tool, or have the "not clamped" edge case row cite the actual worst-case combination (Carthage trait + best-case ground) rather than a single ×1.08 example, so the "safe today" claim is backed by the real worst case.

**⚠ WARNING — a front can break from skirmish+contact alone (and possibly skirmish alone), undocumented in either doc's Edge Cases**
army-preparation.md §4.4 states cohesion threshold's "Typical range 0.85–1.05." battle-resolution.md §4.2 states max loser skirmish damage "before stakes: 0.48" (i.e. up to 0.48 × 1.2 = 0.576 in forest, per the §4.8 stakes table), and §4.3's contact damage formula (`0.5 × stakes.contact × edge × 2`) caps at 0.5 × 1 × 0.6 × 2 = 0.6 on plains/hills/center-unaffected ground. Using the docs' own stated typical threshold ceiling (1.05): skirmish max (0.48) + contact max (0.6) = **1.08 > 1.05** — meaning a front can break within skirmish+contact alone even at the high end of the "typical" threshold range, before any press round happens. In forest, skirmish alone can reach 0.576, which exceeds thresholds below roughly 0.58 (plausible for a low-STEADY, low-CHARISMA front with an unfavorable plan/trait `moraleMult`). Neither battle-resolution.md §5 Edge Cases nor army-preparation.md §5 Edge Cases has a row addressing "front breaks before press begins" or "front breaks during skirmish alone," even though §3.4's stage order explicitly checks breaks after both skirmish and contact.
**Fix (flagging for design/measurement, not deciding):** Add an Edge Cases row to battle-resolution.md §5 stating whether skirmish-alone or skirmish+contact breaks are intended, and whether this is captured in the "Early breaks (a front broken at contact) 10–25% of battles" batch target in §8 (that target's wording — "broken at contact" — suggests it may not currently count skirmish-stage breaks at all, which would be a gap in the acceptance criterion itself).

**🔴 BLOCKING — campaign.md misstates the reachable range of a formula it cites**
campaign.md §4.2: *"`casualties` per battle: winner 4–16%, loser **12–80%** (Battle Resolution §3.9)."*

battle-resolution.md §3.9 point 5's actual formula: loser = `min(loserMax 0.8, 0.12 + 0.35 × margin + 0.15 × pursuit)`, where `margin = min(1, |moraleA − moraleB|)` (max 1) and `pursuit` = winner's average wing SPEED / 100 (max ~1, or slightly above 1 only via terrain/trait stat overflow per the §4.1/§4.3 stat-stacking issue above). The formula's maximum *achievable* value is 0.12 + 0.35(1) + 0.15(1) = **0.62**, not 0.80. The `0.8` in the formula is a clamp (`loserMax`) that the formula's own inputs can never reach — it is a safety ceiling, not a realistic outcome. campaign.md's "loser 12–80%" presents the unreachable clamp value as if it were part of the real range.
**Fix:** Change campaign.md §4.2 to "loser 12–62%" (or whatever range the systems-designer confirms after checking whether pursuit/margin can exceed 1 via stat overflow), and correspondingly re-check the derived "A conquered run totals roughly 15–45%" line in the same section — using winner range 4–16% over 3 battles the arithmetic range is actually 12–48%, which only partially overlaps the stated "15–45%."

**🔴 BLOCKING — campaign completion target: the doc's own arithmetic falls short of the doc's own stated target**
campaign.md §4.1, "Target" row: p1=0.75, p2=0.60, p3=0.50–0.55 → *"Completion: 23–25% … up to 35% for a strong player."* Arithmetic check: 0.75 × 0.60 × 0.50 = **0.225 (22.5%)**; 0.75 × 0.60 × 0.55 = **0.2475 (24.75%)**. So the table's own numbers, using the doc's own stated per-battle target rates, top out at **~24.75%** — which is *below* the 25% floor of the completion target stated twice elsewhere: campaign.md §7 Tuning Knobs (*"Targets after tiering: per-battle win rates of about 75%, 60% and 50–55% for a competent player at cost parity; completion 25–35%"*) and game-concept.md Risks ("Difficulty... target 25–35%"). The "up to 35% for a strong player" phrase in §4.1's table is not derived from any shown calculation — reaching 35% completion with a symmetric p³ model requires p ≈ 0.70 per battle, which is not consistent with the stated 0.75/0.60/0.50–0.55 band without a "strong player" achieving meaningfully higher-than-target win rates in battles 2 and 3 specifically (battle 1's 0.75 is already near the ceiling). Neither the "competent player" framing (§7) nor the "strong player" framing (§4.1) is defined precisely enough to know whether the intended reconciliation is "these two labels are meant to be different populations" or "the 0.75/0.60/0.50–55 targets themselves need to be higher."
**Fix (a design question for game-designer/systems-designer, options only):**
- Option A: Raise the per-battle target bands (e.g., p3 to 0.55–0.60) so 0.75×0.60×[0.55-0.60] lands inside 25–35%.
- Option B: Restate the completion target as "22–25% for a competent player at the stated bands, up to 35% for a player who beats the target win rates" and make that distinction explicit in §7 too (currently §7 states one flat "25–35%" without the two-population caveat).
- Option C: Recompute using a non-symmetric or non-independent model if p1/p2/p3 aren't meant to be treated as independent multiplicative probabilities.

---

## 2f — Acceptance-criteria cross-check

**⚠ WARNING — deployment.md's cost-parity deployment target and campaign.md's tiered per-battle targets are measured under different, unreconciled conditions**
deployment.md §8: *"❌ A reasoned player deployment wins ≥ 45% per battle against the AI at cost parity. Today 32–40%."* This isolates deployment skill by holding general/army strength equal ("at cost parity"). campaign.md §7: *"Targets after tiering: per-battle win rates of about 75%, 60% and 50–55% for a competent player at cost parity..."* — note this ALSO says "at cost parity" but produces three *different* numbers across the three battles, where the only varying input (per both docs' own Design intent statements — deployment.md: "The same AI for every battle"; campaign.md: "AI deployment strength stays uniform") is the **foe's general strength via tiering**, not deployment skill. No document shows the arithmetic connecting a single "≥45% at cost parity" deployment-skill baseline to the three tiered numbers 75/60/50–55. This gap is partially self-flagged already — campaign.md §9 item 3: *"Is general tiering enough? With COMMAND softened... a general's stats move win rate less than they do today, so the bands may need to be wide, or foe army quality may need to tier too. Measure after both changes."* — but that note discusses feasibility of the tiering lever generically; it does not address the specific inconsistency that deployment.md's flat 45% target and campaign.md's 75/60/50–55% targets have never been shown to be mutually satisfiable with the same underlying AI/deployment system.
**Fix (flag for measurement, not a decision to make here):** After COMMAND softening and foe tiering are both implemented, the batch campaign simulator (campaign.md's flagged follow-up: *"Campaign simulator in the batch tooling: greedy bot as the player over N seeds, reporting p1, p2, p3"*) should report per-battle win rate broken out by (a) deployment-skill contribution and (b) general-tier contribution, so the two targets in deployment.md §8 and campaign.md §7 can be checked against the same run.

**⚠ WARNING — "default heuristic ≤ 60%" target may be trivially (and vacuously) satisfied if the player-blind AI is built as "the default heuristic itself"**
deployment.md §8: *"❌ Deployment is a decision: default heuristic ≤ 60% against alternatives on the same roster. Fails today against the reader (reader 56–68%)."* This target is meant to prove deployment requires *reasoning*, not just applying the default heuristic. But deployment.md §9 item 1 lists implementation option (a) for the new player-blind AI as: *"the default heuristic plus a ground-aware adjustment that actually measures better than the default."* If the campaign AI itself becomes (close to) the default heuristic, then testing "player deploys via default heuristic vs. the AI" becomes close to a default-vs-default mirror match, which would trivially land near 50% (well under the 60% ceiling) for a reason unrelated to the target's intent (proving reasoned deployment beats naive default) — it would instead just reflect symmetric randomness/noise. Neither doc discusses this consequence of choosing option (a) over option (b) (neutral-mirror simulation).
**Fix (flag for the designer choosing between options a/b in deployment.md §9.1, not decided here):** When measuring the "default heuristic ≤ 60%" target after the player-blind AI ships, distinguish "default heuristic beats other player deployment choices" (the actual intent) from "default-vs-(AI using default) is near 50%" (a confound if option (a) is chosen). This may be a reason to prefer option (b) (neutral-mirror simulation), but that's a call for game-designer/systems-designer to make, not implied here.

**Confirmed consistent, checked per task instructions:** draft.md §8 combined-arms target ("roughly 25–45% of greedy armies, today 97%") and army-preparation.md §8 combined-arms target ("roughly 25–45% of greedy-drafted armies, today 97%") — identical range, no conflict. draft.md §3.B/§8 trait-reach targets (level I 60–70%, level II <10%) are internally consistent between §3.B and §8 of the same doc.

---

## GDDs flagged for revision

| Doc | Reason | Type | Priority |
|---|---|---|---|
| draft.md | §6 lists Army Preparation as both a dependency and a dependent; Quick-ref repeats the wrong direction | Dependency contradiction | Blocking |
| draft.md | §7 traitThresholds row missing "shared with Army Preparation" note | Ownership completeness | Warning |
| deployment.md | Quick-reference lists Campaign as a "key dep" though §6 only has it under "Depended on by" | Dependency direction | Blocking |
| deployment.md | §9 item 6 says "after the AI is weakened," contradicting the revised player-blind decision in §1 | Stale rule language | Blocking |
| deployment.md | §8 "default ≤ 60%" target may be vacuously satisfied depending on which player-blind AI option (a/b) is built | Acceptance-criteria gap | Warning |
| battle-resolution.md | Header "(see §7)" — wrong section, wrong count | Broken cross-reference | Blocking |
| battle-resolution.md | §1 "(see §7, Q4)" — Q4 does not exist anywhere | Broken cross-reference | Blocking |
| battle-resolution.md | §1 "(§7, Q1)"/"(§7, Q2)" — resolvable but the Q-labeling scheme is undefined in §9 | Weak cross-reference | Warning |
| battle-resolution.md | Quick-reference lists Campaign as a "key dep" though §6 only has it under "Depended on by" | Dependency direction | Blocking |
| battle-resolution.md | §7 Tuning Knobs missing the cohesion-constants row that army-preparation.md says is "shared" | Ownership completeness | Warning |
| battle-resolution.md / deployment.md | Both use "Unit & General Data" instead of the canonical "Units & Generals" | Naming drift | Warning |
| army-preparation.md | §4.1 states "range in practice 0.85–1.75" then gives an example computing to 1.86 (and Macedon II reaches ~2.0) | Formula/text contradiction | Blocking |
| army-preparation.md | §5 "safe today" stat-overflow claim understates worst case (trait+ground stacking, CHARGE² amplification) | Formula compatibility gap | Warning |
| army-preparation.md / battle-resolution.md | `styleMatchBonus` and `cmd` formula duplicated without joint-ownership annotation | Ownership completeness | Warning |
| campaign.md | §4.2 "loser 12–80%" overstates the formula's reachable max (actually ~62%), cited to Battle Resolution §3.9 | Formula misrepresentation | Blocking |
| campaign.md | §4.1 "Target" row's own arithmetic (22.5–24.75%) falls short of the "25–35%" target stated in §7 and game-concept.md | Formula/target contradiction | Blocking |
| campaign.md / deployment.md | Cost-parity deployment target (≥45%) vs tiered per-battle targets (75/60/50–55%) never reconciled by shown math | Acceptance-criteria gap | Warning |
| systems-index.md | Dependency Map's Draft entry ("depends on: Units & Generals" only) contradicts its own Enumeration table and draft.md §6 | Internal self-contradiction | Blocking |
| systems-index.md | Circular Dependencies section omits the Draft↔Campaign cycle, which also violates the stated Foundation→Core→Feature layering | Missing documentation / layering violation | Blocking |

**Blocking: 15. Warning: 10. Total: 25.**

(Note: two of the 15 blocking items are grouped as one combined finding in 2a's write-up — the draft.md self-contradiction and its unreciprocated claim against army-preparation.md — counted here as a single row/finding for draft.md, consistent with the table above; the narrative sections above present them together for context.)

---

# Phase 3 — Game Design Holism (game-designer agent, verbatim)


---

## 3a — Progression Loop Competition

**Is there a clear point of a session / of returning tomorrow?**
Yes, and this part is coherent. With no power progression by anti-pillar, the retention loop is entirely daily-puzzle shaped: one shared board (`game-concept.md` "Retention hooks"), a comparable casualty score (`campaign.md` §4.2), and knowledge/skill as the only thing that accumulates. This matches the target player profile and doesn't need a fix.

**🔴 BLOCKING — The fantasy-bearing decision (deployment) is not the dominant outcome-bearing decision (general pick), even after all decided softening.**
Docs: `game-concept.md` (Core Fantasy, Pillar 2), `units-and-generals.md` §8/§9, `army-preparation.md` §4.2/§9.2, `deployment.md` §7/§8.

Estimating each lever's share of outcome variance with the docs' own numbers:
- **General pick.** Pre-change: general stats explain **92%** of general win-rate variance (R²=0.918), spread 24.5%–79.0% (`docs/reviews/2026-09-16-balance-review.md` finding 1). Post-COMMAND-softening (`cmd`: 0.85+0.30·C → 0.90+0.20·C, spread 12%→8%), `units-and-generals.md`'s own acceptance target is only "**well under half**" of variance and a spread band like "35%–65%" — i.e. still a **30-point** swing from general choice alone, made *before* the player has any other information.
- **Deployment.** The stated target (`deployment.md` §7): a reasoned player should win "at least as often as" a player-blind AI, replacing today's 32–51% swing. This is *intended* to be the largest live-skill lever, which is correct per Pillar 2 — but it is not clearly larger than general-pick variance once you account for §3c(i) below.
- **Plan.** Target ≤75% "best plan" share, cost of off-doctrine ~1.5–2.3 pts (`army-preparation.md` §9.3, balance review finding 3 sweep table). Small.
- **Draft.** Explicitly targeted to be low-variance between heuristics (draft.md §8: "no single draft heuristic... beats the others by more than 5 points") — by design, draft is *not* meant to swing outcomes much; its payoff is expressive, not decisive.
- **Luck** (`noiseSD` 0.15/score): mirror-vs-mirror battles land at 53% (near 50/50), so aggregate luck in a balanced fight is modest — but with `completion = p1·p2·p3`, per-battle luck compounds multiplicatively over a whole run.

**Net finding:** the single highest-variance decision in the combined design is still the general pick — made in one tap, before the draft even generates, with the least legible payoff, and it is not the decision either the core fantasy or Pillar 2 is built around. Softening COMMAND was aimed at this problem but (see §3c(iii)/§3d) a different decided change may be quietly re-inflating general-driven variance through SUPPLY.

**Options for the designer:**
- (a) Accept that general pick is a *second* skill axis (learn which of 3 offered generals is strong) and lean into it — show general win-rate-relevant stats more prominently at pick time, making it a legible decision rather than a lottery.
- (b) Actively cap general-driven variance below deployment-driven variance as an explicit target (e.g. general spread ≤20 points, deployment spread ≥25 points) so the numbers back up the fantasy.
- (c) Re-run the batch tool after all four decided changes ship and only then decide — this finding is a *prediction* from the docs' own math, not yet measured (flagged again in the closing note).

---

## 3b — Player Attention Budget

**⚠ WARNING — Draft row overload.** Per row (post-redesign, mixed-culture): 4 cards × (6 stats + grade + cost + per-card culture) = **36 individual data points**, plus a running elite counter (2–4), a culture tally across up to 9 cultures with two threshold markers each, and reroll state. `units-and-generals.md` §2 promises "read a card in two seconds: six words, one grade letter" — but the underlying system the player must reason about to make a non-lookup pick (§3c(ii)) requires weighing culture-threshold math the card alone doesn't show. `game-concept.md`'s own "too complex" bar ("a number the screen does not show, or a rule the Rules page cannot state in one sentence") is close to being tripped by the culture-threshold math (4/6 count including the general) if it isn't shown live per pick.

**⚠ WARNING — Deploy screen overload.** Per `deployment.md` §3.5 and `army-preparation.md` §4.3–4.4: 8 own units + 8 enemy units (16 units' stats), 3 fronts each with a cohesion word, a reserve count, and a live "what if I place here" preview; a plan picker showing (or implying) a 4×6 multiplier table; ground doing **two separate, unstated-as-two effects** (a stat multiplier in `army-preparation.md` §4.3 *and* an independent stakes multiplier in `battle-resolution.md` §4.8) — nothing in the Deploy screen spec distinguishes these as two different systems, so a player who notices "cavalry is weaker on hills" has only found half the ground rule. Underneath all of this sits a 20-subtype matchup table (`units-and-generals.md` §3.6) that is **not shown on the Deploy screen at all** — the player must supply matchup knowledge from real-world history literacy, which contradicts the "does not read stat tables" target player (`game-concept.md`, Target Player Profile) unless they happen to already know that heavy cavalry loses to pikes.

**Rules that decide battles but are invisible to the player**, cross-checked against Pillar 3's test ("every rule that decides battles must be told"):

| Rule | Where it decides | Told anywhere the target player will see it? |
|---|---|---|
| CHARGE² curve (`battle-resolution.md` §4.3) | Contact — the single biggest lever in that stage | Only on the Numbers page, which the target player "does not read" |
| sqrt(SPEED) wing gate (`battle-resolution.md` §4.5) | Wing press | Numbers page only |
| Frontage/reserve math, `k=min(n, ceil(oppN×1.5))` (`deployment.md` §4.3) | Every contested stage | Surfaced only as a bare "reserve: 2" count, not the formula |
| Matchup averaging over the enemy front (`units-and-generals.md` §4.3) | Every stage, every unit | Not shown pre-battle at all |
| N^0.3 Lanchester bonus (`battle-resolution.md` §4.4/4.5) | Press rounds | Numbers page only |
| Ground = two independent multiplier systems (`army-preparation.md` §4.3 + `battle-resolution.md` §4.8) | Every unit's stats *and* every stage's stakes | Not distinguished as two effects anywhere in the player-facing copy described |

**Recommendation options:**
- (a) Reduce the Deploy screen's *shown* numeracy (already words: FIRM/STEADY/BRITTLE) but add one plain-language line per front summarizing the matchup read ("your left is spears vs. his cavalry — favored"), turning invisible math into a felt hint without a table.
- (b) Accept that Pillar 3's "told in one sentence" test is satisfied only for the *secondary* audience (Numbers-page readers) and rewrite Pillar 3's design test to say so explicitly, rather than claiming universal legibility.
- (c) Cut or simplify the ground double-effect (pick one mechanism, not two) purely for attention-budget reasons, independent of the balance case.

---

## 3c — Dominant Strategy Detection (post-decided-changes)

### (i) 🔴 BLOCKING — The player-blind AI may convert Pillar 2's "guessable bet" into a fully solved read, not fix it.
Docs: `deployment.md` §9.1, §3.4, Pillar 2 design test (`game-concept.md`).

The decided fix makes `deployAgainst` a pure function of **(AI's own roster, ground)** only — it never sees the player. But the player *does* see the AI's full roster and the ground before deploying (`deployment.md` §3.5). Both proposed implementations are themselves deterministic, learnable procedures: (a) "the default heuristic plus a ground-aware adjustment" or (b) "best-of-candidates... against a neutral mirror" from a candidate set of "roughly twenty shapes" built mechanically from the default, its mirror, and single-unit moves (`deployment.md` §3.4). Because this procedure takes **no hidden inputs**, a player who learns the algorithm (which the Rules page half-teaches already, per the design review's finding 2: "the AI reads your roster and expects the obvious line") can, in principle, compute or closely approximate the AI's exact shape from information they are explicitly given. Pillar 2's own test is: *"the AI must not know your line or plan; the enemy's shape must be guessable by reasoning and never known."* Removing the AI's read of the player fixes the first half of that test but creates a real risk on the second half — the enemy's shape becomes **knowable by algorithm**, not merely guessable by reasoning, for the "strategy enthusiast" secondary audience the game explicitly wants to serve (`game-concept.md`, Target Player Profile). None of the docs set an acceptance criterion for "the AI's own deployment procedure resists a player who has learned the procedure" — every target in `deployment.md` §7/§8 is about the *player's* default losing to alternatives, not about the *AI's* choice being resistant to a knowing player.

**Options:**
- (a) Add randomization to the AI's own candidate selection (e.g. weighted sampling among near-tied candidates rather than always the top score) so "known algorithm" doesn't collapse to "known output."
- (b) Set an explicit acceptance criterion: a player who has memorized the AI's deploy procedure should not exceed some target win rate (e.g. ≤65%) against it, measured with `deploy_swap.ts` using a "knows the algorithm" bot as one of the swap variants.
- (c) Accept the risk as a feature for the secondary "strategy enthusiast" segment (mastery reward) and make sure the primary daily-puzzle player, who won't reverse-engineer the algorithm, still experiences it as a bet — but say so explicitly rather than leaving Pillar 2's test unresolved for the combined design.

### (ii) ⚠ WARNING — "Take the highest grade, fill elites first" likely remains dominant under the redesigned board.
Docs: `draft.md` §3.B, §8 (batch targets), `game-concept.md` Pillar 1 "Known violations today."

`game-concept.md` itself lists this as a *current* violation ("the draft (cost-only, culture-chase and elite-first heuristics perform within a point of each other)"). The redesign (mixed-culture rows, LLCRFFFF) is aimed at making culture "a choice inside every row" (`draft.md` §3.B item 2), but it changes nothing about the *cost* of choosing off-culture — there is still no hard budget (`draft.md` §3.B item 5: "the elite cap stays as the only hard limit"), and the balance review's finding 5 shows cost is already "the sufficient statistic" (corr(win, cost diff) = 0.19 but a ±7–12 cost edge is worth ±34 win-rate points). `draft.md` §8 lists "no single draft heuristic... beats the others by more than 5 points" as an unmeasured *target for the redesign*, not a verified result. Given nothing structurally punishes chasing cost over culture beyond a soft trait bonus, the dominant-strategy risk carries forward unchanged in kind, only relocated from row-level to card-level.

**Options:**
- (a) Ship the redesign, then measure before calling it done (the doc's own stated plan) — flag this as gating, not advisory.
- (b) Make off-culture picks cost something concrete (the design review's rejected-for-now point-budget idea, or a smaller lever like a per-culture "off-culture tax" on grade rarity) so culture-chasing competes with cost-chasing on the same axis.

### (iii) 🔴 BLOCKING — SUPPLY is a double dip that re-creates general-stat dominance the COMMAND fix was designed to remove.
Docs: `draft.md` §3.B item 4, §7, §8; `units-and-generals.md` §9; `army-preparation.md` §9 (COMMAND softening rationale).

A high-SUPPLY general (≥80, held by 24/81 generals) already gets a hard elite-cap increase (2→3), independently measured worth **+9.4 win-rate points** (2 elites 49.2% → 3 elites 58.6%, balance review finding 5). The decided change *adds* a continuous rarity nudge on top: "up to +20% relative weight on A and S at SUPPLY 100" (`draft.md` §3.B item 4). Both mechanisms push in the same direction — more elite slots *and* a better chance of drawing elites to fill them — for the same stat, with **no offsetting cost** anywhere (SUPPLY's only in-battle effect, the Reinforcements event, is confirmed dead in the shipped app: `battle-resolution.md` §9 item 7, `campaign.md` §5). `draft.md` §8 lists a batch target explicitly meant to cap this ("a SUPPLY-100 general's armies average no more than about 3 cost points above a SUPPLY-50 general's") — but the target is unmeasured, and 3 cost points is not self-evidently enough to offset a +9.4-point elite-count effect plus a rarity nudge on the *same* elites. Since COMMAND softening (`army-preparation.md` §9) was specifically justified as reducing general-pick dominance, a SUPPLY-driven army-quality effect growing at the same time could leave overall general-driven variance roughly where it started, just moved from one stat to another — undermining the stated purpose of the COMMAND fix without anyone measuring that it did.

**Options:**
- (a) Pick one lever for SUPPLY, not two: keep the elite-cap threshold at 80 *or* the rarity nudge, not both, until measured together.
- (b) Cap the *combined* effect explicitly as an acceptance criterion (e.g. total army-quality delta between SUPPLY 50 and SUPPLY 100 generals ≤ X win-rate points, not just ≤3 cost points, since cost and win-rate-per-point aren't 1:1 per the balance review's own findings).
- (c) Ship as designed and re-run the general-spread acceptance criterion (`units-and-generals.md` §8, "general win-rate spread... within an agreed band") only after both COMMAND softening and graded SUPPLY are live together — currently these are treated as independent fixes in separate docs with no shared acceptance gate.

### (iv) ⚠ WARNING — Post-softening, COMMAND may no longer be strictly the only stat that matters — but this is a hopeful extrapolation, not a measured result.
Docs: `army-preparation.md` §4.2/§9, balance review finding 1 regression.

Scaling the pre-change regression coefficients by the softening ratio (8%/12% ≈ 0.67) as a rough estimate: COMMAND's marginal value per +10 points would drop from ~5.6 win-rate points to roughly **~3.7**, putting it close to TACTICS's unchanged **~3.5** per +10 points. If this linear-scaling assumption holds, COMMAND stops being uniquely dominant and TACTICS becomes a genuinely competitive pick for a wing-heavy build — a good outcome for Pillar 1. But this is an extrapolation from a formula change, not a simulated result, and it ignores the SUPPLY double-dip in (iii) above, which could pull the "best stat to pick" contest toward SUPPLY instead of resolving into a genuine multi-stat tradeoff. **Recommendation:** treat "TACTICS/CHARISMA are ever the right pick" as an explicit, named acceptance criterion for the combined design (not just "general variance is lower"), measured with the four-stat OLS re-run after all changes ship.

### (v) 🔴 BLOCKING — CHARGE² at Contact is untouched by any decided change and may be a front-agnostic dominant stat-stack, undercutting the whole "remove lookups" effort.
Docs: `battle-resolution.md` §4.3, §7 (tuning knobs table — `chargeCurve` listed but not among the "decided" items).

Contact's impact term is `CHARGE × (CHARGE/100)^1 = CHARGE²/100` — genuinely quadratic. Concentrating CHARGE (few very-high-CHARGE units on one front) beats distributing it: a single CHARGE-90 unit contributes 81 impact; two CHARGE-45 units contribute 2×20.25=40.5 combined — **half the impact for the same total stat**. Contact resolves on **all three fronts simultaneously** (not just the Center), and deployment is fully free-form (`deployment.md` §3.2: "any assignment... including an empty Center or all eight on one front"), so a player can hand-stack the roster's highest-CHARGE units (shock class averages 67, special/elephants averages **83**, the highest of any class, per `units-and-generals.md` §4.5) onto any single front. Winning Contact decisively by more than the `shakenEdge` (0.25) triggers **shaken** (×0.9 for the rest of the battle) on the loser, compounding through up to 4 press rounds. None of the four decided changes (ground-to-STEADY exclusion, COMMAND softening, doctrine shrink, player-blind AI) touch `chargeCurve`, `shakenEdge`, or `shakenMult` — this dynamic ships unchanged. If it is in fact dominant (unverified either way — no batch measurement of "CHARGE-stacked deployment" exists in any reviewed doc), the combined design would have carefully removed the doctrine-lookup and softened the general-lottery while leaving a comparably strong stat-lookup sitting in the resolver's most fundamental formula.

**Options:**
- (a) Measure it first: batch-test a "concentrate CHARGE on whichever front the matchup favors" deploy heuristic against the reasoned/reader baselines already used for finding 2 of the balance review, before shipping anything else.
- (b) If confirmed dominant, soften `chargeCurve` from 1 toward the documented safe range (0.5–1.5, i.e. move it below 1 to reduce the quadratic reward) rather than leaving it as an assumed-safe formula nobody has stress-tested against deliberate CHARGE-stacking.
- (c) If accepted as intended depth (a legitimate "load your shock troops together" tactic), document it explicitly as a valid strategy on the Rules/Numbers pages so it's at least *told* per Pillar 3, rather than sitting as an unflagged emergent dominant play.

### (vi) ⚠ WARNING — The plan table itself has no strict cell-by-cell dominance, but the target ("no plan best for >75% of rosters") sits exactly at Pillar 1's own violation threshold.
Docs: `army-preparation.md` §8, §9.3; `game-concept.md` Pillar 1.

Checking the four plans cell-by-cell (`docs/MECHANICS.md` §5 table) confirms no plan strictly dominates another — each is weakest somewhere it's strongest elsewhere (e.g. Skirmish's 1.30 skirmish multiplier is offset by a below-average 0.95 contact and 0.95 center). That's healthy intransitive design. But `army-preparation.md` §8's own acceptance target — "no plan is best for more than 75% of rosters" — is worded to match, almost verbatim, Pillar 1's own definition of a *fake* decision ("if one option is right more than about three times in four, it is a lookup and must be fixed"). Shipping to exactly the boundary of the pillar's own violation test is a risky target, not a safe one. Additionally, the "style-specific" candidate for the doctrine bonus (`army-preparation.md` §9.3: e.g. Envelopment → wing ×1.10) would stack on top of the plan table's own already-highest cell for that style (Envelopment's wing is already the single highest cell in the table at 1.25) — compounding to 1.375, an even more extreme peak, which risks recreating a narrower "always take your signature plan on the terrain where it shines" lookup for Envelopment/Skirmish-style generals specifically, even after the flat 1.08 bonus is removed.

**Recommendation:** re-tune the target down from 75% to something more comfortably under the pillar's own three-in-four line (e.g. ≤60%), and re-check the style-specific bonus candidates against the plan table's own peak cells before choosing one, not just against the flat-bonus baseline.

### (vii) No finding — frontage/reserve math appears to correctly punish extremes.
Docs: `deployment.md` §4.3, `battle-resolution.md` §3.3, balance review "Deployment" section.

Refusing a flank (11.9% win rate) and all-center (0.9%) are correctly dominated-bad options, and center-size sweeps (2 through 6) cluster within a narrow 32–37% band against the AI, suggesting no single "always right" fixed shape exists among moderate allocations — this is the intended shape of Pillar 2. This machinery is untouched by the decided changes and should carry forward safely. **Open, not urgent:** none of the four decided changes have re-measured this table against the new player-blind AI; worth a follow-up batch pass, not a blocker.

---

## 3d — Economic Loop Analysis

**Resources, sources, and sinks:**

| Resource | Source(s) | Sink(s) | Status |
|---|---|---|---|
| Rerolls (2) | Flat grant per run | Consumed per redraw of an unpicked row | ⚠ Near-meaningless: balance review finding 5 measures each of the first two rerolls at **~1 win-rate point**, the 3rd/4th at ~0. Not re-measured post-redesign. |
| Elite slots (2–3, +1 Persia, now with a SUPPLY rarity nudge) | Base 2; +1 at SUPPLY≥80; +1 Persia trait; +better odds continuously via SUPPLY nudge | None — slots only ever increase | 🔴 Unbalanced reinforcing loop (see §3c-iii). |
| Culture counts | Picks + general as free unit | None (thresholds are binary gates, not spent) | Functions as intended, contingent on §3c-ii being resolved. |
| Cost | Set by tuning pipeline (`tune_costs.mjs`) | None visible to the player (no budget exists, `draft.md` §3.B item 5 and the balance/design reviews both explicitly recommend against adding one) | See finding below. |

**🔴 BLOCKING (confirmed unbalanced reinforcing loop) — SUPPLY → better cards → more elites, with no balancing loop.**
This restates §3c(iii) in sink/faucet terms: SUPPLY has a documented in-battle effect that is dead code in the shipped app (Reinforcements never fires, `battle-resolution.md` §9 item 7), so its *entire* live value is army-building upside, applied twice (rarity nudge + cap), with no offsetting downside. A healthy economy needs a balancing loop for every reinforcing one (per the game-designer framework's own methodology); none exists for SUPPLY.

**⚠ WARNING — Cost means almost nothing to the player directly, and its visible proxy (grade) is a weak signal of actual power.**
Docs: `draft.md` §3.A/§7; `units-and-generals.md` §4.5; balance review "Unit outliers" section.
There is deliberately no budget (both reviews recommend against one for the MVP), and `cost` itself is not shown to the player anywhere in the reviewed docs — only the derived `grade` letter (S–F) is. The balance review's static power proxy correlates with cost at only **r=0.30** ("cost is a function of the simulation... not of the stat words the card shows, so a player cannot read value off the card") and lists specific mispriced units (e.g. `per_immortals`, an A-grade unit measured as the lowest power-per-cost unit in the entire 135-unit roster). Combined with §3c(ii)'s finding that "take highest grade" is likely still dominant, this means the player's one legible economic signal (the grade letter) is both the thing that decides most picks *and* a documented weak proxy for what actually wins battles — a tension none of the six docs reconcile.

**Recommendation options:**
- (a) Show `totalCost` on the board sheet and Deploy roster line, as the design review already recommends (not yet a "decided" item in any GDD) — this makes cost legible even without a hard budget, and lets the player see the lever they're actually pulling.
- (b) Shrink rerolls to 1 (balance review finding 5's own suggestion) and spend the reclaimed UI budget on deployment information, since rerolls are measurably the weakest "resource" in the game.
- (c) Fix the worst-mispriced units flagged in the balance review's outlier table before the redesign ships, so "trust the grade" is closer to actually true.

---

## 3e — Difficulty Curve Consistency

**🔴 BLOCKING — Three separate decided levers pull against each other, and the docs already half-know it.**
Docs: `campaign.md` §3.6, §9 (open Q3), `army-preparation.md` §9.2, `battle-resolution.md` §4.8, balance review finding 4.

1. **General tiering** (`campaign.md` §3.6): draw foe generals into bands by *summed* stat (roster range 220–375, median 290) so battle 1 gets a weaker general, battle 3 a stronger one. Target: 75% / 60% / 50–55% win rate, a **25-point spread**.
2. **COMMAND softening** (`army-preparation.md` §9.2) narrows exactly the stat that most drove general-tier separation pre-change (spread 12%→8%, R²=0.918→"well under half"). Campaign's own §9 open question 3 says this outright: *"a general's stats move win rate less than they do today, so the bands may need to be wide, or foe army quality may need to tier too. Measure after both changes."*
3. **Ground is drawn independently of battle index** ("merely distinct," balance review finding 4) — three of four grounds are used per campaign, without replacement. Because wing stakes are halved on hills *and* forest (`battle-resolution.md` §4.8), and the four grounds are {plains, hills, forest, river}, there is a **50% chance any given daily campaign includes both hills and forest** among its three battles (1 − P(hills excluded) − P(forest excluded) = 1 − 0.25 − 0.25 = 0.5). Pre-change per-terrain swing for a parity player was ~5.3 points (hills 47.6% vs plains 52.9%, balance review finding 4); this is not tier-correlated at all.

**Quantitative estimate:** using the balance review's own weighted regression (COMMAND coefficient scaled by ~0.67 per §3c-iv), a summed-stat-based tiering scheme is likely to compress the tier-median win-rate spread from the pre-change ~54.5 points down toward somewhere in the **~15–20 point** range between bottom-tier and top-tier medians — short of the **25-point** spread the campaign target (75% vs 50–55%) requires. This is compounded, not offset, by ground: since ground swing (~5+ points, likely more once wing-heavy strategies interact with the player-blind AI) is *uncorrelated* with the tier assignment, a player could easily draw a weak-general foe on hills (harder than the number suggests) followed by a strong-general foe on plains (easier than the number suggests) within the *same daily*. Because this is a one-shot daily game (Pillar 4), the player doesn't get the benefit of the levers "averaging out over many campaigns" — they get exactly one draw of grounds-vs-tiers per day, and `campaign.md` §3.6 item 14 explicitly promises "the player should be able to see that the climb is a climb," which a same-day ground/tier mismatch would directly contradict.

**Recommendation options:**
- (a) Tier by *weighted* general power (using the post-softening OLS regression, not raw stat sum) rather than a flat stat sum, since a flat sum mis-weights SUPPLY (which the docs' own §3c(iii) shows is under-credited by a linear model) relative to COMMAND/TACTICS.
- (b) Add foe army-cost banding as a second lever alongside general tiers, as `campaign.md` §7 already lists as "a future option" — promote it to "decided" now rather than after the first measurement round shows the general-only approach falls short.
- (c) Correlate ground with battle index (e.g. bias battle 3, the hardest by general tier, away from hills/forest so wing-based strategies aren't simultaneously punished) to prevent ground variance from masking the intended curve on any single day.
- (d) At minimum, measure this combination (general tiers + COMMAND softening + independent ground draw) together before shipping any one of them — currently each is validated in isolation in its own doc.

---

## 3f — Pillar Alignment

**Player Fantasy → Pillar mapping (all six systems):**

| System | Primary pillar served | Notes |
|---|---|---|
| Units & Generals | Pillar 5 (historical), secondarily Pillar 3 (legibility claim) | Foundation data, not a decision — appropriate to serve no decision-pillar directly. |
| Draft | Pillar 1 (tradeoff) claimed; Pillar 4 (comparison) | Per §3c(ii)/§3c(iii), the *mechanism* risks not delivering the tradeoff the fantasy text promises. |
| Army Preparation | Support role (systems-index.md explicitly says this doc doesn't carry a core-fantasy pillar) | Fantasy text touches Pillar 5 (ground realism) and implies Pillar 1 (doctrine as decision) — the latter is exactly what's flagged as a current violation and only partly fixed (§3c-vi). |
| Deployment | Pillar 2 (near-verbatim match to the core fantasy text) | Strongest alignment of the six; also the system carrying the biggest open risk (§3c-i). |
| Battle Resolution | Pillar 5 (no control) + Pillar 3 (legibility of loss) | Well-aligned in stated intent; §3b shows the legibility promise is only met for the Numbers-page-reading secondary audience. |
| Campaign | Pillar 4 (shared board, comparison) | Provides stakes; doesn't re-state the core fantasy, which is fine as a wrapper. |

None of the six serve *zero* pillars. No system's fantasy pulls toward spectacle (consistent with the anti-pillars) or persistent collection (consistent with "no grind or unlocks").

**⚠ WARNING — Pillar 3's design test is satisfied on paper but not for the stated primary audience.**
`game-concept.md`'s Target Player Profile states the primary player "does not read stat tables," served by the words FIGHT/STEADY/CHARGE etc. But the mechanism that actually satisfies Pillar 3's test (a rule "told... in one sentence," verified as accurate by the design review — "Numbers page formulas check out against the code... the best player-facing spec in the project") is itself a stat-table-shaped page, explicitly the *secondary* audience's tool ("served by depth that is available but never required"). Pillar 3 is functionally met only for players who read exactly what the primary persona is defined as not reading. Recommend either rewriting Pillar 3's design test to explicitly scope it to "available depth" rather than universal legibility, or building a primary-audience-appropriate legibility layer (plain-language per-front hints, §3b option a) that doesn't require the Numbers page.

**⚠ WARNING — Pillar 4's "identical for all players" claim has a known, unfixed gap that survives every decided change.**
`campaign.md` §5 explicitly documents: "Two players in different time zones get different dailies at the same moment... acceptable in Phase A." None of the four decided changes touch this (Phase B server seeds are explicitly out of MVP scope). Pillar 4's own wording is unqualified ("The daily is identical for all players"); the acceptance is qualified ("acceptable in Phase A"). Worth resolving the wording mismatch even if the underlying gap is knowingly deferred — the *replay* half of Pillar 4's test (same run string reproduces the same battle) is intact; only the *shared-board* half is compromised.

**🔴 BLOCKING (anti-pillar) — The rewarded-ad reroll's "never buys power" claim is unverified and likely false under the decided draft redesign.**
Docs: `game-concept.md` Core Identity ("Optional rewarded convenience (e.g. an extra reroll) that never buys power on the ranked daily"), `draft.md` §3.B item 4, balance review finding 5.
Under the *current* system, rerolls beyond the granted 2 are measured to be worth ~0 win-rate points (balance review finding 5: "the third and fourth are worth nothing because the reroll rule... rarely fires more than twice"). But that measurement predates the decided draft redesign, which introduces **graded SUPPLY rarity** (`draft.md` §3.B item 4: "up to +20% relative weight on A and S at SUPPLY 100") and **mixed-culture rows** (so a reroll no longer reshuffles a whole culture, only a slot). Both changes plausibly raise the marginal value of an extra reroll above zero — a reroll becomes a more surgical tool for fishing a specific grade under a now-graded rarity curve. If an extra rewarded-ad reroll has *any* measurable positive effect on final army quality post-redesign, the game-concept's explicit anti-pillar claim ("never buys power on the ranked daily") is false as designed, not just as measured. This is exactly the kind of interaction a single-document review would never catch, since the anti-pillar claim lives in `game-concept.md` and the mechanism that could break it lives in `draft.md`.

**Options:**
- (a) Re-measure reroll value under the full redesign before shipping the rewarded-ad feature; gate the monetization feature on the result.
- (b) Restrict the rewarded extra reroll to *free* campaigns only (already the pattern the docs use for other convenience/practice features), so it never touches the ranked daily regardless of its measured value.
- (c) Cap the rewarded reroll's effect explicitly (e.g. it can only reroll a row already rerolled once, diminishing returns by construction) so the anti-pillar claim is true by design rather than by hoped-for balance.

**Pillar 1's own test ("can a bot with one simple rule match a thoughtful player?") applied across every decided decision point:**
- General pick: risk of shifting from "always max COMMAND" (confirmed today) to "always max SUPPLY" (hypothesized post-change, §3c-iii) — the *form* of the problem may simply move, not disappear.
- Draft: "always max grade/cost" risk carries forward largely unchanged (§3c-ii).
- Plan: target still allows a naive "always match doctrine" bot to be right 75% of the time (§3c-vi) — at the pillar's own violation boundary.
- Deployment: intended to finally pass this test, but unverified; and risks failing it in a *new* way if the AI's procedure becomes fully knowable (§3c-i).

---

## 3g — Player Fantasy Coherence

Comparing all six Player Fantasy sections against the core fantasy ("you are the general who out-thinks the other general") and the stated tiebreaker ("decisions and legibility win over spectacle and collection"):

- **Deployment** and **Battle Resolution** map almost word-for-word onto the core fantasy text ("you are reading the other general" / "you are the general on the hill") — the strongest, most coherent pair, and correctly so given `systems-index.md` names them as the core-fantasy carriers.
- **Draft** and **Units & Generals** lean toward *Expression* ("an army with an identity," "a Roman core with Numidian horse") — this is coherent because Expression is explicitly the *second*-priority target aesthetic in `game-concept.md`'s own MDA list, not a drift toward collection. No violation.
- **Campaign** leans toward *Fellowship* ("a casualty figure to set against your friends") — appropriate for a stakes-wrapper system, not a re-statement of the core fantasy, and doesn't need to be one.
- None of the six pull toward *Sensation* or *Submission*, which `game-concept.md` explicitly excludes ("Not targeted: sensation... submission").

**No blocking finding here.** The one soft tension — Units & Generals' "read a card in two seconds" promise sitting uneasily next to the actual formula complexity underneath (§3b/§3f) — is a legibility issue already captured above, not a fantasy-coherence issue; the *stated* fantasy is fine, only the *delivered* experience is at risk of not matching it for the primary audience.

---

## Closing Note — Nothing here has been measured together yet

Every one of the four "decided" changes (ground-to-STEADY exclusion, COMMAND softening, doctrine-bonus shrink, player-blind AI) carries its own unmeasured acceptance criteria in its own doc. None of the six GDDs report a joint measurement of all four changes applied simultaneously. Several findings above (§3c-iii, §3c-iv, §3e, §3f reroll) are *predictions from the documented math*, explicitly flagged as such — they are the kind of finding that only appears when the six docs are read together, and they are also the kind of finding that a single `npm run batch` pass, run once all four changes are implemented together, would either confirm or retire. Recommend that pass be a named acceptance gate before any of the four changes ship independently.

---

## Top 5 (most likely to change what gets built)

1. **🔴 SUPPLY double dip (elite cap +1 AND rarity nudge) re-inflates general-stat dominance that COMMAND-softening was designed to remove.** (`draft.md` §3.B/§7/§8, `army-preparation.md` §9, `units-and-generals.md` §9) — cross-cutting; likely to require a joint acceptance gate before either change ships alone.
2. **🔴 Difficulty-curve levers contradict each other: general tiering, COMMAND softening, and battle-index-independent ground draws pull against the stated 25-point spread and against Pillar 4's "the climb should be felt today."** (`campaign.md` §3.6/§9, `army-preparation.md` §9.2, `battle-resolution.md` §4.8)
3. **🔴 The player-blind AI may convert Pillar 2's "guessable bet" into a fully solved, memorizable read**, since it is now a pure deterministic function of information the player is explicitly given. (`deployment.md` §9.1/§3.4, Pillar 2)
4. **🔴 CHARGE² at Contact is untouched by any decided change and may be a front-agnostic dominant stat-stack** that undermines the entire "remove lookups" effort the other three changes were made for. (`battle-resolution.md` §4.3/§7)
5. **🔴 The rewarded-ad reroll's "never buys power" anti-pillar claim is unverified and plausibly false once the draft redesign (graded SUPPLY + mixed-culture rows) changes reroll's marginal value.** (`game-concept.md` Core Identity, `draft.md` §3.B item 4)

---

## GDDs Flagged for Revision

| GDD | Reason | Type | Priority |
|---|---|---|---|
| `draft.md` | SUPPLY double dip (§3c-iii/§3d); dominant-strategy risk unmeasured under new board (§3c-ii); reroll power-creep under redesign (§3f) | Design gap / unverified acceptance | 🔴 High |
| `campaign.md` | Difficulty-curve levers conflict with `army-preparation.md`'s COMMAND softening and with ground randomization (§3e); own §9 open question already flags this | Cross-doc conflict | 🔴 High |
| `army-preparation.md` | Plan-table acceptance target sits at Pillar 1's own violation boundary (§3c-vi); COMMAND-softening's downstream effect on general dominance needs joint measurement with `draft.md` | Tuning target too permissive | ⚠ Medium |
| `deployment.md` | Player-blind AI has no acceptance criterion protecting against a player who has learned its deterministic procedure (§3c-i) | Missing acceptance criterion | 🔴 High |
| `battle-resolution.md` | CHARGE² dominant-strategy risk never assessed; not part of any decided-changes batch (§3c-v) | Unassessed formula risk | 🔴 High |
| `game-concept.md` | Rewarded-ad reroll anti-pillar claim unverified against the draft redesign (§3f); Pillar 3's "one sentence" test only verifiably met for the secondary audience, not the stated primary player (§3b/§3f); Pillar 4 wording unqualified against a known, deferred Phase A gap (§3f) | Anti-pillar / pillar-wording risk | ⚠ Medium |
| `units-and-generals.md` | General win-rate spread target ("well under half," "e.g. 35%–65%") not yet reconciled with the SUPPLY double-dip's likely effect on the same variance | Unverified acceptance | ⚠ Medium |

---

# Addendum — Decisions and first measurements, 2026-09-16 (same day)

## Consistency fixes

All 25 consistency findings were applied to the eight docs in one pass: section pointers, dependency
directions, naming, the stale "weakened AI" line, the multiplier range, the casualty range, knob ownership
notes, and the Draft↔Campaign cycle (resolved: Draft takes a seed as an input, not a dependency).
Systems 1–6 moved from Needs Revision to In Review.

## Designer decisions

| Question | Decision |
|---|---|
| Completion target arithmetic | Raise per-battle targets to about 80 / 65 / 55–60%, about 30% completion |
| SUPPLY double dip | Keep both levers under one joint cap: SUPPLY 100 wins no more than about 5 points over SUPPLY 50. The ladder handicap prices the rest |
| Difficulty second lever | Foe army cost bands, alongside general tiers |
| Player-blind AI as a solved read | The AI picks among its near-tied best lines using the campaign seed |
| CHARGE² | Measure a CHARGE-stacking deployment first; gate the other changes on it |
| Rewarded reroll | One extra reroll open to every player, daily included; balance around three. Anti-pillar reworded to "power is never for sale" |
| Early breaks | Intended, kept rare (10–25%), skirmish-stage breaks counted, called out in the report |
| COMMAND | Provisionally halfway (0.875 + 0.25·C); decide only after measuring |
| Generals on the leaderboard (designer's idea) | Rank by battles won, then general handicap (weaker ranks higher), then casualties; per-general rankings; handicap from measured win rate; shown on cards before the ladder exists |
| Foe vs player general | Foes exclude the seed's whole pool of three, so the board stays shared |
| Battle events | Every applied event must be narrated |

## First measurements (existing tooling, no engine changes)

**Doctrine bonus sweep** (240 greedy rosters × 4 plans × 24 battles, default deployments):

| `styleMatchBonus` | Doctrine plan is best | Cost of playing doctrine | Best plan counts (agg / def / env / ski) |
|---|---|---|---|
| 1.08 (today) | 98.8% | 0.1 pts | 103 / 79 / 29 / 29 |
| 1.06 | 90.4% | 0.5 | 98 / 69 / 36 / 37 |
| 1.04 | 75.8% | 1.5 | 83 / 57 / 52 / 48 |
| 1.02 | 52.5% | 3.6 | 77 / 27 / 67 / 69 |
| 1.00 | 28.7% | 7.3 | 52 / 24 / 78 / 86 |

Reading: the ≤ 60% target needs a bonus of about **1.02–1.03**. 1.04 lands exactly on Pillar 1's fake-decision
line. With no bonus the doctrine plan becomes a trap and **Defensive is the best plan for only 10% of
rosters**, so the plan table itself is lopsided: Defensive needs strengthening regardless of the bonus.

**CHARGE curve sweep** (`fronts.chargeCurve` 0.5 / 0.75 / 1, 6,000 greedy battles each): almost no aggregate
effect. Early routs 1.8–2.1%, rout rate 74–77%, class balance within a point, except specials (elephants and
chariots), which weaken from −1.3 to −3.0 as the curve flattens. With default deployments the squared curve
is not distorting class balance. **This does not answer the stacking question**, which needs a deployment
that deliberately masses CHARGE on one front; that variant does not exist yet.

## Still unmeasured

COMMAND variants (constants must move into `rules.json` first); ground excluding STEADY; the player-blind
AI; foe tiers and cost bands (a campaign run script exists from the balance review and should move into the
engine's `src/cli/`); everything about the new draft board.
