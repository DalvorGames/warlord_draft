# Lab scripts

One-off measurement scripts, kept so design questions can be re-asked after a rules change. They import the
engine source directly and are excluded from the published build (`tsconfig.build.json` excludes `src/cli`).
Run from `packages/engine`:

| Script | Question | Usage |
|---|---|---|
| `campaign_tiers.ts` | Do foe general tiers and army cost bands give the intended difficulty curve and completion rate? Foes deploy player-blind | `npx tsx src/cli/lab/campaign_tiers.ts [N=600]` |
| `traits.ts` | What size must each trait be to lift win rate by the level targets? Searches each magnitude over paired battles | `npx tsx src/cli/lab/traits.ts [N=3000] [targets=4,8,12]` |
| `trait_combos.ts` | How do traits add up (general plus culture, depth against breadth, trait against trait)? | `npx tsx src/cli/lab/trait_combos.ts [N=3000]` |
| `trait_pool.ts` | The proposed fifteen traits with their measured sizes (lab data; nothing shipped reads it) | — |
| `campaign.ts` | Campaign completion under today's live rules (roster-reading AI, flat foes) | `npx tsx src/cli/lab/campaign.ts [N=1200]` |
| `command_sweep.ts` | How much do generals decide? Sweeps `rules.command` | `npx tsx src/cli/lab/command_sweep.ts [n=20000]` |
| `style_bonus.ts` | How often is the doctrine plan the best plan, per `styleMatchBonus`? | `npx tsx src/cli/lab/style_bonus.ts` |
| `plans.ts` | Plan table: which plan wins where | `npx tsx src/cli/lab/plans.ts` |
| `deploy.ts` | Deployment shapes against the shipped AI | `npx tsx src/cli/lab/deploy.ts` |
| `draft_econ.ts` | Draft heuristics, rerolls, elite count | `npx tsx src/cli/lab/draft_econ.ts` |
| `power.ts` | Static unit power proxy against cost | `npx tsx src/cli/lab/power.ts` |
| `boundaries.ts` | Formula boundary values (NaN, negatives, unbreakable fronts) | `npx tsx src/cli/lab/boundaries.ts` |
| `lib.ts` | Shared helpers: a parametrised greedy drafter (rerolls, culture chase, general choice, cost budget) | — |

Several read `out/final-fronts/report-greedy.json` for measured general win rates; regenerate it with
`npm run batch -- --drafter greedy --out out/final-fronts` after a rules change.

CHARGE-stacking deployments live in `src/cli/deploy_swap.ts` alongside the other deployment variants.
Results of the 2026-09-16 runs: `docs/reviews/2026-09-16-measurements.md`.

## Note, 2026-09-17

These scripts were written against data version 2 (general `style`, culture `level1`/`level2`, the old board).
Data version 3 removed those fields, so they are excluded from `tsc` (`tsconfig.json`) and will need updating
before they run again. `campaign_tiers.ts` and `general_traits_sim.ts` are superseded by the engine's own
`campaign.ts` and `traits.ts`; the measurement they did is now a plain script over `campaignFromSeed`.
