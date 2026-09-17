# Measurements, 2026-09-16

*Run after the cross-GDD review (`design/gdd/gdd-cross-review-2026-09-16.md`) to test its predictions. Engine at
data version 2, unchanged rules unless a row says otherwise. Armies drafted by the greedy bot. Raw output is
in `packages/engine/out/lab/` (gitignored); the scripts are in `packages/engine/src/cli/lab/` and
`src/cli/deploy_swap.ts`.*

## 1. Is massing CHARGE on one front a dominant deployment? No.

`npx tsx src/cli/deploy_swap.ts --n 3000 --drafter greedy --b default` (3,000 paired matchups; the enemy uses
the default line).

| Player's deployment | Win rate |
|---|---|
| Default heuristic | 48.8% |
| **Reader: simulates ~20 candidate lines against the enemy's default** | **66.5%** |
| Swap wings | 47.9% |
| Terrain lean | 43.6% |
| Stack CHARGE: top 3 on the left | 37.9% |
| Stack CHARGE: top 3 on the best-matchup front | 33.7% |
| Stack CHARGE: top 3 in the center | 29.3% |
| Stack CHARGE: top 4 in the center | 28.5% |
| Stack CHARGE: top 4 on the left | 27.1% |
| Stack CHARGE: top 4 on the best-matchup front | 24.4% |
| Center 3, wings 3/2 | 32.3% |
| Refuse a flank | 10–15% |
| All center | 0.7% |

**Finding.** Every stacking variant loses to the plain default by 11 to 24 points. The squared CHARGE curve
is not an exploitable stat-stack: pulling shock troops off their natural fronts costs more in frontage,
cohesion and thin wings than the squared impact returns. Together with the curve sweep (flattening
`chargeCurve` from 1 to 0.5 moves nothing by more than a point or two), the cross-review's finding 4 is
**retired**. `chargeCurve` can stay at 1.

**Second finding, more important.** A player who reasons about the enemy roster beats a player-blind,
default-deploying AI **66.5%** of the time at equal army cost and random generals. That is what the decided
player-blind AI will feel like if it simply uses the default. It confirms the cross-review's finding 3: the
AI needs the seeded choice among near-tied lines, and probably a better own-roster line than the default.

## 2. Does softening COMMAND shrink the general lottery? Barely.

`npx tsx src/cli/lab/command_sweep.ts 20000` (20,000 battles per variant).

| COMMAND factor | General win rate, min–max | SD | r with COMMAND | r with TACTICS | r with CHARISMA | r with SUPPLY |
|---|---|---|---|---|---|---|
| Today: 0.85 + 0.30·C | 23%–83% | 11.9 | 0.92 | 0.86 | 0.62 | 0.35 |
| Halfway: 0.875 + 0.25·C | 23%–82% | 11.0 | 0.90 | 0.86 | 0.62 | 0.33 |
| Full: 0.90 + 0.20·C | 26%–79% | 10.2 | 0.88 | 0.86 | 0.61 | 0.33 |
| **None: 1.00 + 0·C** | **34%–67%** | **6.9** | 0.68 | 0.81 | 0.58 | 0.23 |

**Finding.** The planned softening takes the spread from 60 points to 53. Even deleting COMMAND entirely
leaves a 33-point spread. The reason is in the data, not the formula: **the four general stats are strongly
correlated with each other** (COMMAND–TACTICS 0.78, COMMAND–CHARISMA 0.53, TACTICS–CHARISMA 0.42). Great
generals are great at everything, so TACTICS and CHARISMA carry the lottery when COMMAND is muted. With
COMMAND removed, Hannibal and Alexander are still the two best.

**Implication.** Softening COMMAND is not the lever for the general lottery. The options are (a) embrace the
spread and price it with the designer's **handicap ladder**, which this result strongly supports; (b)
de-correlate the general data so each general is good at one or two things; or (c) both. COMMAND's formula
can stay as it is, or soften slightly for taste; it will not decide the question.

## 3. Can foe tiers deliver the 80 / 65 / 55–60 curve? Yes, close, with both levers.

`npx tsx src/cli/lab/campaign_tiers.ts 600` (600 campaigns per row). Foes deploy player-blind (their default
line), exclude the player's pool of three generals, and are distinct. General tiers = foe general drawn from
the bottom / middle / top third by measured win rate. Cost bands = a total army cost ceiling for the foe's
draft. Player army cost averages 70. COMMAND at today's value.

| Foes | Player | Battle 1 | Battle 2 | Battle 3 | Completion |
|---|---|---|---|---|---|
| Flat, player-blind | by the book | 48.5% | 52.7% | 50.5% | 18.2% |
| Flat, player-blind | reasoning | 63.3% | 65.2% | 64.8% | 28.8% |
| General tiers only | by the book | 63.5% | 52.3% | 36.3% | 17.5% |
| General tiers only | reasoning | 76.5% | 66.2% | 48.8% | 29.0% |
| Cost bands only (60 / 66 / full) | by the book | 66.2% | 58.0% | 50.5% | 24.8% |
| Cost bands only (60 / 66 / full) | reasoning | 78.0% | 68.3% | 64.8% | 37.5% |
| **Tiers + cost bands (60 / 66 / full)** | by the book | 76.0% | 59.8% | 36.3% | 21.0% |
| **Tiers + cost bands (60 / 66 / full)** | **reasoning** | **83.8%** | **73.5%** | **48.8%** | **33.0%** |
| Tiers + wide bands (56 / 64 / full) | by the book | 80.2% | 61.8% | 36.3% | 24.0% |
| Tiers + wide bands (56 / 64 / full) | reasoning | 88.7% | 75.7% | 48.8% | 36.5% |

Mean foe army cost with the 60 / 66 / full bands: 62.5, 66.5, 71.1. Mean foe-general win rate by tier: 36%,
50%, 64%. For comparison, today's live rule (roster-reading AI, flat foes) gives a reasoning player about 50%
per battle and 15% completion.

**Findings.**
- **Making the AI player-blind is by itself the biggest difficulty change**: a reasoning player goes from
  about 50% to about 64% per battle, and completion from 15% to 29%, before any tiering.
- **General tiers alone give a 28-point climb** (76 → 49) at today's COMMAND. The cross-review predicted
  15–20 points after softening; since softening barely matters (section 2), tiers stay effective.
- **Both levers together land near the target**: 84 / 74 / 49 and 33% completion against a target of
  80 / 65 / 55–60 and about 30%. Battle 2 is a little easy and battle 3 a little hard. Two small adjustments
  would centre it: raise battle 2's cost ceiling to about 68, and draw battle 3's general from the top half
  rather than the top third.
- **A by-the-book player completes 21–24%**, so the gap between reasoning and rote is about 12 points of
  completion. Deployment skill shows up in the result, which is what the core fantasy asks for.
- **Ground barely matters to the curve**: per-ground win rates sit within 4 points of each other in every
  row. The cross-review's worry that random ground would mask the climb is **not supported**.

## 4. Earlier the same day: doctrine bonus and CHARGE curve

See the addendum of the cross-review. In short: the ≤ 60% "doctrine plan is best" target needs
`styleMatchBonus` of about 1.02–1.03, and with no bonus the Defensive plan is best for only 10% of rosters,
so the plan table needs Defensive strengthened. Flattening `chargeCurve` has almost no aggregate effect.

## Status of the cross-review's five design blockers

| Blocker | Status after measuring |
|---|---|
| SUPPLY double dip | Open. Cannot be measured until the new board exists. SUPPLY's correlation with win rate today is only 0.35 |
| Difficulty levers conflict | **Resolved.** Tiers plus cost bands reach the curve; ground does not mask it; COMMAND softening does not undermine tiers |
| Player-blind AI is a solved read | **Confirmed.** 66.5% for a reasoning player against a default-deploying AI. Needs the seeded choice and a better own-roster line |
| CHARGE² stat-stack | **Retired.** Stacking loses to the default by 11–24 points |
| Rewarded reroll claim | Settled by design (one extra reroll open to everyone); its value still needs measuring on the new board |

## What these runs do not show

Bot-drafted armies and a simulated "reasoning player" (three simulations per candidate line) stand in for
people. Absolute numbers will differ with real players; comparisons between rows are the reliable part.
Nothing here includes the decided but unbuilt changes to the ground, the draft board or SUPPLY.
