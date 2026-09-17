// Campaign completion simulation, replicating apps/web/src/lib/campaign/spec.ts exactly:
// three foes = greedy AI drafts from rng-derived seeds, distinct terrains, foe deploys as reader (6 seeds)
// against the player's roster. Player variants: greedy bot with uniform general / best general, blind or reader.
import { readFileSync } from "node:fs";
import { data, greedyArmy, armyCost, pct, ci95 } from "./lib.js";
import { mulberry32 } from "../../rng.js";
import { resolveBattle } from "../../resolve.js";
import { deployAgainst } from "../../deploy.js";
import { DRAFT_STATE_BOTS } from "../../batch/drafters.js";
import { toArmy } from "../../draft.js";
import type { Army, TerrainName } from "../../types.js";

const N = Number(process.argv[2] ?? 1200);
const TERRAINS: TerrainName[] = ["plains", "hills", "forest", "river"];
const rep = JSON.parse(readFileSync("./out/final-fronts/report-greedy.json", "utf8"));
const genWr = new Map<string, number>(rep.generals.map((g: any) => [g.id, g.wr]));

function campaign(seed: number) {
  const rng = mulberry32(seed ^ 0x2545f491);
  const grounds = [...TERRAINS];
  const battles: { foe: Army; terrain: TerrainName; battleSeed: number }[] = [];
  for (let i = 0; i < 3; i++) {
    const foeSeed = rng.int(2147483647);
    const terrain = grounds.splice(rng.int(grounds.length), 1)[0];
    const battleSeed = rng.int(2147483647);
    const foe = toArmy(data, DRAFT_STATE_BOTS.greedy(data, foeSeed, foeSeed ^ 0x9e3779b9)); // aiDraftState(foeSeed, "greedy")
    battles.push({ foe, terrain, battleSeed });
  }
  return battles;
}

type Variant = { name: string; player: (seed: number, k: number) => Army; reader: number };
const bestGeneral = (pool: string[]) => pool.map((id, i) => [genWr.get(id) ?? 0.5, i] as const).sort((a, b) => b[0] - a[0])[0][1];
const worstGeneral = (pool: string[]) => pool.map((id, i) => [genWr.get(id) ?? 0.5, i] as const).sort((a, b) => a[0] - b[0])[0][1];
const variants: Variant[] = [
  { name: "greedy, uniform general, blind default deploy", player: (s, k) => greedyArmy(s, 1000 + k), reader: 0 },
  { name: "greedy, uniform general, reader 3", player: (s, k) => greedyArmy(s, 1000 + k), reader: 3 },
  { name: "greedy, uniform general, reader 6", player: (s, k) => greedyArmy(s, 1000 + k), reader: 6 },
  { name: "greedy, best general in pool, reader 6", player: (s, k) => greedyArmy(s, 1000 + k, { chooseGeneral: bestGeneral }), reader: 6 },
  { name: "greedy, worst general in pool, reader 6", player: (s, k) => greedyArmy(s, 1000 + k, { chooseGeneral: worstGeneral }), reader: 6 },
];

const seeds = Array.from({ length: N }, (_, i) => 100003 * (i + 1) + 17);
const camps = seeds.map((s) => campaign(s));
for (const v of variants) {
  let complete = 0; const perBattle = [0, 0, 0]; const reached = [0, 0, 0]; let indepAll = 0;
  const byCulture: Record<string, [number, number]> = {}; const byGen: Record<string, [number, number]> = {};
  const byTerrain: Record<string, [number, number]> = {}; let costDiffWin = 0, costDiffN = 0;
  const byFoeGen: Record<string, [number, number]> = {};
  for (let i = 0; i < N; i++) {
    const me = v.player(seeds[i], i);
    const gen = data.generalById.get(me.generalId)!;
    let alive = true; let allThree = 1;
    for (let b = 0; b < 3; b++) {
      const { foe, terrain, battleSeed } = camps[i][b];
      const foeDep = { ...foe, deployment: deployAgainst(data, foe, me, terrain, 6) };
      const mine = { ...me, deployment: v.reader ? deployAgainst(data, me, foe, terrain, v.reader) : me.deployment };
      const r = resolveBattle(data, mine, foeDep, terrain, battleSeed);
      const w = r.winner === "A" ? 1 : 0;
      perBattle[b] += w; reached[b]++; // independent per-battle rate (every battle is resolved regardless)
      allThree *= w;
      byTerrain[terrain] ??= [0, 0]; byTerrain[terrain][0] += w; byTerrain[terrain][1]++;
      const fg = data.generalById.get(foe.generalId)!.id; byFoeGen[fg] ??= [0, 0]; byFoeGen[fg][0] += w; byFoeGen[fg][1]++;
      costDiffN++; if ((armyCost(me) - armyCost(foe)) * (w ? 1 : -1) > 0) costDiffWin++;
      if (alive && !w) alive = false;
    }
    indepAll += allThree;
    if (alive) complete++;
    byCulture[gen.culture] ??= [0, 0]; byCulture[gen.culture][0] += alive ? 1 : 0; byCulture[gen.culture][1]++;
    byGen[gen.id] ??= [0, 0]; byGen[gen.id][0] += alive ? 1 : 0; byGen[gen.id][1]++;
  }
  const p = perBattle.map((w) => w / N);
  console.log(`\n### ${v.name}  (N=${N} campaigns)`);
  console.log(`completion ${pct(complete / N)} ${ci95(complete, N)}   per-battle win: b1 ${pct(p[0])}  b2 ${pct(p[1])}  b3 ${pct(p[2])}   product of per-battle rates ${pct(p[0] * p[1] * p[2])}`);
  console.log("by terrain: " + Object.entries(byTerrain).map(([t, [w, n]]) => `${t} ${pct(w / n)}`).join("  "));
  console.log("by player culture (completion): " + Object.entries(byCulture).sort((a, b) => b[1][0] / b[1][1] - a[1][0] / a[1][1]).map(([c, [w, n]]) => `${c} ${pct(w / n, 0)} (n=${n})`).join("  "));
  const gens = Object.entries(byGen).filter(([, [, n]]) => n >= 8).sort((a, b) => b[1][0] / b[1][1] - a[1][0] / a[1][1]);
  console.log("best generals (completion): " + gens.slice(0, 6).map(([g, [w, n]]) => `${g} ${pct(w / n, 0)} (${n})`).join("  "));
  console.log("worst generals (completion): " + gens.slice(-6).map(([g, [w, n]]) => `${g} ${pct(w / n, 0)} (${n})`).join("  "));
  const fg = Object.entries(byFoeGen).filter(([, [, n]]) => n >= 15).sort((a, b) => a[1][0] / a[1][1] - b[1][0] / b[1][1]);
  console.log("hardest foe generals (player win): " + fg.slice(0, 6).map(([g, [w, n]]) => `${g} ${pct(w / n, 0)} (${n})`).join("  "));
  console.log("easiest foe generals (player win): " + fg.slice(-6).map(([g, [w, n]]) => `${g} ${pct(w / n, 0)} (${n})`).join("  "));
  console.log(`heavier army (any margin) wins ${pct(costDiffWin / costDiffN)} of battles with a cost difference`);
}
