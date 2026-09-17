// Size the trait pool (design/gdd/traits.md). For each scaling trait, find the magnitude that lifts win rate
// by the target at levels I / II / III, over paired battles: same two armies, same ground, same seed, with and
// without the trait on side A. Today's culture traits and the doctrine bonus are switched off so the baseline
// is clean. Rule traits are simply measured.
// Usage: npx tsx src/cli/lab/traits.ts [N=3000] [targets=4,7,10]
import { data, greedyArmy, pct } from "./lib.js";
import { mulberry32 } from "../../rng.js";
import { resolveBattle } from "../../resolve.js";
import type { Army, TerrainName, TraitEntry } from "../../types.js";

const N = Number(process.argv[2] ?? 3000);
const TARGETS = (process.argv[3] ?? "4,7,10").split(",").map((x) => Number(x) / 100);
const TERRAINS: TerrainName[] = ["plains", "hills", "river", "forest"];
(data.rules as { styleMatchBonus: number }).styleMatchBonus = 1; // doctrine bonus removed (decided 2026-09-16)

const m = mulberry32(99);
const field = Array.from({ length: N }, () => ({ a: greedyArmy(m.fork(), m.fork()), b: greedyArmy(m.fork(), m.fork()), t: TERRAINS[m.int(4)], seed: m.fork() }));
const wins = (extra: TraitEntry[] | null, only?: (f: (typeof field)[number]) => boolean) => {
  let w = 0, n = 0;
  for (const f of field) {
    if (only && !only(f)) continue;
    const a: Army = extra ? { ...f.a, extraTraits: extra } : f.a;
    if (resolveBattle(data, a, f.b, f.t, f.seed, { traits: false }).winner === "A") w++;
    n++;
  }
  return { w, n, wr: w / n };
};
const base = wins(null);
console.log(`N=${N} paired battles, greedy armies, default lines, culture traits and doctrine bonus off. Baseline A wins ${pct(base.wr)}. Targets ${TARGETS.map((t) => "+" + pct(t, 0)).join(" / ")}\n`);

interface Scaling { name: string; hi: number; entries: (x: number) => TraitEntry[]; show: (x: number) => string }
const f2 = (v: number) => v.toFixed(2);
const SCALING: Scaling[] = [
  { name: "Steady", hi: 0.5, entries: (x) => [{ moraleThreshold: 1 + x }], show: (x) => `cohesion ×${f2(1 + x)}` },
  { name: "Envelopment", hi: 1, entries: (x) => [{ phase: "flank", mult: 1 + x }], show: (x) => `wing press ×${f2(1 + x)}` },
  { name: "Hammer and anvil", hi: 4, entries: (x) => [{ rollup: 1 + x }, { rollupDamage: 1 + x }], show: (x) => `roll-up impact and damage ×${f2(1 + x)}` },
  { name: "Merc. captain (all)", hi: 0.4, entries: (x) => [{ stat: "all", mult: 1 + x, scope: "other_cultures" }], show: (x) => `foreign units all stats ×${f2(1 + x)}` },
  { name: "Merc. captain (STEADY)", hi: 0.6, entries: (x) => [{ stat: "discipline", mult: 1 + x, scope: "other_cultures" }], show: (x) => `foreign units STEADY ×${f2(1 + x)}` },
  { name: "Merc. captain (FIGHT)", hi: 0.6, entries: (x) => [{ stat: "melee", mult: 1 + x, scope: "other_cultures" }], show: (x) => `foreign units FIGHT ×${f2(1 + x)}` },
  { name: "Volley", hi: 3, entries: (x) => [{ centerShooting: 0.5 + x }], show: (x) => `center shoots at ${f2(0.5 + x)} (base 0.50)` },
  { name: "Harass", hi: 3, entries: (x) => [{ wingShooting: 1 + x }], show: (x) => `wing shooting ×${f2(1 + x)}` },
  { name: "Terror", hi: 0.6, entries: (x) => [{ shakenEdge: 0.15 }, { enemyShakenMult: 0.9 - x }], show: (x) => `enemy shaken above edge 0.15, and fights at ×${f2(0.9 - x)} (base 0.25, ×0.90)` },
  { name: "Furor", hi: 1, entries: (x) => [{ phase: "charge", mult: 1 + x }, { pressDecay: x / 4 }], show: (x) => `contact ×${f2(1 + x)}, press −${(x * 25).toFixed(1)}% per round` },
  { name: "Numbers", hi: 0.8, entries: (x) => [{ lanchester: x }], show: (x) => `numbers exponent in the press ${f2(0.3 + x)} (base 0.30)` },
  { name: "Deep ranks", hi: 0.3, entries: (x) => [{ relief: x }], show: (x) => `each front recovers ${(x * 100).toFixed(1)}% of its cohesion per press round` },
  { name: "Oblique order", hi: 1, entries: (x) => [{ heaviestFrontContact: 1 + x }], show: (x) => `heaviest front contact ×${f2(1 + x)}` },
  // Rule traits, given a dial so they can be sized like the rest.
  { name: "Rally (dial)", hi: 0.6, entries: (x) => [{ rally: x }], show: (x) => `first broken front stands again with ${(x * 100).toFixed(0)}% cohesion restored` },
  { name: "Master of ground (dial)", hi: 1, entries: (x) => [{ groundPenalty: x }], show: (x) => `${(x * 100).toFixed(0)}% of ground penalties ignored` },
];

for (const tr of SCALING) {
  const top = wins(tr.entries(tr.hi)).wr - base.wr;
  const out: string[] = [];
  for (const target of TARGETS) {
    if (top < target) { out.push(`cannot reach +${pct(target, 0)} (max +${pct(top)} at ${tr.show(tr.hi)})`); continue; }
    let lo = 0, hi = tr.hi;
    for (let i = 0; i < 12; i++) { const mid = (lo + hi) / 2; if (wins(tr.entries(mid)).wr - base.wr < target) lo = mid; else hi = mid; }
    const x = (lo + hi) / 2;
    out.push(`${tr.show(x)} → +${pct(wins(tr.entries(x)).wr - base.wr)}`);
  }
  console.log(`${tr.name.padEnd(18)} I: ${out[0]}\n${"".padEnd(18)} II: ${out[1]}\n${"".padEnd(18)} III: ${out[2]}`);
}

console.log("\nRule traits (on/off):");
const RULES: { name: string; entries: TraitEntry[]; only?: (f: (typeof field)[number]) => boolean; note?: string }[] = [
  { name: "Delayer: no front breaks before press round 1", entries: [{ noBreakBefore: 1 }] },
  { name: "Delayer: no front breaks before press round 2", entries: [{ noBreakBefore: 2 }] },
  { name: "Delayer: no front breaks before press round 3", entries: [{ noBreakBefore: 3 }] },
  { name: "Unshakeable (not in the pool; for comparison)", entries: [{ rule: "never_shaken_by_charge" }] },
];
for (const r of RULES) {
  const b = wins(null, r.only), w = wins(r.entries, r.only);
  console.log(`${r.name.padEnd(48)} +${pct(w.wr - b.wr)}   (n=${w.n})`);
}
console.log("\nScouts gives information, not strength; it cannot be measured with fixed default lines.");
