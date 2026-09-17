// Client-facing facade. A browser fetches data/*.json, calls createEngine(raw), and uses these methods.
// Everything here is pure and deterministic; nothing touches the filesystem.

import { buildData, type RawData } from "./data.js";
import * as draft from "./draft.js";
import { resolveBattle, type BattleResult, type ResolveOptions } from "./resolve.js";
import { defaultDeployment, deployAgainst, deploymentCandidates } from "./deploy.js";
import { prepareArmy } from "./prepare.js";
import { DRAFTERS, DRAFT_STATE_BOTS, type DrafterName } from "./batch/drafters.js";
import type { Army, Front, GameData, PlanName, TerrainName } from "./types.js";

export interface Engine {
  data: GameData;
  dataVersion: number;
  // draft
  startDraft(seed: number, opts?: { rerolls?: number }): draft.DraftState;
  pickGeneral(state: draft.DraftState, index: number): draft.DraftState;
  pickCard(state: draft.DraftState, row: number, card: number): draft.DraftState;
  unpickRow(state: draft.DraftState, row: number): draft.DraftState;
  rerollRow(state: draft.DraftState, row: number): draft.DraftState;
  setPlan(state: draft.DraftState, plan: PlanName): draft.DraftState;
  setDeployment(state: draft.DraftState, deployment: Front[] | null): draft.DraftState;
  summarize(state: draft.DraftState): draft.DraftSummary;
  validate(state: draft.DraftState): string[];
  toArmy(state: draft.DraftState): Army;
  toRunString(state: draft.DraftState): string;
  replayDraft(run: string, opts?: { rerolls?: number }): { state: draft.DraftState; army: Army | null };
  // deployment
  defaultDeployment(army: Army): Front[];
  deploymentCandidates(army: Army): Front[][];
  /** What the AI does: read the enemy roster and pick the deployment that sims best against its likely shape. */
  aiDeploy(army: Army, enemy: Army, terrain: TerrainName): Front[];
  // opponents
  aiDraft(seed: number, drafter?: DrafterName): Army;
  /** The bot's finished DraftState (plan set, no deployment) — serialise it with toRunString. */
  aiDraftState(seed: number, drafter?: DrafterName): draft.DraftState;
  // battle
  prepare(army: Army, terrain: TerrainName): ReturnType<typeof prepareArmy>;
  resolve(armyA: Army, armyB: Army, terrain: TerrainName, seed: number, opts?: ResolveOptions): BattleResult;
}

export function createEngine(raw: RawData): Engine {
  const data = buildData(raw);
  return {
    data,
    dataVersion: data.rules.dataVersion,
    startDraft: (seed, opts) => draft.startDraft(data, seed, opts),
    pickGeneral: (s, i) => draft.pickGeneral(data, s, i),
    pickCard: (s, r, c) => draft.pickCard(data, s, r, c),
    unpickRow: (s, r) => draft.unpickRow(s, r),
    rerollRow: (s, r) => draft.rerollRow(data, s, r),
    setPlan: (s, p) => draft.setPlan(s, p),
    setDeployment: (s, d) => draft.setDeployment(s, d),
    summarize: (s) => draft.summarize(data, s),
    validate: (s) => draft.validateDraft(data, s),
    toArmy: (s) => draft.toArmy(data, s),
    toRunString: (s) => draft.toRunString(s),
    replayDraft: (run, opts) => draft.replayDraft(data, run, opts),
    defaultDeployment: (a) => defaultDeployment(data, a),
    deploymentCandidates: (a) => deploymentCandidates(data, a),
    aiDeploy: (a, e, t) => deployAgainst(data, a, e, t),
    aiDraft: (seed, drafter = "greedy") => DRAFTERS[drafter](data, seed, seed ^ 0x9e3779b9),
    aiDraftState: (seed, drafter = "greedy") => DRAFT_STATE_BOTS[drafter](data, seed, seed ^ 0x9e3779b9),
    prepare: (a, t) => prepareArmy(data, a, t),
    resolve: (a, b, t, seed, opts) => resolveBattle(data, a, b, t, seed, opts),
  };
}
