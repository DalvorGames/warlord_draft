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

// --- CHARGE stacking (design/gdd/battle-resolution.md §9 item 5): impact is CHARGE²/100, so massing the
// highest-CHARGE units on one front may be a dominant deployment. These variants start from the default,
// move the k highest-CHARGE units to one front, and never leave a front empty.
const FRONT_LIST: Front[] = ["L", "C", "R"];
const OPP: Record<Front, Front> = { L: "R", C: "C", R: "L" };
function fixEmpty(a: Army, d: Front[]): Front[] {
  const us = units(a);
  for (const f of FRONT_LIST) {
    if (d.includes(f)) continue;
    // take the lowest-CHARGE unit from the most crowded front
    const crowded = FRONT_LIST.slice().sort((x, y) => d.filter((v) => v === y).length - d.filter((v) => v === x).length)[0];
    const donor = us.map((_, i) => i).filter((i) => d[i] === crowded).sort((x, y) => us[x].stats.shock - us[y].stats.shock)[0];
    d[donor] = f;
  }
  return d;
}
function stackCharge(a: Army, front: Front, k: number): Front[] {
  const us = units(a);
  const d = [...defaultDeployment(data, a)];
  const top = us.map((_, i) => i).sort((x, y) => us[y].stats.shock - us[x].stats.shock).slice(0, k);
  for (const i of top) d[i] = front;
  return fixEmpty(a, d);
}
/** Mean matchup of `mine` against `theirs` (rules.matchups, subtype then class, default 1). */
function matchup(mine: ReturnType<typeof units>, theirs: ReturnType<typeof units>): number {
  if (!mine.length || !theirs.length) return 1;
  let t = 0;
  for (const m of mine) { const row = data.rules.matchups[m.subtype] ?? {}; for (const e of theirs) t += row[e.subtype] ?? row[e.class] ?? 1; }
  return t / (mine.length * theirs.length);
}
/** Stack the top-k CHARGE units on the front where they match up best against the enemy's default line. */
function stackChargeBestFront(a: Army, b: Army, k: number): Front[] {
  const us = units(a), them = units(b), theirDef = defaultDeployment(data, b);
  const top = us.map((_, i) => i).sort((x, y) => us[y].stats.shock - us[x].stats.shock).slice(0, k).map((i) => us[i]);
  let best: Front = "C", bestM = -Infinity;
  for (const f of FRONT_LIST) {
    const facing = them.filter((_, i) => theirDef[i] === OPP[f]);
    const m = facing.length ? matchup(top, facing) : 1.5; // an empty enemy front is the best target of all
    if (m > bestM) { bestM = m; best = f; }
  }
  return stackCharge(a, best, k);
}

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
  { name: "stack CHARGE: top 3 on the left", fn: (a) => stackCharge(a, "L", 3) },
  { name: "stack CHARGE: top 3 in the center", fn: (a) => stackCharge(a, "C", 3) },
  { name: "stack CHARGE: top 4 in the center", fn: (a) => stackCharge(a, "C", 4) },
  { name: "stack CHARGE: top 4 on the left", fn: (a) => stackCharge(a, "L", 4) },
  { name: "stack CHARGE: top 3 on best-matchup front", fn: (a, _t, b) => stackChargeBestFront(a, b, 3) },
  { name: "stack CHARGE: top 4 on best-matchup front", fn: (a, _t, b) => stackChargeBestFront(a, b, 4) },
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
