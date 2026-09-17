// How much of the "doctrine plan is always best" comes from styleMatchBonus? Sweep it in memory.
import { data, greedyArmy, pct, PLANS } from "./lib.js";
import { mulberry32 } from "../../rng.js";
import { resolveBattle } from "../../resolve.js";
import type { Army, TerrainName } from "../../types.js";

const TERRAINS: TerrainName[] = ["plains", "hills", "river", "forest"];
const m = mulberry32(2024);
const R = 240;
const rosters: Army[] = Array.from({ length: R }, () => greedyArmy(m.fork(), m.fork()));
const field = Array.from({ length: 24 }, () => ({ b: greedyArmy(m.fork(), m.fork()), t: TERRAINS[m.int(4)], seed: m.fork() }));
for (const bonus of [1.08, 1.06, 1.04, 1.02, 1.0]) {
  (data.rules as any).styleMatchBonus = bonus;
  const bestCount: Record<string, number> = {}; let gapSum = 0, styleBest = 0, styleGap = 0;
  const byTerrainBest: Record<string, Record<string, number>> = {};
  for (const a of rosters) {
    const wr: Record<string, number> = {};
    for (const p of PLANS) { let w = 0; for (const f of field) if (resolveBattle(data, { ...a, plan: p }, f.b, f.t, f.seed).winner === "A") w++; wr[p] = w / field.length; }
    const sorted = PLANS.slice().sort((x, y) => wr[y] - wr[x]);
    bestCount[sorted[0]] = (bestCount[sorted[0]] ?? 0) + 1;
    gapSum += wr[sorted[0]] - wr[sorted[3]];
    const style = data.rules.styleToPlan[data.generalById.get(a.generalId)!.style];
    if (wr[style] >= wr[sorted[0]] - 1e-9) styleBest++;
    styleGap += wr[sorted[0]] - wr[style];
  }
  console.log(`styleMatchBonus ${bonus}: best plan counts ` + PLANS.map((p) => `${p.slice(0, 3)} ${bestCount[p] ?? 0}`).join(" ") + `; doctrine plan best in ${pct(styleBest / R)}; mean cost of playing doctrine vs best ${pct(styleGap / R)}; mean best−worst gap ${pct(gapSum / R)}`);
}
