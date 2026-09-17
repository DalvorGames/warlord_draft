// Paired swap experiment: draft N random matchups, then for each candidate unit replace army A's slot with it
// and replay the same seeds. Win-rate differences between candidates are the sim's own valuation of the units.
// Usage: npx tsx src/cli/swap.ts --slot 7 --units mac_elephants,mac_companions,... [--n 5000] [--drafter random]
import { loadData } from "../node/loadData.js";
import { runBatch } from "../batch/run.js";
import { resolveBattle } from "../resolve.js";
import { slotPenalty } from "../draft.js";
import { mulberry32 } from "../rng.js";
import { DRAFTERS, type DrafterName } from "../batch/drafters.js";
import type { Army, PhaseName, TerrainName } from "../types.js";

const argv = process.argv.slice(2);
const opt = (name: string, def: string) => { const i = argv.indexOf(`--${name}`); return i >= 0 && argv[i + 1] ? argv[i + 1] : def; };
const data = loadData();
for (const [k, v] of Object.entries(JSON.parse(opt("base", "{}")) as Record<string, unknown>)) {
  const parts = k.split("."); let o: any = data.rules;
  for (const p of parts.slice(0, -1)) o = o[p];
  o[parts[parts.length - 1]] = v;
}
const n = Number(opt("n", "5000"));
const slotIdx = Number(opt("slot", "7"));
const drafter = DRAFTERS[opt("drafter", "random") as DrafterName];
const units = opt("units", "").split(",").filter(Boolean);
const master = mulberry32(Number(opt("seed", "7")));
const TERRAINS: TerrainName[] = ["plains", "hills", "river", "forest"];

const battles: { a: Army; b: Army; terrain: TerrainName; seed: number }[] = [];
for (let i = 0; i < n; i++) {
  const a = drafter(data, master.fork(), master.fork());
  const b = drafter(data, master.fork(), master.fork());
  battles.push({ a, b, terrain: TERRAINS[master.int(4)], seed: master.fork() });
}
const slot = data.rules.slots[slotIdx];
const PH: PhaseName[] = ["skirmish", "charge", "grind", "flank"];
console.log(`slot ${slotIdx} (${slot}), n=${n}, paired seeds. Columns: win%, then A's mean net damage dealt minus taken per phase (positive = A ahead).`);
for (const id of ["(baseline)", ...units]) {
  const u = id === "(baseline)" ? null : data.unitById.get(id);
  if (id !== "(baseline)" && !u) { console.log(`${id}: unknown unit`); continue; }
  if (u && slotPenalty(data, u, slot) === null) { console.log(`${id}: not allowed in ${slot}`); continue; }
  let wins = 0, count = 0;
  const net: Record<PhaseName, number> = { skirmish: 0, charge: 0, grind: 0, flank: 0 };
  const seen: Record<PhaseName, number> = { skirmish: 0, charge: 0, grind: 0, flank: 0 };
  for (const bt of battles) {
    const a = u ? { ...bt.a, slots: bt.a.slots.map((s, i) => (i === slotIdx ? { ...s, unitId: u.id } : s)) } : bt.a;
    const r = resolveBattle(data, a, bt.b, bt.terrain, bt.seed);
    count++;
    if (r.winner === "A") wins++;
    for (const p of r.phaseLog) { net[p.phase] += p.damageB - p.damageA; seen[p.phase]++; }
  }
  const label = u ? `${u.grade} ${String(u.cost).padStart(2)} ${u.class.padEnd(8)} ${id}` : id;
  console.log(`${label.padEnd(40)} ${((wins / count) * 100).toFixed(1).padStart(5)}%  ` + PH.map((p) => `${p} ${(net[p] / count).toFixed(3).padStart(6)}`).join("  "));
}
