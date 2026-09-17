// Is the plan a decision? Plan-vs-plan matrices over many greedy rosters (mirror and cross), and how often
// each plan is the best choice for a roster against a fixed field of opponents. Also the general lottery.
import { readFileSync } from "node:fs";
import { data, greedyArmy, pct, PLANS } from "./lib.js";
import { mulberry32 } from "../../rng.js";
import { resolveBattle } from "../../resolve.js";
import type { Army, TerrainName } from "../../types.js";

const TERRAINS: TerrainName[] = ["plains", "hills", "river", "forest"];
const m = mulberry32(2024);
const R = Number(process.argv[2] ?? 300);
const rosters: Army[] = Array.from({ length: R }, () => greedyArmy(m.fork(), m.fork()));
const field: { b: Army; t: TerrainName; seed: number }[] = Array.from({ length: 24 }, () => ({ b: greedyArmy(m.fork(), m.fork()), t: TERRAINS[m.int(4)], seed: m.fork() }));

const matrix = (label: string, pair: (i: number) => [Army, Army, TerrainName]) => {
  console.log(`\n## ${label} (row plan for A, column plan for B; A win %)`);
  console.log("            " + PLANS.map((p) => p.slice(0, 4).padStart(6)).join(""));
  const rowAvg: number[] = [];
  for (const pa of PLANS) {
    const cells: string[] = []; let tot = 0;
    for (const pb of PLANS) {
      let w = 0, n = 0;
      for (let i = 0; i < R; i++) { const [a, b, t] = pair(i); const r = resolveBattle(data, { ...a, plan: pa }, { ...b, plan: pb }, t, 5000 + i); n++; if (r.winner === "A") w++; }
      cells.push(pct(w / n, 0).padStart(6)); tot += w / n;
    }
    rowAvg.push(tot / PLANS.length);
    console.log(`${pa.padEnd(12)}${cells.join("")}   avg ${pct(tot / PLANS.length, 0)}`);
  }
};
matrix("Mirror: same roster and general both sides, default deployment", (i) => [rosters[i], rosters[i], TERRAINS[i % 4]]);
matrix("Cross: roster i vs roster (i+1), default deployment", (i) => [rosters[i], rosters[(i + 1) % R], TERRAINS[i % 4]]);

console.log("\n## Best plan per roster against a fixed field of 24 opponents (opponent plays its general's style plan)");
const bestCount: Record<string, number> = {}; const gap: number[] = []; const styleIsBest: number[] = [];
const byStyle: Record<string, Record<string, number>> = {};
for (const a of rosters) {
  const wr: Record<string, number> = {};
  for (const p of PLANS) { let w = 0; for (const f of field) if (resolveBattle(data, { ...a, plan: p }, f.b, f.t, f.seed).winner === "A") w++; wr[p] = w / field.length; }
  const sorted = PLANS.slice().sort((x, y) => wr[y] - wr[x]);
  bestCount[sorted[0]] = (bestCount[sorted[0]] ?? 0) + 1;
  gap.push(wr[sorted[0]] - wr[sorted[3]]);
  const style = data.rules.styleToPlan[data.generalById.get(a.generalId)!.style];
  styleIsBest.push(wr[style] >= wr[sorted[0]] - 1e-9 ? 1 : 0);
  byStyle[style] ??= {}; byStyle[style][sorted[0]] = (byStyle[style][sorted[0]] ?? 0) + 1;
}
console.log("plan is best for N rosters: " + PLANS.map((p) => `${p} ${bestCount[p] ?? 0}`).join("  "));
console.log(`mean gap best − worst plan for the same roster: ${pct(gap.reduce((t, x) => t + x, 0) / gap.length)}; general's style plan is best in ${pct(styleIsBest.reduce((t, x) => t + x, 0) / styleIsBest.length)} of rosters`);
for (const [s, c] of Object.entries(byStyle)) console.log(`  generals whose style → ${s.padEnd(12)}: best plan was ` + Object.entries(c).sort((a, b) => b[1] - a[1]).map(([p, n]) => `${p} ${n}`).join(", "));

// ---- General lottery: expected quality of the best of a 3-pool ----
const rep = JSON.parse(readFileSync("./out/final-fronts/report-greedy.json", "utf8"));
const wrs: number[] = rep.generals.map((g: any) => g.wr).sort((a: number, b: number) => a - b);
const G = wrs.length; let eMax = 0, eMin = 0, eMid = 0;
const rng = mulberry32(5);
for (let i = 0; i < 20000; i++) { const s = [wrs[rng.int(G)], wrs[rng.int(G)], wrs[rng.int(G)]].sort((a, b) => a - b); eMin += s[0]; eMid += s[1]; eMax += s[2]; }
console.log(`\n## General lottery (batch greedy wr as quality): pool of 3 → E[best] ${pct(eMax / 20000)}, E[median] ${pct(eMid / 20000)}, E[worst] ${pct(eMin / 20000)}; all-general mean ${pct(wrs.reduce((t, x) => t + x, 0) / G)}, p10 ${pct(wrs[Math.floor(G * 0.1)])}, p90 ${pct(wrs[Math.floor(G * 0.9)])}`);
const stats = data.generals.map((g) => g.stats);
console.log("generals with command ≥ 85:", stats.filter((s) => s.command >= 85).length, "; command ≤ 60:", stats.filter((s) => s.command <= 60).length, "; logistics ≥ 80 (3 elites):", stats.filter((s) => s.logistics >= 80).length, "of", G);
