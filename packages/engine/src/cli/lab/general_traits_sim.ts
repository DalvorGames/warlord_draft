// What does the draft trait assignment do to the general lottery? Simulates generals' win rates under
// (a) today's rules, (b) the trait system with today's stats, (c) the trait system with compressed stats.
// Prints a markdown table of the assignment with each general's win rate (the handicap basis).
// Usage: npx tsx src/cli/lab/general_traits_sim.ts [N=40000] [--md]
import { data, greedyArmy } from "./lib.js";
import { mulberry32 } from "../../rng.js";
import { resolveBattle } from "../../resolve.js";
import { TRAIT_POOL, trait } from "./trait_pool.js";
import { GENERAL_TRAITS } from "./general_traits.js";
import type { Army, TerrainName, TraitEntry } from "../../types.js";

const N = Number(process.argv[2] ?? 40000);
const MD = process.argv.includes("--md");
const TERRAINS: TerrainName[] = ["plains", "hills", "river", "forest"];
const cultureTrait = new Map(TRAIT_POOL.filter((t) => t.culture).map((t) => [t.culture!, t.id]));
const kind = new Map(TRAIT_POOL.map((t) => [t.id, t.kind]));
for (const id of Object.keys(GENERAL_TRAITS)) if (!data.generalById.has(id)) throw new Error("unknown general " + id);
for (const g of data.generals) if (!GENERAL_TRAITS[g.id]) throw new Error("no entry for " + g.id);

/** General traits (one level each) plus the culture trait at 4 / 6 units, same trait stacking to III. */
function entriesFor(a: Army): TraitEntry[] {
  const levels = new Map<string, number>();
  const g = data.generalById.get(a.generalId)!;
  for (const id of GENERAL_TRAITS[g.id].traits) levels.set(id, (levels.get(id) ?? 0) + 1);
  const counts: Record<string, number> = { [g.culture]: 1 };
  for (const s of a.slots) { const c = data.unitById.get(s.unitId)!.culture; counts[c] = (counts[c] ?? 0) + 1; }
  for (const [c, n] of Object.entries(counts)) { const id = cultureTrait.get(c); if (id && n >= 4) levels.set(id, (levels.get(id) ?? 0) + (n >= 6 ? 2 : 1)); }
  const out: TraitEntry[] = [];
  for (const [id, lv] of levels) out.push(...trait(id, kind.get(id) === "rule" ? 1 : Math.min(3, lv)));
  return out;
}

const m = mulberry32(2026);
const field = Array.from({ length: N }, () => ({ a: greedyArmy(m.fork(), m.fork()), b: greedyArmy(m.fork(), m.fork()), t: TERRAINS[m.int(4)], seed: m.fork() }));
const original = new Map(data.generals.map((g) => [g.id, { ...g.stats }]));
const setStats = (k: number) => { for (const g of data.generals) { const o = original.get(g.id)!; for (const s of ["command", "tactics", "logistics", "charisma"] as const) g.stats[s] = Math.round(70 + (o[s] - 70) * k); } };

function run(mode: "today" | "traits"): Map<string, [number, number]> {
  const tally = new Map<string, [number, number]>();
  (data.rules as { styleMatchBonus: number }).styleMatchBonus = mode === "today" ? 1.08 : 1;
  for (const f of field) {
    const A: Army = mode === "traits" ? { ...f.a, extraTraits: entriesFor(f.a) } : f.a;
    const B: Army = mode === "traits" ? { ...f.b, extraTraits: entriesFor(f.b) } : f.b;
    const w = resolveBattle(data, A, B, f.t, f.seed, { traits: mode === "today" }).winner;
    for (const [army, won] of [[f.a, w === "A"], [f.b, w === "B"]] as const) { const t = tally.get(army.generalId) ?? [0, 0]; t[0] += won ? 1 : 0; t[1]++; tally.set(army.generalId, t); }
  }
  return tally;
}
const stats = (t: Map<string, [number, number]>) => { const wr = [...t.values()].map(([w, n]) => w / n); const mean = wr.reduce((a, b) => a + b, 0) / wr.length; return { min: Math.min(...wr), max: Math.max(...wr), sd: Math.sqrt(wr.reduce((s, x) => s + (x - mean) ** 2, 0) / wr.length) }; };
const byTraits = (t: Map<string, [number, number]>) => [0, 1, 2, 3].map((k) => { const ids = Object.entries(GENERAL_TRAITS).filter(([, v]) => v.traits.length === k).map(([id]) => id); const w = ids.reduce((s, id) => s + (t.get(id)?.[0] ?? 0), 0), n = ids.reduce((s, id) => s + (t.get(id)?.[1] ?? 0), 0); return `${k} traits (${ids.length} generals) ${(w / n * 100).toFixed(1)}%`; }).join("   ");

setStats(1); const today = run("today");
setStats(1); const traitsFull = run("traits");
setStats(0.5); const traitsHalf = run("traits");
setStats(0.25); const traitsQuarter = run("traits");
setStats(1);
const p = (x: number) => (x * 100).toFixed(0) + "%";
const line = (name: string, t: Map<string, [number, number]>) => { const s = stats(t); console.log(`${name.padEnd(52)} general win rates ${p(s.min)}–${p(s.max)}  SD ${(s.sd * 100).toFixed(1)}   ${byTraits(t)}`); };
console.log(`N=${N} battles, greedy armies, default lines.\n`);
line("Today (stats as they are, doctrine, old culture traits)", today);
line("Traits, stats as they are", traitsFull);
line("Traits, stats compressed halfway to 70", traitsHalf);
line("Traits, stats compressed three-quarters to 70", traitsQuarter);

if (MD) {
  const name = new Map(TRAIT_POOL.map((t) => [t.id, t.name]));
  console.log("\n| General | Culture | Traits | Why | Today | With traits, stats halved toward 70 |\n|---|---|---|---|---|---|");
  for (const g of data.generals) {
    const e = GENERAL_TRAITS[g.id], a = today.get(g.id)!, b = traitsHalf.get(g.id)!;
    console.log(`| ${g.name} | ${g.culture} | ${e.traits.map((t) => name.get(t)).join(", ") || "—"} | ${e.why || "—"} | ${p(a[0] / a[1])} | ${p(b[0] / b[1])} |`);
  }
}
