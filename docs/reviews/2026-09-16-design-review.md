# Design review — Warlord Draft MVP campaign

*2026-09-16. Reviewer role: game designer / creative director. Scope: `docs/mvp-plan.md`,
`docs/app-design.md`, `docs/battle-design-three-fronts.md`, `docs/DECISIONS.md`, `docs/BALANCE.md`,
`docs/classical-world-design-plan.md`, the engine (`packages/engine/src`, `packages/engine/data`) and the
client rules (`apps/web/src/lib/draftRules.ts`, `apps/web/src/lib/campaign/spec.ts`,
`apps/web/src/app/rules/page.tsx`). The design-review checklist was used as a rubric only; the project's own
document set is taken as the spec.*

**Assumptions.** The three-fronts model (`rules.battleModel: "fronts"`) is the only live battle model; v1
residue is judged against that. The "army point budget" question is the one in
`classical-world-design-plan.md` §5 ("Later mode: budget draft (point cap instead of elite cap)") and §12 Q4
("Elite cap feel"). Measurements below were run against the built engine (`packages/engine/dist`) with the
greedy bot's armies over a few hundred seeds; they are evidence for the findings, not balance-grade numbers
(the batch tool is for that). Line numbers are as of commit `b31a9bb`.

---

## Verdict: NEEDS REVISION

The skeleton is right and, unusually for a design at this stage, measured: the draft board, the elite cap,
the three-fronts resolver, empty fronts, frontage and deployment-as-a-bet are all implemented, tested and
batch-checked, and the engine is the single authority for every number the UI shows. What does not hold up is
the decision density of the per-battle layer as the player will actually experience it. Of the three
decisions a battle offers (doctrine, deployment, and the draft that feeds them), doctrine is a pure lookup
(match your general's style: +8% on every score, worth ~10 points over the best alternative and ~18 over the
average), and the deployment the rules page coaches is exactly the one the AI reader is tuned to beat (40%
per battle, 6% per campaign). On top of that the docs still carry v1 rules the engine no longer applies
(slot penalties, China's skirmish weight, `terrain.chargeAttacker`), the greedy AI still drafts as if the
v1 penalties were real, and two campaign promises (general death reported, "redeploy and retry") are not in
the client. All of this is knob-, copy- and client-level work; none of it needs a new resolver, so this is
NEEDS REVISION rather than MAJOR.

---

## Top 5 findings

### 1. Doctrine is a lookup: the style-match bonus dominates the plan table

**Evidence.** `packages/engine/data/rules.json` `styleMatchBonus: 1.08`; `packages/engine/src/prepare.ts:142-143`
multiplies *every* phase multiplier (skirmish, contact/roll-up, center press, wing press) by 1.08 when the
plan equals `styleToPlan[general.style]`. The four fronts plans differ by 0.9–1.3 on one or two fights each
(`rules.json` `fronts.plans`). The Deploy screen even says so: `apps/web/src/lib/deployText.ts:39` renders
"Matches Hannibal: +8% everywhere."

**Measured** (400 greedy-vs-greedy pairs, both default deployment, 4 battle seeds each, terrain cycling):
matching doctrine 44.3% win; average non-matching 26.4%; the *best* non-matching plan chosen with hindsight
34.4%. Per terrain the four plans sit within 3–9 points of each other (hills: 26–29 for all four), so terrain
never flips the choice. The greedy bot already plays the match (`src/batch/drafters.ts:120`), so BALANCE's
"plans within 4 pts" is measured on the *random* drafter and never sees this.

**Why it matters.** Doctrine is one of only two per-battle decisions, and the rules page sells it as a
decision ("Pick a doctrine … It nudges every stage"). As tuned, the right answer is printed on the general
card.

**Recommendation.** Make the match specific instead of global: the general's style boosts only its
signature fight (hammer → contact ×1.10; envelopment → wing ×1.10; attrition/defensive → steadiness ×1.08
and cohesion ×1.03; skirmish → skirmish ×1.12) and drop the flat 1.08. Then re-tune `fronts.plans` so the
terrain stakes (hills wings ×0.5, river contact ×0.7) can make an off-style plan correct. Acceptance: for
the greedy drafter, the best non-matching plan is within 3 points of the matching plan on at least two of
the four terrains; the matching plan is still best on plains.

### 2. The rules page coaches the deployment the AI is built to beat, and the field says "his line is hidden" while he has read yours

**Evidence.** `apps/web/src/app/rules/page.tsx:92`: "Cavalry earns its keep on a wing. Heavy infantry holds
the center." That is `defaultDeployment` (`src/deploy.ts:16-31`). The AI opponent deploys by
`deployAgainst` (`src/deploy.ts:90-105`), which *assumes the player deploys by that default* and simulates
~20 candidates against it over 6 private seeds (`src/api.ts:61`). The campaign calls it exactly so:
`apps/web/src/lib/campaign/CampaignProvider.tsx:50`. The Deploy header reads "HIS LINE IS HIDDEN"
(`apps/web/src/app/deploy/[battle]/page.tsx:119`), and mvp-plan §8 item 4 declined any hint.

**Measured** (300 pairs, the campaign's own call pattern): a player deploying by the coached default wins
39.7% of battles (BALANCE: 32–34% with random armies), 6% of campaigns. A player who also reads the roster
wins 56% of battles, 18% of campaigns. The whole gap is the reading; the rules page steers new players into
the losing half of it.

**Recommendation.** Tell the player the one fact that makes deployment a game: on the rules card and the
Deploy header, "He has read your roster and expects the obvious line. Surprise him." Reword card 3 from
advice to a description of the tradeoff ("Cavalry presses hardest on a wing, but he knows that too").
Consider making the read symmetric-but-cheap: the Deploy page already computes `defaultDeployment(b.foe)`
for the reserve tag (`deploy/[battle]/page.tsx:48`), so his *likely* shape is half-shown anyway; either
show it as "his obvious line: 2 · 4 · 2" or drop the reserve tag. See finding 4 for using reader depth as
the difficulty dial.

### 3. Slot penalties are a draft-time fiction under the fronts model, and the AI still pays them

**Evidence.** The draft still stamps every card with `penalty` and `wrecked` (`src/draft.ts:117-120`, from
`rules.slotPenalties`), and `classical-world-design-plan.md` §5 and `DECISIONS.md` 10–11 describe the
penalty table as live. In the fronts model `prepare.ts:90` sets `penalty: 1, wrecked: false` for every unit;
`battle-design-three-fronts.md` says "No slot penalties". So the "1 wild" card in a row (rules page:89) is
a free pick of a different class at full strength. But the greedy bot values a card at `cost × penalty − 6
if wrecked` (`src/batch/drafters.ts:76-78`), i.e. it still believes v1.

**Measured** (600 greedy boards): in 0.80 rows per army the bot passes over a strictly higher-cost off-class
card for a cheaper on-class one. Since cost is tuned to power (BALANCE: heavier army wins 75%), the AI foe
drafts measurably below what a player who knows the wild card is free can draft.

**Recommendation.** Decide and record it in DECISIONS: (a) the wild card is free — then delete
`penalty`/`wrecked` from `Card`, strike the penalty table from the design plan, value cards by cost in the
bot, and re-run the cost loop (the bot gets stronger; costs shift); or (b) the wild card should cost
something in this model — the cleanest fronts-native cost is "an off-class pick counts against the elite
cap" or "an off-class unit deploys at `reserveMult` on its off-front", but (a) is simpler and the
composition tradeoffs already self-regulate (BALANCE: 6 in the center 44%, 0 shooters 34%). Either way the
Numbers/rules copy should say the wild card is full strength.

### 4. Difficulty is flat, illegible and the player is told none of it

**Evidence.** mvp-plan §2 chooses flat difficulty (a deferred knob, fine). But `campaignFromSeed`
(`apps/web/src/lib/campaign/spec.ts:23-35`) draws three independent greedy foes with no banding, and
nothing on Today conveys strength: `apps/web/src/app/page.tsx:44` shows name, culture and ground only.

**Measured** (600 greedy foes): total cost p10/p50/p90 = 65/70/75, range 58–80; 2 elites in 67% of armies,
3 in 19%, 0–1 in 14%; general quality (command+tactics+charisma) p10/p90 = 185/250 (Flaminius to Hannibal).
Battle 1 is as likely to be the hardest as battle 3. Also 51/400 campaigns put a foe general in the
player's own pool of 3 ("Hannibal vs Hannibal" is possible), and 9/400 repeat a foe general.

**Recommendation.** Two client-only changes that respect "the engine does not change":
1. **Escalation by reader depth.** `deployAgainst(data, army, enemy, terrain, seeds)` already takes the
   seed count; the API pins it at 6 (`src/api.ts:61`). Give battle 1 a blind foe (`seeds = 0` →
   `defaultDeployment`), battle 2 three seeds, battle 3 six. Today can say it in words: "Chabrias deploys
   by the book · Surena has read your roster · Boudica has studied it." This is a legible, narratable
   ramp, needs one optional parameter on `aiDeploy`, and matches how DECISIONS 33 already distinguishes
   bots (3) from the AI opponent (6).
2. **Band foes by cost.** In `campaignFromSeed`, redraw `foeSeed` until `summarize(...).totalCost` falls in
   an ascending band (e.g. 60–66, 66–72, 72–80) and dedupe generals against each other and the player's
   pool. Deterministic, seed-derived, no engine change. Show "elites 2 · strength B+" per foe on Today.

### 5. China's level-2 "skirmish counts for more" is dead code, and the contact formula in the doc cites a terrain term the fronts resolver never uses

**Evidence.** `cultures.json` chn L2 `{ "phaseWeight": "skirmish", "value": 0.6 }`; `prepare.ts:125`
writes it to `PreparedArmy.phaseWeights`; only the v1 resolver reads that (`src/resolve.ts:203`). The
fronts resolver uses `R.weights.skirmish` from the rules (`src/resolveFronts.ts:277`). The player is told
otherwise: `apps/web/src/lib/text.ts:82` describes the entry as "the skirmish counts for more". Likewise
`battle-design-three-fronts.md` gives contact as `… × terrain.chargeAttacker × plan.charge …`, but
`resolveFronts.ts:123` has no such term (`terrainChargeMult` at `prepare.ts:152` is v1-only); the fronts
model scales *stakes* instead (`rules.json` `fronts.terrain.river.contact: 0.7`, `resolveFronts.ts:182,300`).
Multiplying both sides' scores by the same terrain factor would cancel in the edge anyway, so the doc
formula as written would do nothing. Separately, the per-class stat multipliers (`rules.terrain`, hills
cavalry ×0.8 …) are *still* applied in the fronts model (`prepare.ts:148-151`) on top of the stakes, and the
fronts doc does not mention them.

**Recommendation.** Either implement the entry in fronts (contest damage uses the *winner's* skirmish
weight, per DECISIONS 12: pass `s.army.phaseWeights.skirmish` into `contest()` for the skirmish stage) or
remove it from `cultures.json` and the trait copy. Rewrite the contact and press formulas in the fronts doc
to match the code: no `chargeAttacker`; `× steadinessMult`; `× frontageMult`; damage weight `× stakes(kind)`;
and a sentence that per-class terrain stat multipliers still apply before stakes.

---

## Strengths

- **One authority for every number.** `deployPreview`/`frontThreshold` (`src/preview.ts:11-16`) is the
  resolver's own threshold and is tested against it on every terrain (`test/preview.test.ts:22`). The
  cohesion words, reserve tag and empty-front cost on Deploy come from the rules, not copy.
- **Deployment is a measured decision.** BALANCE's swap tables (default 53%, refuse-a-wing 32%, all-center
  4%; reader +16) are exactly the evidence the pillar "every pick is a tradeoff, never a lookup" needs, and
  the empty-front rule is priced and shown (`deployText.ts:54-58`).
- **Composition self-regulates.** Shooters 2–3 best, center 4 best, 0 shooters 34%, 6 in the center 44%:
  the frontage rule and per-front skirmish did what they were added to do (DECISIONS 24–25).
- **The draft's consequence line** (`draftRules.ts:8-32`) makes the culture-threshold arithmetic and the
  elite cap legible per card, including the general counting as a unit and Persia's live cap.
- **Determinism and replay** are real: run strings round-trip, rerolls replay before picks, the RNG draw
  order is fixed (DECISIONS 15–16), and campaigns are data (`spec.ts`).
- **Balance discipline.** Targets, a trait toggle, paired swaps and a cost loop, with the misses written
  down (Greek L2, Persia) rather than hidden.
- **Terrain as stakes** is a good fix to "symmetric multipliers cancel", and it is shown on the field
  (`terrainLine`).

## Doc/code mismatches

| # | Doc says | Code does | Where |
|---|---|---|---|
| 1 | Contact score `× terrain.chargeAttacker` (three-fronts §The battle) | No such term; terrain scales stakes; per-class stat mults still apply | `resolveFronts.ts:123,182,300`; `prepare.ts:148-152` |
| 2 | China L2 raises the skirmish weight; UI says "the skirmish counts for more" | `phaseWeights` unread in fronts | `prepare.ts:125`; `resolveFronts.ts:277`; `text.ts:82` |
| 3 | Fronts doc lists every multiplier in the formulas | Combined Arms ×1.10 wing / ×1.05 center press is applied and undocumented; with 2 cavalry rows and 2 ranged rows it is on for nearly every army | `prepare.ts:135-137` |
| 4 | "In a campaign, general death ends the run" (three-fronts) vs "reported … changes nothing else" (mvp §2) | `generalFell` is computed and consumed by nothing: no reference in `beats.ts` or `apps/web` | `resolveFronts.ts:386` |
| 5 | Free campaign: "Redeploy and retry allowed" (mvp §1) | Only "Abandon this free campaign" exists | `apps/web/src/app/page.tsx:99-100`, `result/page.tsx:156` |
| 6 | "Reinforcements are campaign-only" | `resolve` is never called with `{ campaign: true }`, so the event can never fire | `CampaignProvider.tsx:51`; `resolveFronts.ts:169` |
| 7 | Slot penalty table (design plan §5), DECISIONS 10–11, `Card.penalty/wrecked` | Fronts model ignores penalties; greedy bot still applies them | `prepare.ts:90`; `drafters.ts:76-78` |
| 8 | DECISIONS 9: `dataVersion` "currently 1" | `rules.json` is 2 | — |
| 9 | Rules page "4 cards a row" | Cavalry rows for Gaul (2 cavalry units), Carthage/Greece/India (3) are short; ~11% of rows over 600 boards (DECISIONS 8 knows) | `draft.ts:99-114` |
| 10 | `draftRules.ts:22-27` handles an "off-culture fill" | Unreachable: `rollRow` only draws from the row's culture | `draft.ts:99` |
| 11 | Rules page "6 DOUBLES IT" | Level 2 is level 1 plus a small extra (grk: +steadiness 1.04; rom: +rule) | `cultures.json` |
| 12 | "He deploys as a reader against your roster" | The reader also sees your chosen doctrine: `assumed = { ...enemy, deployment }` keeps `plan`, and the campaign passes `mine` with the plan set | `deploy.ts:92`; `CampaignProvider.tsx:49-50` |
| 13 | mvp §5 routes include `/run/[runString]`; M5 "a friend opens a shared link" | No `run` route under `apps/web/src/app` | — |
| 14 | app-design.md (plan at draft, `/draft/[seed]`, single battle, 12-battle M5) | Superseded by mvp-plan but not marked so | `docs/app-design.md` |
| 15 | Rules page "Everyone gets the same board" | True of the daily only | `rules/page.tsx:56` |

## Degenerate strategies

1. **Doctrine = general's style.** See finding 1. Always right, on every terrain, by ~10 points over the best
   alternative.
2. **Highest cost wins; culture is a tiebreak.** Costs are tuned so win-rate-per-point is flat, so cost *is*
   power: ≥20% heavier wins 75% (≈1.8 pts per cost point). A level-1 trait is +4–6 pts, i.e. worth about
   3 cost points. Under the elite cap the live trade is B (7–9) vs C (5–6) for a threshold, which is
   roughly even, so the culture chase is a genuine marginal decision, but only there. The elite picks
   (which 2 of ~6 elites a board deals) are the draft's real decision; everything else is "take the
   highest cost". Show `totalCost` (already in `DraftSummary`) on the board sheet so the player can see
   the lever they are pulling.
3. **The wild card is free.** An S/A off-class card in any row is a full-strength pick (finding 3). Not
   army-breaking (composition self-limits), but the "wrecked" scare and the bot's discount are both wrong.
4. **Deploy by the book loses.** Not a dominant strategy but a dominant *trap*: the coached default is the
   one deployment the AI is guaranteed to have countered (finding 2).
5. **Persia four elites.** A Persian general with logistics ≥ 80 (Darius III, Artaxerxes II) plus three
   Persian units reaches cap 4 (`draft.ts:241-252`). Their command/tactics (55/45) pay for it and Persia is
   the weakest home culture (BALANCE), so this reads as a build, not an exploit. Keep, and mention the +1
   on the rules card ("or three with the right general" omits it).
6. **Greek level 2** is still the strongest trait (+10.4) and Greece has 7 line units, so a Greek general
   with two home line rows reaches 6 easily. Watch it; not blocking.

## Missing rules and edge cases

- **Ties.** `contest()` gives A the win on `sA >= sB` with zero damage (`resolveFronts.ts:226`); the
  reckoning gives A the win on equal army morale (`:375,378`); simultaneous rout → lower morale wins, tie
  → A. A is always the player, so ties are player-favouring and undocumented. Add one line to the fronts
  doc; no code change (no exact ties in 1,500 battles).
- **A front broken in the skirmish still fights at contact.** The contact loop checks only `units.length`,
  not `broken` (`resolveFronts.ts:286-300`); the press loop does (`:360`). Latent today: the maximum
  skirmish damage is 0.4 × 0.6 × 2 × 1.2 = 0.576, below the lowest threshold (~0.69), so no front can
  break before contact. It will wake up the first time `fronts.weights.skirmish` or a stake rises. Add
  the check and a test.
- **A free wing whose own center is broken gets one roll-up and then vanishes.** After `rollInto`, the
  charging units join the charger's own center (`:213-215`); if that center is broken the press loop
  skips it, so "intact wings that have already won their fronts can still save it by breaking the enemy
  center" (three-fronts doc) is true for exactly one hit. Suggest: if the joining front is broken, leave
  the wing free (do not set `rolledUp`) so it charges again each round.
- **Two empty fronts opposite each other** do nothing and neither side's neighbour becomes free; fine, but
  say so.
- **Elite over-cap after an unpick** (DECISIONS 14) makes `army` null and the Deploy route bounces to the
  draft (`deploy/[battle]/page.tsx:36`); confirm the board sheet states the problem rather than just
  returning the player to row 1.
- **Redeploy between battles** starts from an empty field every battle (`deploy/[battle]/page.tsx:44`).
  Fresh per battle is the decision, but "start from last battle's line" would remove eight taps × 2 and
  make the decision "what do I change for hills" instead of "place everyone again".
- **General collisions.** No dedupe of foe generals against each other or the player's pool (finding 4).
- **Score label.** `lossPct` is the *sum* of three per-battle casualty fractions (`CampaignProvider.tsx:107`),
  shown as "14% lost"; a conquered campaign can read up to 48% and a fallen one up to 112%. Show the mean
  ("lost 14% per battle") or reword ("losses 0.42 of three armies").
- **Rerolls.** Exhausted rerolls are handled ("No rerolls", `draft/[row]/page.tsx:147`); rerolling changes
  the row's culture (documented). `replayDraft` accepts any number of rerolls unless the caller passes the
  granted count (`draft.ts:331`); correct for Phase B, and a forged Phase A share string is by design
  unverified.
- **RNG draw order.** The per-elephant rampage check draws from the battle RNG conditionally
  (`resolveFronts.ts:315`), so DECISIONS 16's "adding events never shifts the noise draws" is no longer
  strictly true when elephants are present. Harmless within a data version; note it.

## Campaign structure

Three battles, one draft, any loss ends the run, no attrition, flat difficulty: the structure is coherent
and the decisions (mvp §9) are sound for an MVP. The problems are legibility and fairness of what the
player is *told*, not the structure:

- **Per-battle odds.** With the campaign's actual call pattern a book-deploying player wins ~40% of
  battles (6% of campaigns); a reading player ~56% (18%). For a one-attempt daily that is a hard game, and
  it is fine for a roguelite *if the player can see why they lost*. Today they cannot: the AI's read is
  invisible (finding 2), doctrine looks like a choice but is not (finding 1), and foe strength is hidden
  until Deploy (finding 4).
- **Escalation.** Deferred by decision, but the cheapest legible ramp is already a parameter: reader depth
  (finding 4). Cost banding is the second. Both live in the client.
- **Grounds known in advance** is a strength: the draft can lean center-heavy for hills/forest (wings
  ×0.5). Make sure the board sheet repeats "plains · hills · river" so the plan is made where the picks are.
- **Score.** Battles won, then losses, is right. Fix the percentage label.
- **The fallen general** is the most narratable beat the engine produces (20% of armies) and the client
  never says it. Add the line to `narrateBeats`' result beat and the campaign result.

## Point-budget recommendation

**Do not replace the elite cap with a point budget for the MVP. Use total cost as the difficulty dial and
show it; keep "budget draft" as the later mode the design plan already names.**

Reasoning:

1. Cost is already power (flat win-rate-per-point; ≥20% heavier wins 75%). A budget would therefore make
   every pick a real tradeoff, which is the pillar. But it trades the phone-readable "ELITE 2 / 2" for
   running arithmetic across eight rows, punishes boards that deal few high cards (unspendable budget,
   and the daily is one attempt on one board), and interacts badly with rerolls (a reroll becomes "can I
   find something to spend on"). The elite cap's cliff (B at 9 vs A at 10) is crude, but it is the one
   place the current draft is unmistakably a decision, and the batch is tuned around it.
2. What the draft is missing is not a budget but weight on the non-elite picks. Culture thresholds are
   worth ~3 cost points, which is exactly the B-vs-C gap, so those picks are already marginal decisions;
   the missing piece is that the player cannot see cost at all. Put `totalCost` on the board sheet next to
   the elite counter ("ARMY 68") and on the Deploy roster line ("his army 74"), and the player learns the
   lever without a rule change.
3. Where a budget *does* help immediately is on the foe: banding foe seeds by `totalCost` in
   `campaignFromSeed` gives the escalation the plan defers, deterministically, with no engine change.
4. If a budget mode ships later, make it a mode ("60 points, no elite cap, no rerolls"), measured
   separately, and keep the daily on the elite cap so daily boards stay comparable across players.

## Lower-priority notes

- **Cohesion words on wings.** On 300 default deployments (plains) the wings read BRITTLE 43–46% of the
  time and FIRM 7–8%; the center reads FIRM 25%. "Fix BRITTLE before you fight" (`rules/page.tsx:92`) is
  advice most wings cannot follow without the terrain-lean that measured −4. Either calibrate the words per
  front (wing scale) or reword: "Wings are brittle by nature. The center must not be."
- **`enemyRead`** (`deployText.ts:18`) says "Pack the center and his wings are one unit each" when he has
  six that stand; he is a reader, so his wings are whatever beats your default. Phrase it as his *obvious*
  line.
- **Reserve tag leaks his default shape** while the header says his line is hidden (finding 2). Own it or
  drop it.
- **Numbers page** formulas check out against the code (command 0.85 + 0.30·cmd; wing press 0.70 +
  0.60·tactics; cohesion 0.55/0.35/0.20; armor cover ≤ 50%; charge curve). Keep it; it is the best
  player-facing spec in the project.
- **TRAIT_GIST per** omits the battle-side steadiness Persia gained (DECISIONS 35); rules card 2 omits
  Persia's elite slot.
- **Combined Arms** (`prepare.ts:135-137`) is a near-constant multiplier under the fixed row structure;
  document it in the fronts doc or remove it and let the cost loop absorb the difference.
- **`deploymentCandidates`** never leaves the center empty (`deploy.ts:72`), so the AI never makes the
  all-wing mistake; fine, and worth a sentence in DECISIONS.
- **`aiDeploy` seeds are fixed at 1001–1006** (`deploy.ts:98`) regardless of battle seed; deterministic and
  documented as an accepted hole (mvp §6), but a free-campaign player who could retry (once retry exists)
  would face an identical AI line each time. If retry ships, redraw the foe's line from `battleSeed`.
- **`app-design.md`** should carry a one-line "superseded by mvp-plan.md for the MVP" header; its schema
  section is still the Phase B reference.
- **Copy.** "4 UNITS WAKES IT · 6 DOUBLES IT" → "6 SHARPENS IT"; "Everyone gets the same board" → "Today's
  board is the same for everyone".

## Method

Measurements were made with a throwaway script against `packages/engine/dist` (greedy bot armies,
`createEngine` on the shipped JSON): foe distribution over 600 seeds; cohesion words over 300 default
deployments on plains; doctrine over 400 greedy-vs-greedy pairs × 4 plans × 4 battle seeds; deployment over
300 pairs using `aiDeploy(foe, mine, terrain)` as the client does; side symmetry over 1,500 pairs in both
orders (side A wins 50.5%, so the player-is-A convention is not biased). No project files other than this
report were written.
