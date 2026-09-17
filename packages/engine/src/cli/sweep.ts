// Parameter sweep: run the batch under rules overrides and print one summary line per config.
// Usage: npx tsx src/cli/sweep.ts --n 4000 --drafter random --grid '{"phaseWeights.skirmish":[0.3,0.5],"lanchesterExponent":[1,1.3]}'
// Keys are dotted paths into rules.json; the grid is the cartesian product.

import { loadData } from "../node/loadData.js";
import { runBatch } from "../batch/run.js";
import { buildReport } from "../batch/report.js";
import type { DrafterName } from "../batch/drafters.js";

const argv = process.argv.slice(2);
const opt = (name: string, def: string) => { const i = argv.indexOf(`--${name}`); return i >= 0 && argv[i + 1] ? argv[i + 1] : def; };
const n = Number(opt("n", "4000"));
const seed = Number(opt("seed", "1"));
const drafter = opt("drafter", "random") as DrafterName;
const grid: Record<string, unknown[]> = JSON.parse(opt("grid", "{}"));
const base: Record<string, unknown> = JSON.parse(opt("base", "{}"));

function setPath(obj: any, path: string, value: unknown) {
  const parts = path.split(".");
  let o = obj;
  for (const p of parts.slice(0, -1)) o = o[p];
  o[parts[parts.length - 1]] = value;
}

const keys = Object.keys(grid);
const combos: Record<string, unknown>[] = [{}];
for (const k of keys) {
  const next: Record<string, unknown>[] = [];
  for (const c of combos) for (const v of grid[k]) next.push({ ...c, [k]: v });
  combos.splice(0, combos.length, ...next);
}

export function summarize(data: ReturnType<typeof loadData>, drafter: DrafterName, n: number, seed: number) {
  const recs = runBatch(data, { n, seed, drafter, traitToggle: false });
  const r = buildReport(data, recs, drafter);
  // mean delta vs grade, weighted by appearances, per natural class
  const cls: Record<string, { s: number; n: number }> = {};
  for (const u of r.units) { if (!u.n) continue; cls[u.class] ??= { s: 0, n: 0 }; cls[u.class].s += u.delta * u.n; cls[u.class].n += u.n; }
  const d = (c: string) => (cls[c] ? ((cls[c].s / cls[c].n) * 100).toFixed(1).padStart(5) : "  n/a");
  const plains = r.terrain.find((t) => t.terrain === "plains")!, hills = r.terrain.find((t) => t.terrain === "hills")!;
  const plan = (p: string) => ((r.plans.find((x) => x.plan === p)?.wr ?? 0) * 100).toFixed(0).padStart(2);
  const worst = r.units.filter((u) => u.n >= 100).reduce((m, u) => Math.max(m, Math.abs(u.delta)), 0);
  return {
    line: `early ${(r.earlyRoutRate * 100).toFixed(1).padStart(4)}% rout ${(r.routRate * 100).toFixed(0).padStart(2)}% heavy ${((r.upset.heavierWins / r.upset.n) * 100).toFixed(0)}% | cls Δ line ${d("line")} shock ${d("shock")} cav ${d("cavalry")} rng ${d("ranged")} skm ${d("skirmish")} spc ${d("special")} worst ${(worst * 100).toFixed(0).padStart(2)} | cavH plains ${(plains.cavHeavyWr * 100).toFixed(0)} hills ${(hills.cavHeavyWr * 100).toFixed(0)} | plans agg ${plan("aggressive")} def ${plan("defensive")} env ${plan("envelopment")} skm ${plan("skirmish")}`,
    report: r,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  for (const combo of combos) {
    const data = loadData();
    for (const [k, v] of Object.entries(base)) setPath(data.rules, k, v);
    for (const [k, v] of Object.entries(combo)) setPath(data.rules, k, v);
    const label = keys.map((k) => `${k.split(".").pop()}=${combo[k]}`).join(" ");
    const { line } = summarize(data, drafter, n, seed);
    console.log(`${label.padEnd(40)} ${line}`);
  }
}
