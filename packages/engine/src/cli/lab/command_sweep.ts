// How much does the general decide? Sweep the COMMAND factor (rules.command) and report the spread of
// general win rates. Usage: npx tsx src/cli/lab/command_sweep.ts [n=20000]
import { loadData } from "../../node/loadData.js";
import { runBatch } from "../../batch/run.js";
import { buildReport } from "../../batch/report.js";

const n = Number(process.argv[2] ?? 20000);
const VARIANTS = [
  { name: "today        0.85  + 0.30·C", base: 0.85, slope: 0.30 },
  { name: "halfway      0.875 + 0.25·C", base: 0.875, slope: 0.25 },
  { name: "full soften  0.90  + 0.20·C", base: 0.90, slope: 0.20 },
  { name: "none         1.00  + 0.00·C", base: 1.0, slope: 0 },
];
const sd = (xs: number[]) => { const m = xs.reduce((a, b) => a + b, 0) / xs.length; return Math.sqrt(xs.reduce((t, x) => t + (x - m) ** 2, 0) / xs.length); };
const corr = (xs: number[], ys: number[]) => { const mx = xs.reduce((a, b) => a + b, 0) / xs.length, my = ys.reduce((a, b) => a + b, 0) / ys.length; let sxy = 0, sxx = 0, syy = 0; for (let i = 0; i < xs.length; i++) { sxy += (xs[i] - mx) * (ys[i] - my); sxx += (xs[i] - mx) ** 2; syy += (ys[i] - my) ** 2; } return sxy / Math.sqrt(sxx * syy); };
for (const v of VARIANTS) {
  const data = loadData();
  data.rules.command = { base: v.base, slope: v.slope };
  const r = buildReport(data, runBatch(data, { n, seed: 7, drafter: "greedy", traitToggle: false }), "greedy");
  const gens = r.generals.filter((g) => g.n >= 100);
  const wr = gens.map((g) => g.wr);
  const stat = (k: "command" | "tactics" | "logistics" | "charisma") => gens.map((g) => data.generalById.get(g.id)!.stats[k]);
  const sorted = gens.slice().sort((a, b) => b.wr - a.wr);
  console.log(`${v.name}   generals ${gens.length}  win rate min ${(Math.min(...wr) * 100).toFixed(0)}% max ${(Math.max(...wr) * 100).toFixed(0)}% SD ${(sd(wr) * 100).toFixed(1)}   r(COMMAND) ${corr(stat("command"), wr).toFixed(2)} r(TACTICS) ${corr(stat("tactics"), wr).toFixed(2)} r(SUPPLY) ${corr(stat("logistics"), wr).toFixed(2)} r(CHARISMA) ${corr(stat("charisma"), wr).toFixed(2)}   best ${sorted.slice(0, 3).map((g) => g.name.split(" ")[0]).join(", ")}  worst ${sorted.slice(-3).map((g) => g.name.split(" ")[0]).join(", ")}`);
}
