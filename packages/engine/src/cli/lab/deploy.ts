// Deployment variants for army A against the real AI opponent (greedy draft, reader deploy with 6 seeds).
import { data, greedyArmy, pct, ci95 } from "./lib.js";
import { mulberry32 } from "../../rng.js";
import { resolveBattle } from "../../resolve.js";
import { defaultDeployment, deployAgainst } from "../../deploy.js";
import type { Army, Front, TerrainName } from "../../types.js";

const n = Number(process.argv[2] ?? 1200);
const master = mulberry32(77);
const TERRAINS: TerrainName[] = ["plains", "hills", "river", "forest"];
const units = (a: Army) => a.slots.map((s) => data.unitById.get(s.unitId)!);
const wingPower = (u: ReturnType<typeof units>[number]) => u.stats.mobility * 0.4 + u.stats.melee * 0.4 + u.stats.shock * 0.2;

const battles: { a: Army; b: Army; terrain: TerrainName; seed: number }[] = [];
for (let i = 0; i < n; i++) {
  const a = greedyArmy(master.fork(), master.fork());
  const b = greedyArmy(master.fork(), master.fork());
  const terrain = TERRAINS[master.int(4)];
  b.deployment = deployAgainst(data, b, a, terrain, 6); // the AI, exactly as api.ts does it
  battles.push({ a, b, terrain, seed: master.fork() });
}
const bySize = (a: Army, c: number): Front[] => { // c strongest center-type units in the center by centerQ, rest to wings by wing power
  const us = units(a); const q = (u: (typeof us)[number]) => u.stats.melee * 0.5 + u.stats.armor * 0.3 + u.stats.discipline * 0.2;
  const idx = us.map((_, i) => i).sort((x, y) => q(us[y]) - q(us[x]));
  const d: Front[] = new Array(us.length).fill("C"); const wings = idx.slice(c).sort((x, y) => wingPower(us[y]) - wingPower(us[x]));
  wings.forEach((i, k) => (d[i] = k % 2 ? "R" : "L")); return d;
};
const variants: { name: string; fn: (a: Army, t: TerrainName, b: Army) => Front[] }[] = [
  { name: "default heuristic (blind)", fn: (a) => defaultDeployment(data, a) },
  { name: "reader 3 seeds (what batch bots do)", fn: (a, t, b) => deployAgainst(data, a, b, t, 3) },
  { name: "reader 6 seeds (same as the AI)", fn: (a, t, b) => deployAgainst(data, a, b, t, 6) },
  { name: "reader 12 seeds", fn: (a, t, b) => deployAgainst(data, a, b, t, 12) },
  { name: "center 2 by quality, 3/3 wings", fn: (a) => bySize(a, 2) },
  { name: "center 3 by quality", fn: (a) => bySize(a, 3) },
  { name: "center 4 by quality", fn: (a) => bySize(a, 4) },
  { name: "center 5 by quality", fn: (a) => bySize(a, 5) },
  { name: "center 6 by quality, 1/1", fn: (a) => bySize(a, 6) },
  { name: "all center", fn: (a) => a.slots.map(() => "C") },
  { name: "refuse right (default, R→L)", fn: (a) => defaultDeployment(data, a).map((f) => (f === "R" ? "L" : f)) },
  { name: "swap wings", fn: (a) => defaultDeployment(data, a).map((f) => (f === "L" ? "R" : f === "R" ? "L" : f)) },
];
console.log(`n=${n} paired greedy-vs-greedy matchups; B = AI (reader, 6 seeds). A re-deployed per variant.`);
for (const v of variants) {
  let wins = 0; const byT: Record<string, [number, number]> = {};
  for (const bt of battles) {
    const a = { ...bt.a, deployment: v.fn(bt.a, bt.terrain, bt.b) };
    const w = resolveBattle(data, a, bt.b, bt.terrain, bt.seed).winner === "A" ? 1 : 0; wins += w;
    byT[bt.terrain] ??= [0, 0]; byT[bt.terrain][0] += w; byT[bt.terrain][1]++;
  }
  console.log(`${v.name.padEnd(40)} ${pct(wins / n).padStart(6)} ${ci95(wins, n)}   ` + TERRAINS.map((t) => `${t} ${pct(byT[t][0] / byT[t][1], 0)}`).join("  "));
}
