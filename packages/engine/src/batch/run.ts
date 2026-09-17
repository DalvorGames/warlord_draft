// Batch simulation: draft N pairs of armies, fight them, keep a compact record per battle.

import { mulberry32 } from "../rng.js";
import { resolveBattle } from "../resolve.js";
import { isOnClass } from "../draft.js";
import { deployAgainst } from "../deploy.js";
import { DRAFTERS, type DrafterName } from "./drafters.js";
import type { Army, GameData, Side, SlotKind, TerrainName, UnitClass } from "../types.js";

export interface SideRecord {
  generalId: string;
  culture: string;
  plan: string;
  totalCost: number;
  /** trait id → level, every trait the army fielded. */
  traits: Record<string, number>;
  units: { unitId: string; grade: string; cost: number; class: UnitClass; slot: SlotKind; onClass: boolean; penalty: number }[];
  cavCount: number;
  eliteCount: number;
  combinedArms: boolean;
  startsShaken: boolean;
  casualties: number;
  /** fronts model: units per front, shooters (ranged ≥ 30), whether the center broke, whether the general fell. */
  deployment?: { L: number; C: number; R: number };
  shooters?: number;
  centerBroke?: boolean;
  generalFell?: boolean;
}
export interface BattleRecord {
  i: number;
  seed: number;
  terrain: TerrainName;
  winner: Side;
  /** Winner with traits disabled on both sides (only in --trait-toggle mode). */
  winnerNoTraits?: Side;
  brokeInPhase: string;
  event: string | null;
  A: SideRecord;
  B: SideRecord;
}
export interface BatchOptions {
  n: number;
  seed: number;
  drafter: DrafterName;
  traitToggle: boolean;
  /** Private seeds each reader bot uses to pick its deployment (0 = blind default). */
  readerSeeds?: number;
}

const TERRAINS: TerrainName[] = ["plains", "hills", "river", "forest"];

function sideRecord(data: GameData, army: Army, prepared: ReturnType<typeof resolveBattle>["armies"]["A"], casualties: number): SideRecord {
  const traits: Record<string, number> = {};
  for (const t of prepared.traits) traits[t.id] = t.level;
  return {
    generalId: army.generalId,
    culture: prepared.general.culture,
    plan: army.plan,
    totalCost: prepared.totalCost,
    traits,
    units: prepared.units.map((u) => ({ unitId: u.unit.id, grade: u.unit.grade, cost: u.unit.cost, class: u.unit.class, slot: u.slot, onClass: data.rules.battleModel === "fronts" || isOnClass(u.unit, u.slot), penalty: u.penalty })),
    cavCount: prepared.units.filter((u) => u.role === "cavalry").length,
    eliteCount: prepared.units.filter((u) => u.unit.grade === "A" || u.unit.grade === "S").length,
    combinedArms: prepared.combinedArms,
    startsShaken: prepared.startsShaken,
    casualties,
  };
}

function frontsExtras(rec: SideRecord, r: ReturnType<typeof resolveBattle>, side: Side): void {
  if (!r.fronts) return;
  const fs = r.fronts[side];
  rec.deployment = { L: fs[0].unitIds.length, C: fs[1].unitIds.length, R: fs[2].unitIds.length };
  rec.shooters = r.armies[side].units.filter((u) => u.stats.ranged >= 30).length;
  rec.centerBroke = fs[1].broken;
  rec.generalFell = r.generalFell?.[side] ?? false;
}

export function runBatch(data: GameData, opts: BatchOptions, onProgress?: (done: number) => void): BattleRecord[] {
  const master = mulberry32(opts.seed);
  const drafter = DRAFTERS[opts.drafter];
  const out: BattleRecord[] = [];
  for (let i = 0; i < opts.n; i++) {
    const a = drafter(data, master.fork(), master.fork());
    const b = drafter(data, master.fork(), master.fork());
    const terrain = TERRAINS[master.int(TERRAINS.length)];
    const seed = master.fork();
    if (data.rules.battleModel === "fronts") {
      // Both bots deploy as readers (what the AI opponent will do), with few private seeds to keep the batch fast.
      a.deployment = deployAgainst(data, a, b, terrain, opts.readerSeeds ?? 3);
      b.deployment = deployAgainst(data, b, a, terrain, opts.readerSeeds ?? 3);
    }
    const r = resolveBattle(data, a, b, terrain, seed);
    const rec: BattleRecord = {
      i, seed, terrain, winner: r.winner, brokeInPhase: r.brokeInPhase, event: r.event?.applied ? r.event.id : null,
      A: sideRecord(data, a, r.armies.A, r.casualties.A),
      B: sideRecord(data, b, r.armies.B, r.casualties.B),
    };
    frontsExtras(rec.A, r, "A");
    frontsExtras(rec.B, r, "B");
    if (opts.traitToggle) rec.winnerNoTraits = resolveBattle(data, a, b, terrain, seed, { traits: false }).winner;
    out.push(rec);
    if (onProgress && (i + 1) % 1000 === 0) onProgress(i + 1);
  }
  return out;
}
