// Is deployment a decision? Paired experiment: same random matchups and seeds, army A deployed by the default
// heuristic vs alternatives derived from the same roster. Usage: npx tsx src/cli/deploy_swap.ts [--n 4000]
import { loadData } from "../node/loadData.js";
import { resolveBattle } from "../resolve.js";
import { defaultDeployment, deployAgainst, deployFor } from "../deploy.js";
import { mulberry32 } from "../rng.js";
import { DRAFTERS } from "../batch/drafters.js";
import type { Army, Front, TerrainName } from "../types.js";

const argv = process.argv.slice(2);
const opt = (name: string, def: string) => { const i = argv.indexOf(`--${name}`); return i >= 0 && argv[i + 1] ? argv[i + 1] : def; };
const data = loadData();
const n = Number(opt("n", "4000"));
const master = mulberry32(Number(opt("seed", "3")));
const TERRAINS: TerrainName[] = ["plains", "hills", "river", "forest"];

const bMode = opt("b", "default"); // "default" | "reader"
const drafter = DRAFTERS[opt("drafter", "random") as "random" | "greedy"];
const battles: { a: Army; b: Army; terrain: TerrainName; seed: number }[] = [];
for (let i = 0; i < n; i++) {
  const a = drafter(data, master.fork(), master.fork());
  const b = drafter(data, master.fork(), master.fork());
  const terrain = TERRAINS[master.int(4)];
  b.deployment = bMode === "reader" ? deployAgainst(data, b, a, terrain) : deployFor(data, b, terrain);
  battles.push({ a, b, terrain, seed: master.fork() });
}

const units = (a: Army) => a.slots.map((s) => data.unitById.get(s.unitId)!);
const wingPower = (u: ReturnType<typeof units>[number]) => u.stats.mobility * 0.4 + u.stats.melee * 0.4 + u.stats.shock * 0.2;

type Variant = { name: string; fn: (a: Army, t: TerrainName, b: Army) => Front[] };
const only = opt("only", "");
const variants: Variant[] = [
  { name: "default heuristic (blind)", fn: (a) => defaultDeployment(data, a) },
  { name: "reader: sims candidates vs assumed enemy", fn: (a, t, b) => deployAgainst(data, a, b, t) },
  { name: "swap wings (strong vs strong)", fn: (a) => defaultDeployment(data, a).map((f) => (f === "L" ? "R" : f === "R" ? "L" : f)) },
  { name: "terrain lean", fn: (a, t) => deployFor(data, a, t, true) },
  { name: "all center", fn: (a) => a.slots.map(() => "C") },
  { name: "center 3, wings 3/2 by wing power", fn: (a) => {
    const us = units(a); const idx = us.map((_, i) => i).sort((x, y) => wingPower(us[y]) - wingPower(us[x]));
    const d: Front[] = new Array(us.length).fill("C"); idx.slice(0, 5).forEach((i, k) => (d[i] = k % 2 ? "R" : "L")); return d; } },
  { name: "refuse right: default but right wing to left", fn: (a) => defaultDeployment(data, a).map((f) => (f === "R" ? "L" : f)) },
  { name: "refuse right: right wing to center", fn: (a) => defaultDeployment(data, a).map((f) => (f === "R" ? "C" : f)) },
  { name: "cavalry center, infantry wings (inverted)", fn: (a) => {
    const us = units(a); const d: Front[] = us.map((u) => (["cavalry", "skirmish", "special"].includes(u.class) ? "C" : "L"));
    let k = 0; for (let i = 0; i < d.length; i++) if (d[i] === "L") d[i] = k++ % 2 ? "R" : "L"; return d; } },
];

console.log(`n=${n} paired matchups (${opt("drafter", "random")} drafter), army A re-deployed per variant, B deploys by ${bMode === "reader" ? "the reader" : "the blind default"}`);
for (const v of variants) {
  if (only && !new RegExp(only).test(v.name)) continue;
  let wins = 0;
  const byT: Record<string, [number, number]> = {};
  for (const bt of battles) {
    const a = { ...bt.a, deployment: v.fn(bt.a, bt.terrain, bt.b) };
    const r = resolveBattle(data, a, bt.b, bt.terrain, bt.seed);
    const w = r.winner === "A" ? 1 : 0; wins += w;
    byT[bt.terrain] ??= [0, 0]; byT[bt.terrain][0] += w; byT[bt.terrain][1]++;
  }
  console.log(`${v.name.padEnd(44)} ${((wins / n) * 100).toFixed(1).padStart(5)}%   ` + TERRAINS.map((t) => `${t} ${((byT[t][0] / byT[t][1]) * 100).toFixed(0)}%`).join("  "));
}
