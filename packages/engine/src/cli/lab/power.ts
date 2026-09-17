// Static unit power proxy (fronts model) vs cost/grade, and general stat regression on batch win rates.
import { readFileSync } from "node:fs";
import { data } from "./lib.js";

const R = data.rules.fronts;
type U = (typeof data.units)[number];
// Per-unit contribution to the three stages, with no matchups, no terrain, no plan.
const skirmish = (u: U, center: boolean) => u.stats.ranged * (0.7 + 0.3 * u.stats.mobility / 100) * (center ? R.lineSkirmishMult : 1);
const contact = (u: U) => u.stats.shock * Math.pow(u.stats.shock / 100, R.chargeCurve) + R.steadinessCoef * (u.stats.discipline * 0.6 + u.stats.armor * 0.4);
const centerQ = (u: U) => u.stats.melee * 0.5 + u.stats.armor * 0.3 + u.stats.discipline * 0.2;
const wingP = (u: U) => (u.stats.mobility * 0.4 + u.stats.melee * 0.4 + u.stats.shock * 0.2) * Math.pow(u.stats.mobility / 100, R.wingCurve);
// Stage weights: skirmish 0.4 once, contact 0.5 once, press 0.25 × ~3 rounds fought on average.
const W = { sk: R.weights.skirmish, ct: R.weights.contact, pr: R.weights.press * 3 };
// Normalise each stage term by a typical army-average per-unit value so the stages are on the same footing.
const avgU = (f: (u: U) => number) => data.units.reduce((t, u) => t + f(u), 0) / data.units.length;
const norm = { sk: avgU((u) => skirmish(u, false)) || 1, ct: avgU(contact), q: avgU(centerQ), p: avgU(wingP) };
function power(u: U) {
  const center = W.sk * skirmish(u, true) / norm.sk + W.ct * contact(u) / norm.ct + W.pr * centerQ(u) / norm.q;
  const wing = W.sk * skirmish(u, false) / norm.sk + W.ct * contact(u) / norm.ct + W.pr * wingP(u) / norm.p;
  return { center, wing, best: Math.max(center, wing), where: center >= wing ? "C" : "W" };
}

const rows = data.units.map((u) => ({ u, ...power(u) }));
// Linear fit power ~ cost.
const n = rows.length, sx = rows.reduce((t, r) => t + r.u.cost, 0), sy = rows.reduce((t, r) => t + r.best, 0);
const sxx = rows.reduce((t, r) => t + r.u.cost * r.u.cost, 0), sxy = rows.reduce((t, r) => t + r.u.cost * r.best, 0);
const slope = (n * sxy - sx * sy) / (n * sxx - sx * sx), icpt = (sy - slope * sx) / n;
const resid = rows.map((r) => r.best - (icpt + slope * r.u.cost));
const sd = Math.sqrt(resid.reduce((t, x) => t + x * x, 0) / n);
const corr = (n * sxy - sx * sy) / Math.sqrt((n * sxx - sx * sx) * (n * rows.reduce((t, r) => t + r.best * r.best, 0) - sy * sy));
console.log(`power proxy vs cost: slope ${slope.toFixed(3)}/pt, intercept ${icpt.toFixed(2)}, r=${corr.toFixed(3)}, resid SD ${sd.toFixed(3)} (= ${(sd / slope).toFixed(1)} cost points)`);

// Batch win rates for cross-reference.
const rep = JSON.parse(readFileSync("./out/final-fronts/report-random.json", "utf8"));
const repG = JSON.parse(readFileSync("./out/final-fronts/report-greedy.json", "utf8"));
const wrOf = new Map<string, any>(rep.units.map((x: any) => [x.unitId, x]));
const wrG = new Map<string, any>(repG.units.map((x: any) => [x.unitId, x]));

console.log("\n## Grade curve (mean proxy power per grade, expected from fit)");
for (const g of ["S", "A", "B", "C", "D", "F"]) {
  const rs = rows.filter((r) => r.u.grade === g);
  const mean = rs.reduce((t, r) => t + r.best, 0) / rs.length;
  const cost = rs.reduce((t, r) => t + r.u.cost, 0) / rs.length;
  console.log(`${g}  n=${String(rs.length).padStart(2)}  avg cost ${cost.toFixed(1)}  avg power ${mean.toFixed(2)}  power/cost ${(mean / cost).toFixed(3)}  batch wr random ${(rep.gradeWr[g].w / rep.gradeWr[g].n * 100).toFixed(1)}`);
}

console.log("\n## Outliers: |residual| > 1.5 SD from the cost line (proxy), with batch deltas");
const flagged = rows.map((r, i) => ({ r, z: resid[i] / sd })).filter((x) => Math.abs(x.z) > 1.5).sort((a, b) => b.z - a.z);
for (const { r, z } of flagged) {
  const b = wrOf.get(r.u.id), g = wrG.get(r.u.id);
  console.log(`${r.u.id.padEnd(22)} ${r.u.grade} ${String(r.u.cost).padStart(2)} ${r.u.class.padEnd(8)} ${r.where} power ${r.best.toFixed(2)}  z ${z.toFixed(2).padStart(5)}  batch delta random ${b ? (b.delta * 100).toFixed(1) : "n/a"} (n=${b?.n ?? 0})  greedy ${g ? (g.delta * 100).toFixed(1) : "n/a"} (n=${g?.n ?? 0})`);
}

console.log("\n## Power per cost point, top 10 and bottom 10");
const ppc = rows.map((r) => ({ r, v: r.best / r.u.cost })).sort((a, b) => b.v - a.v);
for (const x of [...ppc.slice(0, 10), ...ppc.slice(-10)]) console.log(`${x.r.u.id.padEnd(22)} ${x.r.u.grade} ${String(x.r.u.cost).padStart(2)} ${x.r.u.class.padEnd(8)} ${x.v.toFixed(3)}`);

console.log("\n## Batch: units > 5 pts off in either drafter (n>=150)");
for (const [name, m] of [["random", wrOf], ["greedy", wrG]] as const) {
  const xs = [...m.values()].filter((x: any) => x.n >= 150 && Math.abs(x.delta) > 0.05).sort((a: any, b: any) => b.delta - a.delta);
  console.log(name + ":");
  for (const x of xs) console.log(`  ${x.unitId.padEnd(22)} ${x.grade} ${String(x.cost).padStart(2)} ${x.class.padEnd(8)} wr ${(x.wr * 100).toFixed(1)} exp ${(x.gradeWr * 100).toFixed(1)} delta ${(x.delta * 100).toFixed(1)} n=${x.n}`);
}

// ---- Generals: regress batch win rate on the four stats (greedy report) ----
console.log("\n## Generals: OLS of batch win rate (greedy, n≈490 each) on stats");
const gens = repG.generals as { id: string; culture: string; wr: number; n: number }[];
const X = gens.map((g) => { const s = data.generalById.get(g.id)!.stats; return [1, s.command, s.tactics, s.logistics, s.charisma]; });
const y = gens.map((g) => g.wr * 100);
// normal equations
const k = 5; const XtX = Array.from({ length: k }, () => new Array(k).fill(0)); const Xty = new Array(k).fill(0);
for (let i = 0; i < X.length; i++) for (let a = 0; a < k; a++) { Xty[a] += X[i][a] * y[i]; for (let b = 0; b < k; b++) XtX[a][b] += X[i][a] * X[i][b]; }
// gaussian elimination
const M = XtX.map((r, i) => [...r, Xty[i]]);
for (let c = 0; c < k; c++) { let p = c; for (let r = c + 1; r < k; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r; [M[c], M[p]] = [M[p], M[c]]; for (let r = 0; r < k; r++) if (r !== c) { const f = M[r][c] / M[c][c]; for (let j = c; j <= k; j++) M[r][j] -= f * M[c][j]; } }
const beta = M.map((r, i) => r[k] / r[i]);
const pred = X.map((x) => x.reduce((t, v, i) => t + v * beta[i], 0));
const ssr = y.reduce((t, v, i) => t + (v - pred[i]) ** 2, 0), ybar = y.reduce((t, v) => t + v, 0) / y.length, sst = y.reduce((t, v) => t + (v - ybar) ** 2, 0);
console.log(`wr% = ${beta[0].toFixed(1)} + ${beta[1].toFixed(3)}·command + ${beta[2].toFixed(3)}·tactics + ${beta[3].toFixed(3)}·logistics + ${beta[4].toFixed(3)}·charisma   R² ${(1 - ssr / sst).toFixed(3)}`);
console.log(`per +10 stat points: command ${(beta[1] * 10).toFixed(1)}, tactics ${(beta[2] * 10).toFixed(1)}, logistics ${(beta[3] * 10).toFixed(1)}, charisma ${(beta[4] * 10).toFixed(1)} win-rate points`);
console.log("\n## Culture residual (mean actual − predicted from stats), greedy and random, plus mean general wr");
const gensR = new Map((rep.generals as any[]).map((g) => [g.id, g.wr * 100]));
const XR = X, predR = pred; void XR; void predR;
for (const c of Object.keys(data.cultures)) {
  const idx = gens.map((g, i) => (g.culture === c ? i : -1)).filter((i) => i >= 0);
  const resG = idx.reduce((t, i) => t + (y[i] - pred[i]), 0) / idx.length;
  const resR = idx.reduce((t, i) => t + ((gensR.get(gens[i].id) as number) - pred[i]), 0) / idx.length;
  const meanG = idx.reduce((t, i) => t + y[i], 0) / idx.length;
  const meanR = idx.reduce((t, i) => t + (gensR.get(gens[i].id) as number), 0) / idx.length;
  const statsMean = idx.reduce((t, i) => t + pred[i], 0) / idx.length;
  console.log(`${c}  generals ${String(idx.length).padStart(2)}  stats-predicted ${statsMean.toFixed(1)}  actual greedy ${meanG.toFixed(1)} (resid ${resG >= 0 ? "+" : ""}${resG.toFixed(1)})  random ${meanR.toFixed(1)} (resid ${resR >= 0 ? "+" : ""}${resR.toFixed(1)})`);
}
console.log("\nspread: best general", Math.max(...y).toFixed(1), "worst", Math.min(...y).toFixed(1), "SD", Math.sqrt(sst / y.length).toFixed(1));
