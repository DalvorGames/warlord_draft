# Warlord Draft

Monorepo (npm workspaces):

```
packages/engine   the battle engine: src/, data/, scripts/, test/ → dist/   (docs below refer to this package)
apps/web          the Next.js client (docs/mvp-plan.md, docs/ui-handoff/UI-HANDOFF.md)
docs/             design docs, decisions, balance notes, UI handoff
```

Root scripts: `npm run dev` (builds the engine, copies data, starts the web app), `npm run build`,
`npm test`, `npm run typecheck`. Engine CLIs run from `packages/engine` (or `npm run engine -- battle -- --seed 42`).

---

# Warlord Draft — engine

Pure, deterministic engine for the draft-and-simulate game described in `docs/classical-world-design-plan.md`
and specified in `docs/HANDOFF.md`. No UI. Decisions where the spec was unclear are in `docs/DECISIONS.md`;
the balance log is `docs/BALANCE.md`.

```
npm install
npm run build:data          # scripts/build_data.mjs → data/*.json (roster source of truth)   [run in packages/engine]
npm test                    # vitest: draft, replay, resolver invariants, fixture targets
npm run battle -- --seed 42 --terrain hills [--drafter greedy|random] [--runA <run> --runB <run>]
npm run batch -- --n 10000 --drafter both --trait-toggle [--units all] [--out out/]
npx tsx src/cli/sweep.ts --n 6000 --grid '{"phaseWeights.skirmish":[0.4,0.5]}'   # rules grid
npx tsx src/cli/swap.ts --slot 7 --units mac_elephants,mac_hypaspists            # paired unit swap
node scripts/tune_costs.mjs --rounds 6 --n 30000 --band 5                        # cost loop (edits build_data.mjs)
```

Layout: `src/rng.ts` → `data.ts` → `draft.ts` → `deploy.ts` → `prepare.ts` → `resolveFronts.ts` (the
three-fronts battle; `resolve.ts` dispatches and keeps the HANDOFF v1 resolver) → `recap`; batch tooling
under `src/batch/` and `src/cli/`. Nothing under `src/` except `src/node/` touches the filesystem.

**Client entry point:** `src/api.ts`. A browser fetches the four files in `data/` and calls
`createEngine({ units, generals, cultures, rules })`; the returned object has the draft transitions
(`startDraft`, `pickGeneral`, `pickCard`, `rerollRow`, `setPlan`, `setDeployment`, `toRunString`,
`replayDraft`), deployment helpers (`defaultDeployment`, `aiDeploy`), an AI drafter (`aiDraft`), and
`resolve(armyA, armyB, terrain, seed)`. Same inputs and seed give the same battle on any client.

Data version is frozen at 2 for the MVP; bump it in `scripts/build_data.mjs` when a change would make
old run strings replay differently.

Design docs: `docs/battle-design-three-fronts.md` (current battle model), `docs/DECISIONS.md`,
`docs/BALANCE.md`. `docs/HANDOFF.md` and `docs/classical-world-design-plan.md` are the originals.
