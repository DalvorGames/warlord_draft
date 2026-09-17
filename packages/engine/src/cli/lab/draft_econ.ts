// Draft economics: value of the greedy heuristic's parts, rerolls, elite cap binding, board offer stats,
// and win rate vs army cost (for the point-budget question). Opponent is always the stock greedy bot.
import { data, greedyArmy, greedyState, armyCost, pct, ci95, ELITE, type GreedyOpts } from "./lib.js";
import { mulberry32 } from "../../rng.js";
import { resolveBattle } from "../../resolve.js";
import { deployAgainst } from "../../deploy.js";
import { DRAFTERS } from "../../batch/drafters.js";
import { summarize, startDraft, pickGeneral } from "../../draft.js";
import type { Army, TerrainName } from "../../types.js";

const n = Number(process.argv[2] ?? 2000);
const TERRAINS: TerrainName[] = ["plains", "hills", "river", "forest"];
const RS = 2; // reader seeds per side (kept low for speed; both sides equal)

// Fixed opponents and seeds shared by every variant (paired design).
const master = mulberry32(4242);
const fixtures = Array.from({ length: n }, () => ({ dA: master.fork(), bA: master.fork(), dB: master.fork(), bB: master.fork(), terrain: TERRAINS[master.int(4)], seed: master.fork() }));

type Rec = { w: number; costA: number; costB: number; elitesA: number; capA: number; genA: string; traitsA: number };
function play(name: string, mkA: (d: number, b: number) => Army): Rec[] {
  const recs: Rec[] = [];
  let wins = 0;
  for (const f of fixtures) {
    const a = mkA(f.dA, f.bA), b = greedyArmy(f.dB, f.bB);
    a.deployment = deployAgainst(data, a, b, f.terrain, RS);
    b.deployment = deployAgainst(data, b, a, f.terrain, RS);
    const r = resolveBattle(data, a, b, f.terrain, f.seed);
    const w = r.winner === "A" ? 1 : 0; wins += w;
    recs.push({ w, costA: armyCost(a), costB: armyCost(b), elitesA: r.armies.A.units.filter((u) => ELITE.has(u.unit.grade)).length, capA: 0, genA: a.generalId, traitsA: r.armies.A.traits.length });
  }
  const mc = recs.reduce((t, r) => t + r.costA, 0) / n;
  console.log(`${name.padEnd(46)} A wins ${pct(wins / n).padStart(6)} ${ci95(wins, n)}   mean cost ${mc.toFixed(1)}  mean elites ${(recs.reduce((t, r) => t + r.elitesA, 0) / n).toFixed(2)}`);
  return recs;
}
const G = (o: GreedyOpts) => (d: number, b: number) => greedyArmy(d, b, o);

console.log(`n=${n} paired battles per variant; B = stock greedy bot; both deploy as readers (${RS} seeds)`);
const base = play("greedy (stock: 2 rerolls, culture chase)", G({}));
play("greedy, 0 rerolls", G({ rerolls: 0 }));
play("greedy, 1 reroll", G({ rerolls: 1 }));
play("greedy, 4 rerolls", G({ rerolls: 4 }));
play("greedy, 8 rerolls (always reroll < 7)", G({ rerolls: 8 }));
play("greedy, no culture chase (cost only)", G({ cultureChase: false }));
play("greedy, elite +3 bias", G({ eliteWeight: 3 }));
play("greedy, plan always envelopment", G({ plan: "envelopment" }));
play("greedy, plan always skirmish", G({ plan: "skirmish" }));
play("greedy, plan always defensive", G({ plan: "defensive" }));
play("random drafter", (d, b) => DRAFTERS.random(data, d, b));

// ---- win rate vs cost difference (from the stock greedy baseline) ----
console.log("\n## Stock greedy: win rate by (costA − costB) bin");
const bins: [number, number, string][] = [[-99, -12, "≤ −12"], [-12, -6, "−12..−7"], [-6, -2, "−6..−3"], [-2, 2, "−2..2"], [2, 6, "3..6"], [6, 12, "7..12"], [12, 99, "> 12"]];
for (const [lo, hi, label] of bins) {
  const xs = base.filter((r) => r.costA - r.costB > lo && r.costA - r.costB <= hi);
  if (xs.length) console.log(`  ${label.padEnd(8)} n=${String(xs.length).padStart(4)}  A wins ${pct(xs.reduce((t, r) => t + r.w, 0) / xs.length)}`);
}
const costs = base.map((r) => r.costA).sort((a, b) => a - b);
const mean = costs.reduce((t, c) => t + c, 0) / n, sd = Math.sqrt(costs.reduce((t, c) => t + (c - mean) ** 2, 0) / n);
console.log(`cost distribution (greedy): mean ${mean.toFixed(1)} sd ${sd.toFixed(1)} p10 ${costs[Math.floor(n * 0.1)]} p50 ${costs[Math.floor(n * 0.5)]} p90 ${costs[Math.floor(n * 0.9)]} min ${costs[0]} max ${costs[n - 1]}`);
// point-biserial correlation of win with cost diff, and with general quality
const cd = base.map((r) => r.costA - r.costB); const cdm = cd.reduce((t, x) => t + x, 0) / n;
const wm = base.reduce((t, r) => t + r.w, 0) / n;
const corr = base.reduce((t, r, i) => t + (cd[i] - cdm) * (r.w - wm), 0) / Math.sqrt(cd.reduce((t, x) => t + (x - cdm) ** 2, 0) * base.reduce((t, r) => t + (r.w - wm) ** 2, 0));
console.log(`corr(win, cost diff) = ${corr.toFixed(3)}`);

// ---- elite cap / offer statistics on stock greedy drafts ----
console.log("\n## Elite cap and board offers (stock greedy states, n boards)");
let capHit = 0, capIs3 = 0, elitesOffered = 0, sOffered = 0, boardsNoElite = 0, homeRows = 0, l1 = 0, l2 = 0, boards = 0, offeredNotTaken = 0;
const m2 = mulberry32(99);
for (let i = 0; i < n; i++) {
  const st = greedyState(m2.fork(), m2.fork());
  const s = summarize(data, st);
  boards++;
  if (s.eliteUsed >= s.eliteCap) capHit++;
  if (s.eliteCap >= 3) capIs3++;
  const gen = data.generalById.get(st.generalPool[st.generalIndex!])!;
  let e = 0;
  for (const row of st.rows) { if (row.culture === gen.culture) homeRows++; for (const c of row.cards) { const u = data.unitById.get(c.unitId)!; if (ELITE.has(u.grade)) e++; if (u.grade === "S") sOffered++; } }
  elitesOffered += e; if (e === 0) boardsNoElite++;
  // elites offered on the final board (after rerolls) minus elites taken
  offeredNotTaken += Math.max(0, Math.min(e, 8) - s.eliteUsed);
  const lv = Object.values(s.traitLevels); if (lv.includes(2)) l2++; else if (lv.includes(1)) l1++;
}
console.log(`elite cap binding (used == cap): ${pct(capHit / boards)}; cap is 3 (logistics ≥ 80): ${pct(capIs3 / boards)}; boards with no elite card: ${pct(boardsNoElite / boards)}`);
console.log(`elite cards offered per final board: ${(elitesOffered / boards).toFixed(2)} (S cards ${(sOffered / boards).toFixed(2)}); home-culture rows per board ${(homeRows / boards).toFixed(2)}; trait L1 reached ${pct(l1 / boards)} L2 ${pct(l2 / boards)}`);

// ---- offer stats on raw (un-rerolled) boards ----
let raw = 0, rawE = 0, rawNoElite = 0;
const m3 = mulberry32(7);
for (let i = 0; i < n; i++) { let st = startDraft(data, m3.fork()); st = pickGeneral(data, st, 0); raw++; let e = 0; for (const row of st.rows) for (const c of row.cards) if (ELITE.has(data.unitById.get(c.unitId)!.grade)) e++; rawE += e; if (!e) rawNoElite++; }
console.log(`raw boards: elite cards offered ${(rawE / raw).toFixed(2)} per board, boards with none ${pct(rawNoElite / raw)}`);
