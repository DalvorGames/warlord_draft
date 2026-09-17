// Usage: npm run batch -- [--n 10000] [--seed 1] [--drafter greedy|random|both] [--trait-toggle] [--units all] [--out out/]
import { mkdirSync, writeFileSync } from "node:fs";
import { loadData } from "../node/loadData.js";
import { runBatch } from "../batch/run.js";
import { buildReport, formatReport } from "../batch/report.js";
import type { DrafterName } from "../batch/drafters.js";

const argv = process.argv.slice(2);
const flag = (name: string) => argv.includes(`--${name}`);
const opt = (name: string, def: string) => { const i = argv.indexOf(`--${name}`); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : def; };

const data = loadData();
const n = Number(opt("n", "10000"));
const seed = Number(opt("seed", "1"));
const which = opt("drafter", "greedy");
const traitToggle = flag("trait-toggle");
const out = opt("out", "out");
const drafters: DrafterName[] = which === "both" ? ["greedy", "random"] : [which as DrafterName];
const readerSeeds = Number(opt("reader-seeds", "3"));

mkdirSync(out, { recursive: true });
for (const drafter of drafters) {
  const t0 = Date.now();
  const recs = runBatch(data, { n, seed, drafter, traitToggle, readerSeeds }, (done) => process.stderr.write(`\r${drafter}: ${done}/${n}`));
  process.stderr.write(`\r${drafter}: ${n}/${n} in ${((Date.now() - t0) / 1000).toFixed(1)}s\n`);
  const report = buildReport(data, recs, drafter);
  const text = formatReport(report, { units: flag("units") ? (opt("units", "flagged") as "all" | "flagged") : "flagged" });
  console.log(text);
  console.log("");
  writeFileSync(`${out}/report-${drafter}.json`, JSON.stringify(report, null, 1));
  writeFileSync(`${out}/report-${drafter}.txt`, formatReport(report, { units: "all" }));
}
console.error(`wrote ${out}/report-*.{json,txt}`);
