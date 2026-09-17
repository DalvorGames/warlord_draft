# Campaign — Design Document

---
**Status**: Reverse-Documented
**Source**: `apps/web/src/lib/campaign/spec.ts`, `CampaignProvider.tsx`, `save.ts`; `apps/web/src/lib/daily.ts`; `apps/web/src/app/page.tsx`; plan of record `docs/mvp-plan.md`
**Date**: 2026-09-16
**Verified By**: designer (intent questions answered 2026-09-16; draft approved)
**Implementation Status**: Phase A (client-only) implemented; difficulty tiers decided, not built; Phase B (server verification) not started
---

> **Reverse-Documentation Notice**
>
> Created after the implementation existed. Plain-language companion: `docs/MECHANICS.md` §1.

## Summary

A campaign is one run of the game: draft one army, then fight three AI generals in a row on three different
grounds, redeploying and choosing a plan before each. Any loss ends the run. There is a daily campaign that is
the same for everyone on a given date, and free campaigns from a random seed. A campaign is pure data: one
seed fixes the board, the foes, the grounds and the battle seeds, and the save stores only the player's inputs.

> **Quick reference** — Layer: `Feature` · Priority: `MVP` · Key deps: `Draft`, `Deployment`, `Battle Resolution`, `Units & Generals`

---

## 1. Overview

**Purpose.** Give the draft a purpose and the battles a stake: one army, three tests, a result you can
compare with everyone else who played the same board today.

**Scope.** Campaign kinds (daily, free); deriving the campaign from a seed; the foes; the run structure and
ending rule; scoring; the save and history; resume and abandon. Excluded: the draft itself, deployment and
battle rules; server-side verification, ladders and "what everyone else took" (Phase B, not built).

**Current implementation.** `campaignFromSeed(engine, seed, id)` builds a `CampaignSpec` of three battles,
each `{ foe: runString, terrain, battleSeed }`. `CampaignProvider` holds the save in `localStorage`
(`wd.campaign.v1`), recomputes every army and result from inputs on each render, and writes a history entry
(`wd.history.v1`, last 50) when the run ends.

**Design intent (clarified 2026-09-16).**
- **One loss ends the run**, and that knife-edge is wanted: it suits a daily. But it is **tuned too hard**.
  Completion should land around 30%, not the 7–25% measured today.
- The **difficulty curve comes from the foes**, tiered by battle on two levers: the foe's **general**
  (easier first, a great one last) and the foe's **army cost** (a cheaper army first, a full-price one last).
  AI deployment strength stays uniform (Deployment §1).
- **Generals belong on the leaderboard.** A weaker general is a handicap the player chooses: among equal
  results, the run with the weaker general ranks higher, and every general has its own ranking (§3.4).
- The save is **inputs only**, so a result cannot be forged and the same inputs always replay the same way.

---

## 2. Player Fantasy

A campaign season in one sitting. You raise an army in the morning and march it against three named
commanders, each harder than the last, on ground you did not choose. Lose once and the army is gone; win all
three and you have conquered today's board, with a casualty figure to set against your friends'. The run is
short enough to play on a commute and the same for everyone, so it is worth talking about.

---

## 3. Detailed Rules

### 3.1 Kinds

1. **Daily.** Seed = FNV-1a hash of the local calendar date `YYYY-MM-DD`, mod 2³¹−1. Campaign id = the date.
   One per date: once a history entry with that id exists the home screen shows its headline instead of the
   start button. A daily in progress cannot be abandoned.
2. **Free.** Seed = a random integer; id = `free-<seed>`. Can be abandoned. Cannot be started while any
   campaign is in progress.

### 3.2 Deriving a campaign from a seed

1. The **draft** uses `startDraft(seed)`: the general pool and board come from the seed itself.
2. The **spec** uses a separate stream, `mulberry32(seed XOR 0x2545f491)`, and for each of three battles draws
   in order: a foe seed, a ground, a battle seed.
3. **Grounds** are drawn without replacement from plains, hills, forest, river, so the three battles are on
   three different grounds and one ground is unused.
4. Each **foe** is `aiDraftState(foeSeed, "greedy")` serialised as a run string: a random general from a
   random pool of three, a greedy draft on its own board, plan = its doctrine.

### 3.3 Run structure

| Stage | What the player does | Persisted |
|---|---|---|
| `general` | picks one of three generals | `draft.generalIndex` |
| `draft` | picks eight units, up to two rerolls | `draft`, current `row` |
| `deploy` (per battle) | places eight units, chooses a plan | `battles[i].plan`, `.deployment` |
| `battle` | watches the report | `battles[i].fought = true` |
| `between` (after a win) | reads the chronicle, marches on | `battleIndex + 1` |
| `result` | sees the outcome; history entry written | `finishedAt` |

5. The same drafted army fights all three battles. There is **no attrition**: casualties are reported and
   scored but units are at full strength every battle.
6. **Giving battle** resolves the battle from inputs: the player's army with that battle's plan and
   deployment, against the foe army deployed by `aiDeploy(foeArmy, playerArmy, terrain)`, on the spec's ground
   and seed.
7. **Ending.** The run is over when any battle is lost, or when all three are won ("conquered").

### 3.4 Score and history

8. Score today = battles won, then total casualties over the battles played (lower is better), shown as
   `lossPct`.
8a. **Decided direction (2026-09-16), needs Phase B for the ladder itself:**
   - **Global ranking:** battles won, then **general handicap** (the weaker the general, the higher the
     rank), then casualties.
   - **Per-general rankings:** how you did with your general against everyone who took the same general on
     the same board. Same board and same general leaves only the draft and the deployment, so this is the
     purest skill comparison the game can offer.
   - **Handicap** is a published number per general per data version, derived from the general's measured
     win rate in the batch tool, not from the raw stat sum (which misweights SUPPLY).
   - This turns the general pick from a lottery into a tradeoff (Pillar 1): take Hannibal and probably
     conquer, or take Flaminius and outrank everyone who conquered with Hannibal.
   - **Available without a backend:** show the handicap on the general card at pick time and on the result
     card ("Conquered with Flaminius, handicap +3").
9. A history entry records id, kind, general, won, played, total losses, a headline ("Fell at battle 2 to
   Hannibal Barca" or "Conquered, 31% lost"), the finish time, and one run string per battle played (draft,
   that battle's plan and deployment).

### 3.5 Save

10. The save holds inputs only: spec, draft state, per-battle plan, deployment and fought flag, stage, row,
    battle index, timestamps. Armies and results are recomputed from these every time.
11. If storage is unavailable (private mode, quota) the run still works in memory.

### 3.6 Decided change: tier foes by general and by army cost

12. Battle 1's foe is led by a weaker general, battle 2's by an average one, battle 3's by a strong one.
    Implementation sketch, client-only: draw foe seeds until the foe's general falls in the battle's band of
    summed stats (roster range 220–375, median 290), with a cap on attempts so derivation stays deterministic
    and cheap. Bands are tuning knobs (§7).
12a. **Army cost bands** (decided 2026-09-16, because general tiers alone are predicted to give only a 15–20
    point spread once COMMAND is softened): battle 1's foe drafts a cheaper army, battle 3's a full-price one.
    Cost is the strongest measured lever (a 7–12 point cost edge is worth about 34 win-rate points).
    Implementation sketch: draw foe seeds until both the general band and the cost band are met, or give the
    greedy drafter a cost ceiling per battle.
13. Foes must not collide with the player's general **without depending on the player's pick**, which would
    give different players different foes and break the shared board (Pillar 4). The pool of three offered
    generals is fixed by the seed, so exclude **all three** from the foes. The three foes are distinct.
14. The player should be able to see that the climb is a climb: show each foe's general stats on the
    between-battles and deploy screens (already shown on Deploy).

---

## 4. Formulas

### 4.1 Campaign completion

```
P(conquer) = p1 × p2 × p3
```

| Case | p1 | p2 | p3 | Completion |
|---|---|---|---|---|
| Today, default-style deployment | 0.40 | 0.40 | 0.40 | 6–7% |
| Today, cost parity and a good deployment | 0.53 | 0.53 | 0.53 | 15% |
| Today, best general | ~0.63 | ~0.63 | ~0.63 | 25% |
| **Target** (raised 2026-09-16) | 0.80 | 0.65 | 0.55–0.60 | 29–31% |

**Measured 2026-09-16** (600 campaigns per row, player-blind foes, a simulated reasoning player, today's
COMMAND): general tiers plus cost bands of 60 / 66 / full give **83.8% / 73.5% / 48.8% and 33.0%
completion**; a by-the-book player completes 21%. General tiers alone give 76.5 / 66.2 / 48.8 (29%). Making
the AI player-blind with flat foes already lifts a reasoning player from about 50% to about 64% per battle.
Ground does not mask the climb (per-ground win rates within 4 points). To centre on the target, raise battle
2's cost ceiling to about 68 and draw battle 3's general from the top half. See
`docs/reviews/2026-09-16-measurements.md` §3.

Today's figures are from the 2026-09-16 design and balance reviews. The first target set (0.75 / 0.60 /
0.50–0.55) multiplied to 22.5–24.75%, below the intended range, and was raised during the cross-review.

### 4.2 Score

```
rank by won (desc), then lossPct = Σ casualties over battles played (asc)
```

`casualties` per battle: winner 4–16%, loser 12–62% (Battle Resolution §3.9; the formula's 80% clamp is never
reached, since 0.12 + 0.35 + 0.15 = 0.62). A conquered run totals 12–48%.

### 4.3 Daily seed

```
seed = FNV1a(dateKey) mod 2147483647          dateKey = local YYYY-MM-DD
```

---

## 5. Edge Cases

| Scenario | Behaviour | Note |
|---|---|---|
| **Draft edited after a battle** | The draft screens remain reachable; results are recomputed from the new army, so past battles silently change | ⚠ defect: freeze the draft once battle 1 is given |
| **The AI sees the player's roster and plan** | `aiDeploy` simulates against the player's actual army including that battle's plan, so changing your plan can change where the enemy stands | ⚠ defect. Decided 2026-09-16: the campaign AI deploys from its own units and the ground only (Deployment §9.1) |
| Foe draws the player's general | Possible; nothing prevents it | excluded by removing the seed's whole pool of three from the foes (§3.6.13) |
| Two foes with the same general | Possible | to be excluded (§3.6.13) |
| Every placement tap recomputes fought battles | `battles` is memoised on `save`, so each tap at deploy re-resolves earlier battles, including about 120 AI simulations each | noticeable on a phone; removed by a precomputed player-blind foe line |
| Foe strength spread | Foe army cost ranges about 58–80 and generals from Flaminius to Hannibal, unbanded | the reason difficulty is flat and illegible today |
| Local-date daily | Two players in different time zones get different dailies at the same moment; changing the device clock gives a new daily | acceptable in Phase A; Phase B serves the daily |
| Old save after a rules change | The save's run strings may not replay on a new data version; the client crashes in `resolveAll` | flagged in the UX review; needs a version check and a graceful reset |
| Storage blocked | Run plays in memory and is lost on refresh | |
| Refresh mid-deploy | Partial placement is restored | |
| Daily already played | Start button replaced by the result headline | one attempt per date |
| Abandon | Free only; deletes the save, writes no history | |
| History cap | 50 entries; a replayed id replaces its entry | |
| General "falls" | Narration only; losing already ends the run | Battle Resolution §9 |
| `opts.campaign` | Not passed to `resolve`, so the Reinforcements event never fires | deferred |

---

## 6. Dependencies

**Depends on**
- **Draft**: `startDraft`, `replayDraft`, `toRunString`, `aiDraftState` (greedy) for foes; `validate`, `toArmy`.
- **Deployment**: `aiDeploy` for the foe; the player's per-battle plan and deployment.
- **Battle Resolution**: `resolve` for every fought battle; `casualties`, `winner`, `generalFell`, `recap`.
- **Units & Generals**: general stats for tiering; data version for replay.

**Depended on by**
- **All run screens** via `useCampaign`: Today, General, Draft, Board, Deploy, Battle, Between, Result.
- **Phase B verification**: the history entry's run strings are what a server would replay.

---

## 7. Tuning Knobs

| Knob | Current | Affects | Safe range | Notes |
|---|---|---|---|---|
| `BATTLES_PER_CAMPAIGN` | 3 | run length, completion | 3–5 | completion falls geometrically |
| Loss rule | any loss ends the run | tension, completion | — | decided: keep |
| Foe general band, battle 1 | none | p1 | stat sum ≤ ~270 | ⚠ decided: tier by general |
| Foe general band, battle 2 | none | p2 | ~270–310 | |
| Foe general band, battle 3 | none | p3 | ≥ ~310 | |
| Foe drafter | greedy | foe army quality | greedy; random for an easier tier | a second lever if generals alone are not enough |
| Foe army cost ceiling, battles 1 / 2 / 3 | none (greedy median 70) | the difficulty curve; variance between runs | measured: 60 / 66 / none gives 84 / 74 / 49; try 60 / 68 / none | ⚠ decided: second lever alongside general tiers |
| General handicap | none | ladder tiebreak; value of a weak general | derived from measured win rate | ⚠ decided direction; shown on cards before the ladder exists |
| Grounds | 3 of 4, no repeats | variety | — | |
| Dailies per date | 1 | stakes | 1 | |
| Free campaigns | unlimited | practice | — | |
| History length | 50 | — | — | |

**Targets after tiering:** per-battle win rates of about 80%, 65% and 55–60% for a competent player;
completion about 29–31%. Measure by simulating full campaigns with the greedy bot as the player.

---

## 8. Acceptance Criteria

**Implemented and observable**
- ✅ The same date gives the same general pool, board, foes, grounds and battle seeds on every device.
- ✅ Three battles on three different grounds.
- ✅ A lost battle ends the run; three wins is "conquered"; a history entry is written exactly once.
- ✅ A daily can be played once per date; a free campaign can be abandoned.
- ✅ Refreshing mid-run resumes at the same stage with the same inputs.
- ✅ The same save always recomputes the same results.

**Failing today**
- ❌ Editing the draft after battle 1 must not change battle 1's result.
- ❌ The foe's deployment must not depend on the player's roster, deployment or plan: the same foe on the same ground always stands the same way.
- ❌ Per-battle win rate rises in difficulty across the three battles (today flat at about 50%).
- ❌ Completion for a competent player is about 30% (today 7–25%).
- ❌ A save from an older data version fails gracefully.

**No automated tests exist for this system.** `campaignFromSeed` is pure and testable: determinism, distinct
grounds, distinct foes, foe ≠ player general, band membership after tiering.

**Definition of done**
- [ ] Foe tiers implemented and the four targets above measured.
- [ ] The two input-integrity defects fixed.
- [ ] Unit tests for `campaignFromSeed`.
- [ ] Save version check.

---

## 9. Open Questions and Follow-Up Work

### Decided 2026-09-16
1. **Tier foes by general and by army cost** per battle.
2. **One loss ends the run**, tuned easier: about 80 / 65 / 55–60% per battle, about 30% completion.
3. **Generals on the leaderboard:** weaker general ranks higher among equal results; per-general rankings;
   handicap from measured win rate (§3.4).
4. **Foes exclude the seed's whole general pool**, so the board stays shared.

### Open
3. *(Resolved 2026-09-16.)* General tiering alone was predicted to fall short, so foe army cost is tiered
   too. Measured 2026-09-16: the two levers together reach the curve, and ground does **not** mask it
   (per-ground win rates within 4 points), so ground stays random.
4. **Should the player see the whole campaign up front** (all three foes and grounds) before drafting? Today
   they are revealed one at a time. Seeing them first makes the draft a plan; hiding them keeps it a gamble.
5. *(Resolved 2026-09-16.)* The campaign AI is player-blind: it chooses a good layout from its own units and
   the ground. See Deployment §9.1. A side effect worth having: a foe's line can be precomputed into the
   campaign spec, so it is fixed by the seed like everything else.
6. **Time zone and clock:** acceptable until Phase B serves the daily.

### Deferred
7. `opts.campaign` and the Reinforcements event.
8. General death as anything more than narration.

### Flagged follow-up work
- [ ] Freeze the draft after the first battle is given (client: route guard plus provider check).
- [ ] Replace the `aiDeploy(foe, mine, terrain)` call in `resolveAll` with a player-blind layout (Deployment §9.1).
- [x] Campaign run scripts are in `packages/engine/src/cli/lab/` (`campaign.ts` for today's rules,
  `campaign_tiers.ts` for the decided levers).
- [ ] Move `campaignFromSeed` from the web app into the engine so the scripts and the client share it.
- [ ] Compute and publish a handicap per general from the batch report's general win rates.

---

## 10. Version History

| Date | Author | Changes |
|---|---|---|
| 2026-09-16 | Claude (reverse-doc) | Initial reverse-documentation from the campaign spec, provider, save and daily code; foe tiering and the loss rule decided with the designer |
| 2026-09-16 | designer + Claude | Cross-review fixes: casualty range, completion arithmetic. Decisions: raised win targets, foe army cost bands, foes exclude the seed's general pool, generals on the leaderboard with a handicap and per-general rankings |
