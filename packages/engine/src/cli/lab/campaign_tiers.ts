// Campaign run with the decided difficulty levers (design/gdd/campaign.md §3.6):
// three battles in a row, stop at the first loss. Foes can be tiered by general strength and by army cost,
// exclude the player's pool of three generals, and deploy player-blind (their own default line).
// Usage: npx tsx src/cli/lab/campaign_tiers.ts [N=600]
import { readFileSync } from "node:fs";
import { data, greedyArmy, greedyState, armyCost, pct, ci95 } from "./lib.js";
import { mulberry32 } from "../../rng.js";
import { resolveBattle } from "../../resolve.js";
import { deployAgainst, defaultDeployment } from "../../deploy.js";
import { startDraft, toArmy } from "../../draft.js";
import type { Army, TerrainName } from "../../types.js";

const N = Number(process.argv[2] ?? 600);
const TERRAINS: TerrainName[] = ["plains", "hills", "forest", "river"];
const rep = JSON.parse(readFileSync("./out/final-fronts/report-greedy.json", "utf8"));
const genWr = new Map<string, number>(rep.generals.map((g: any) => [g.id, g.wr]));
const ranked = data.generals.map((g) => g.id).sort((a, b) => (genWr.get(a) ?? 0.5) - (genWr.get(b) ?? 0.5));
const third = Math.floor(ranked.length / 3);
const BAND: Set<string>[] = [new Set(ranked.slice(0, third)), new Set(ranked.slice(third, 2 * third)), new Set(ranked.slice(2 * third))];

interface FoeCfg { name: string; tierGenerals: boolean; budgets: (number | undefined)[] }
const FOES: FoeCfg[] = [
  { name: "flat (today's rule, but player-blind foes)", tierGenerals: false, budgets: [undefined, undefined, undefined] },
  { name: "general tiers only", tierGenerals: true, budgets: [undefined, undefined, undefined] },
  { name: "cost bands only (60 / 66 / full)", tierGenerals: false, budgets: [60, 66, undefined] },
  { name: "general tiers + cost bands (60 / 66 / full)", tierGenerals: true, budgets: [60, 66, undefined] },
  { name: "general tiers + wide cost bands (56 / 64 / full)", tierGenerals: true, budgets: [56, 64, undefined] },
];

function campaign(seed: number, cfg: FoeCfg) {
  const pool = new Set(startDraft(data, seed).generalPool); // the player's three offered generals
  const rng = mulberry32(seed ^ 0x2545f491);
  const grounds = [...TERRAINS];
  const out: { foe: Army; terrain: TerrainName; battleSeed: number }[] = [];
  const used = new Set<string>();
  for (let i = 0; i < 3; i++) {
    const terrain = grounds.splice(rng.int(grounds.length), 1)[0];
    const battleSeed = rng.int(2147483647);
    let foe: Army | null = null;
    for (let attempt = 0; attempt < 60; attempt++) {
      const foeSeed = rng.int(2147483647);
      const st = greedyState(foeSeed, foeSeed ^ 0x9e3779b9, { budget: cfg.budgets[i] });
      const gid = st.generalPool[st.generalIndex!];
      const okBand = !cfg.tierGenerals || BAND[i].has(gid);
      if (pool.has(gid) || used.has(gid) || (!okBand && attempt < 59)) continue;
      foe = toArmy(data, st); used.add(gid); break;
    }
    if (!foe) throw new Error("no foe found");
    out.push({ foe: { ...foe, deployment: defaultDeployment(data, foe) }, terrain, battleSeed }); // player-blind line
  }
  return out;
}

type Player = { name: string; reader: number };
const PLAYERS: Player[] = [{ name: "by-the-book player (default line)", reader: 0 }, { name: "reasoning player (reads the roster, 3 sims)", reader: 3 }];
const seeds = Array.from({ length: N }, (_, i) => 100003 * (i + 1) + 17);

for (const cfg of FOES) {
  const camps = seeds.map((s) => campaign(s, cfg));
  const foeCost = [0, 1, 2].map((b) => camps.reduce((t, c) => t + armyCost(c[b].foe), 0) / N);
  const foeWr = [0, 1, 2].map((b) => camps.reduce((t, c) => t + (genWr.get(c[b].foe.generalId) ?? 0.5), 0) / N);
  console.log(`\n## Foes: ${cfg.name}`);
  console.log(`   mean foe army cost  b1 ${foeCost[0].toFixed(1)}  b2 ${foeCost[1].toFixed(1)}  b3 ${foeCost[2].toFixed(1)}    mean foe-general win rate  b1 ${pct(foeWr[0], 0)}  b2 ${pct(foeWr[1], 0)}  b3 ${pct(foeWr[2], 0)}`);
  for (const pl of PLAYERS) {
    let complete = 0; const win = [0, 0, 0]; const byT: Record<string, [number, number]> = {}; let myCost = 0;
    for (let i = 0; i < N; i++) {
      const me = greedyArmy(seeds[i], 1000 + i);
      myCost += armyCost(me);
      let alive = true;
      for (let b = 0; b < 3; b++) {
        const { foe, terrain, battleSeed } = camps[i][b];
        const mine = { ...me, deployment: pl.reader ? deployAgainst(data, me, foe, terrain, pl.reader) : me.deployment };
        const w = resolveBattle(data, mine, foe, terrain, battleSeed).winner === "A" ? 1 : 0;
        win[b] += w; // every battle resolved, so per-battle rates are unconditional
        byT[terrain] ??= [0, 0]; byT[terrain][0] += w; byT[terrain][1]++;
        if (alive && !w) alive = false;
      }
      if (alive) complete++;
    }
    const p = win.map((w) => w / N);
    console.log(`   ${pl.name.padEnd(46)} b1 ${pct(p[0])}  b2 ${pct(p[1])}  b3 ${pct(p[2])}   completion ${pct(complete / N)} ${ci95(complete, N)}   (player cost ${(myCost / N).toFixed(1)})   ` + Object.entries(byT).map(([t, [w, n]]) => `${t} ${pct(w / n, 0)}`).join(" "));
  }
}
