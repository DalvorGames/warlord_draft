import { loadData } from "../src/node/loadData.js";
import { resolveBattle } from "../src/resolve.js";
import type { Army, PlanName, TerrainName } from "../src/types.js";

export const data = loadData();
export const SLOTS = data.rules.slots;

/** Build an Army from 8 unit ids in slot order (line, line, shock, cavalry, cavalry, ranged, ranged, flex). */
export function army(generalId: string, plan: PlanName, ids: string[]): Army {
  if (ids.length !== 8) throw new Error("need 8 unit ids");
  return { generalId, plan, slots: ids.map((unitId, i) => ({ slot: SLOTS[i], unitId })) };
}

/** Win rate of A over `n` seeds, traits disabled so only stats and matchups speak. */
export function winRate(A: Army, B: Army, terrain: TerrainName, n = 2000, traits = false): number {
  let wins = 0;
  for (let s = 1; s <= n; s++) if (resolveBattle(data, A, B, terrain, s, { traits }).winner === "A") wins++;
  return wins / n;
}
