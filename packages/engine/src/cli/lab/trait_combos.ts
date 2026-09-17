// How do traits add up? Paired battles as in traits.ts, side A carrying realistic combinations.
// Usage: npx tsx src/cli/lab/trait_combos.ts [N=3000]
import { data, greedyArmy, pct } from "./lib.js";
import { mulberry32 } from "../../rng.js";
import { resolveBattle } from "../../resolve.js";
import { TRAIT_POOL, trait } from "./trait_pool.js";
import type { Army, TerrainName, TraitEntry } from "../../types.js";

const N = Number(process.argv[2] ?? 3000);
const TERRAINS: TerrainName[] = ["plains", "hills", "river", "forest"];
(data.rules as { styleMatchBonus: number }).styleMatchBonus = 1;
const m = mulberry32(99);
const field = Array.from({ length: N }, () => ({ a: greedyArmy(m.fork(), m.fork()), b: greedyArmy(m.fork(), m.fork()), t: TERRAINS[m.int(4)], seed: m.fork() }));
const wr = (a: TraitEntry[] | null, b: TraitEntry[] | null = null) => {
  let w = 0;
  for (const f of field) {
    const A: Army = a ? { ...f.a, extraTraits: a } : f.a, B: Army = b ? { ...f.b, extraTraits: b } : f.b;
    if (resolveBattle(data, A, B, f.t, f.seed, { traits: false }).winner === "A") w++;
  }
  return w / N;
};
const base = wr(null);
console.log(`N=${N}. Baseline ${pct(base)}.\n\nEach trait alone, at the sizes in trait_pool.ts:`);
for (const t of TRAIT_POOL) if (t.id !== "scouts") console.log(`  ${t.name.padEnd(20)} ` + t.levels.map((l, i) => `${t.kind === "rule" ? "on" : "I".repeat(i + 1)} +${pct(wr(l) - base)}`).join("   "));

const combos: [string, TraitEntry[]][] = [
  ["One-trait general: Steady I", trait("steady", 1)],
  ["Two-trait general: Steady I + Delayer (a Fabius)", [...trait("steady", 1), ...trait("delayer")]],
  ["Three-trait general: Envelopment I + Master of ground + Scouts (a Hannibal)", [...trait("envelopment", 1), ...trait("master_of_ground")]],
  ["Three-trait general: Oblique order I + Hammer and anvil I + Rally (an Alexander)", [...trait("oblique_order", 1), ...trait("hammer_and_anvil", 1), ...trait("rally")]],
  ["Culture at 4 + matching general: Steady II", trait("steady", 2)],
  ["Culture at 6 + matching general: Steady III", trait("steady", 3)],
  ["Culture at 4 + different general trait: Steady I + Envelopment I", [...trait("steady", 1), ...trait("envelopment", 1)]],
  ["Culture at 6 + different general trait: Steady II + Envelopment I", [...trait("steady", 2), ...trait("envelopment", 1)]],
  ["The ceiling: Steady III + Envelopment I + Rally", [...trait("steady", 3), ...trait("envelopment", 1), ...trait("rally")]],
];
console.log("\nCombinations on side A, nothing on side B:");
for (const [name, e] of combos) console.log(`  ${name.padEnd(84)} +${pct(wr(e) - base)}`);
console.log("\nTrait against trait (both sides carry one, level I): A's win rate");
const duel: [string, string][] = [["steady", "furor"], ["furor", "steady"], ["envelopment", "deep_ranks"], ["terror", "steady"], ["harass", "volley"], ["numbers", "oblique_order"]];
for (const [x, y] of duel) console.log(`  ${x.padEnd(14)} vs ${y.padEnd(14)} ${pct(wr(trait(x), trait(y)))}`);
