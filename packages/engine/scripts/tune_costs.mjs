// Cost tuning loop: run the batch, move every unit whose on-class win rate is > `--band` points off its
// grade mean by one cost point toward the mean, regenerate data, repeat. Edits scripts/build_data.mjs in
// place (the roster's source of truth) so the change is reviewable in git.
// Usage: node scripts/tune_costs.mjs [--rounds 6] [--n 30000] [--band 5] [--drafter random] [--dry]
import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf(`--${k}`); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const rounds = Number(opt("rounds", 6)), n = Number(opt("n", 30000)), band = Number(opt("band", 5)) / 100;
const drafter = opt("drafter", "random"), dry = argv.includes("--dry"), minN = Number(opt("minN", 150));
const readerSeeds = Number(opt("reader-seeds", 3));
const SRC = new URL("./build_data.mjs", import.meta.url).pathname;

for (let round = 1; round <= rounds; round++) {
  execSync(`npx tsx src/cli/batch.ts --n ${n} --seed ${100 + round} --drafter ${drafter} --reader-seeds ${readerSeeds} --out out/tune`, { stdio: ["ignore", "ignore", "inherit"] });
  const report = JSON.parse(readFileSync(`out/tune/report-${drafter}.json`, "utf8"));
  const moves = report.units.filter((u) => u.n >= minN && Math.abs(u.delta) > band).map((u) => ({ ...u, to: Math.max(1, Math.min(15, u.cost + (u.delta > 0 ? 1 : -1))) })).filter((u) => u.to !== u.cost);
  const worst = report.units.filter((u) => u.n >= minN).reduce((m, u) => Math.max(m, Math.abs(u.delta)), 0);
  console.log(`round ${round}: ${moves.length} moves, worst |delta| ${(worst * 100).toFixed(1)} pts, early routs ${(report.earlyRoutRate * 100).toFixed(1)}%, heavier wins ${((report.upset.heavierWins / report.upset.n) * 100).toFixed(1)}%`);
  for (const m of moves) console.log(`  ${m.unitId.padEnd(22)} ${m.grade} ${m.cost} → ${m.to}  (wr ${(m.wr * 100).toFixed(1)} vs grade ${(m.gradeWr * 100).toFixed(1)}, n=${m.n})`);
  if (!moves.length || dry) break;
  let src = readFileSync(SRC, "utf8");
  for (const m of moves) {
    const [culture, ...rest] = m.unitId.split("_");
    const id = rest.join("_");
    const re = new RegExp(`(${culture}\\("${id}",\\s*"[^"]*",\\s*"\\w+",\\s*)(\\d+)(,)`);
    if (!re.test(src)) throw new Error(`could not find ${m.unitId} in build_data.mjs`);
    src = src.replace(re, `$1${m.to}$3`);
  }
  writeFileSync(SRC, src);
  execSync(`node ${SRC}`, { stdio: "ignore" });
}
