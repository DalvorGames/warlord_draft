// What the Deploy screen shows before a battle: per-front cohesion (the resolver's threshold), effective
// discipline, and how many units would stand in reserve. Same code the resolver uses, so the UI never
// re-implements a formula (docs/mvp-plan.md §4).

import { prepareArmy, type PreparedArmy, type PreparedUnit } from "./prepare.js";
import { FRONTS } from "./deploy.js";
import type { Army, Front, GameData, TerrainName } from "./types.js";

const avg = (arr: PreparedUnit[], f: (u: PreparedUnit) => number) => (arr.length ? arr.reduce((t, u) => t + f(u), 0) / arr.length : 0);

/** A front's cohesion threshold: 0.55 + 0.35·avgDis + 0.20·charisma, scaled by the plan's morale multiplier. */
export function frontThreshold(army: PreparedArmy, units: PreparedUnit[]): number {
  if (!units.length) return 0;
  const mp = army.moraleParts;
  return (0.55 + (avg(units, (u) => u.stats.discipline) / 100) * 0.35 + (mp.charisma / 100) * 0.2) * mp.mult;
}

/** Units on a front that stand behind the fighting line when `oppN` face them (frontage rule). */
export function reserveCount(data: GameData, n: number, oppN: number): number {
  if (n === 0) return 0;
  const k = Math.min(n, Math.ceil(Math.max(1, oppN) * data.rules.fronts.frontage));
  return n - k;
}

export interface FrontPreview {
  front: Front;
  unitIds: string[];
  count: number;
  /** Effective discipline after terrain multipliers, averaged. */
  avgDiscipline: number;
  threshold: number;
  /** Given the assumed opposing count (default: the enemy's default deployment, or 8/3 each). */
  reserve: number;
}

export interface DeployPreview {
  fronts: Record<Front, FrontPreview>;
  /** Morale-threshold multiplier of the chosen plan. */
  moraleMult: number;
}

/**
 * Preview an army's fronts on a terrain. `opposing` is how many enemy units you assume on each of *your*
 * fronts' opposites (L faces his R, and so on); it only affects the reserve count.
 */
export function deployPreview(data: GameData, army: Army, terrain: TerrainName, opposing?: Partial<Record<Front, number>>): DeployPreview {
  const p = prepareArmy(data, army, terrain);
  const fronts = {} as Record<Front, FrontPreview>;
  for (const f of FRONTS) {
    const units = p.units.filter((u) => u.front === f);
    const oppN = opposing?.[f] ?? Math.round(army.slots.length / 3);
    fronts[f] = {
      front: f,
      unitIds: units.map((u) => u.unit.id),
      count: units.length,
      avgDiscipline: avg(units, (u) => u.stats.discipline),
      threshold: frontThreshold(p, units),
      reserve: reserveCount(data, units.length, oppN),
    };
  }
  return { fronts, moraleMult: p.moraleParts.mult };
}

/** Cohesion word for the Deploy screen (handoff §4.4). */
export function cohesionWord(threshold: number): "FIRM" | "STEADY" | "BRITTLE" | "NOTHING HERE" {
  if (threshold <= 0) return "NOTHING HERE";
  if (threshold >= 1) return "FIRM";
  if (threshold >= 0.92) return "STEADY";
  return "BRITTLE";
}
