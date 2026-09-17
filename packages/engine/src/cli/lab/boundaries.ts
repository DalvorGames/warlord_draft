// Formula boundary probes for the fronts resolver: extreme rosters, deployments, terrains; look for NaN,
// negatives, thresholds that can never / always break, and one-sided outcomes.
import { data, pct } from "./lib.js";
import { resolveBattle } from "../../resolve.js";
import { prepareArmy } from "../../prepare.js";
import { frontThreshold } from "../../preview.js";
import type { Army, Front, PlanName, TerrainName } from "../../types.js";

const SLOTS = data.rules.slots;
const mk = (generalId: string, ids: string[], plan: PlanName = "aggressive", dep?: Front[]): Army => ({ generalId, slots: ids.map((unitId, i) => ({ slot: SLOTS[i], unitId })), plan, ...(dep ? { deployment: dep } : {}) });
const TERRAINS: TerrainName[] = ["plains", "hills", "forest", "river"];
const D = (s: string) => s.split("") as Front[];

const weakest = ["ind_levy", "stp_levy", "gal_levy_warband", "per_cappadocians", "per_hyrcanians", "rom_slingers", "gal_slingers", "per_scythed"];
const strongest = ["rom_veterans", "chn_wuzu", "mac_hypaspists", "mac_companions", "mac_cataphracts", "chn_crossbows", "ind_longbows", "ind_armored_eleph"];
const allLine = ["grk_spartans", "rom_veterans", "chn_wuzu", "car_libyan_vets", "rom_principes", "mac_argyraspides", "rom_triarii", "grk_epilektoi"];
const noShooters = ["grk_spartans", "rom_triarii", "mac_hypaspists", "mac_companions", "gal_noble_cav", "grk_sacred_band", "car_sacred_band", "gal_nobles"];
const allShooters = ["chn_crossbows", "chn_heavy_crossbows", "ind_longbows", "stp_scythian_ha", "chn_zhao_ha", "grk_cretans", "car_balearics", "per_mardians"];
const allCav = ["mac_companions", "mac_cataphracts", "stp_sarmatians", "stp_scythian_nobles", "per_heavy_cav", "gal_noble_cav", "stp_massagetae", "mac_prodromoi"];
const greekWall = ["grk_spartans", "grk_epilektoi", "grk_sacred_band", "grk_thessalians", "grk_syracusan_cav", "grk_cretans", "grk_rhodians", "grk_mercenaries"];

function run(name: string, a: Army, b: Army, terrain: TerrainName = "plains", seeds = 400) {
  let wins = 0, nan = 0, neg = 0, maxDmg = 0, generalA = 0, broke = 0, routs = 0, minThr = Infinity, maxThr = 0;
  for (let s = 1; s <= seeds; s++) {
    const r = resolveBattle(data, a, b, terrain, s);
    if (r.winner === "A") wins++;
    if (r.brokeInPhase === "break") broke++; else routs++;
    if (r.generalFell!.A) generalA++;
    for (const side of ["A", "B"] as const) {
      if (!Number.isFinite(r.moraleFraction[side]) || !Number.isFinite(r.casualties[side])) nan++;
      if (r.moraleFraction[side] < 0 || r.casualties[side] < 0) neg++;
      for (const f of r.fronts![side]) { if (!Number.isFinite(f.damage)) nan++; maxDmg = Math.max(maxDmg, f.damage); if (f.threshold > 0) { minThr = Math.min(minThr, f.threshold); maxThr = Math.max(maxThr, f.threshold); } }
      for (const rd of r.rounds!) for (const c of rd.contests) { if (!Number.isFinite(c.scoreA) || !Number.isFinite(c.scoreB) || !Number.isFinite(c.edge)) nan++; if (c.scoreA < 0 || c.scoreB < 0 || c.damageA < 0 || c.damageB < 0) neg++; }
    }
  }
  console.log(`${name.padEnd(58)} A wins ${pct(wins / seeds).padStart(6)}  routs ${pct(routs / seeds, 0).padStart(4)}  A general dies ${pct(generalA / seeds, 0).padStart(4)}  thr [${minThr.toFixed(2)},${maxThr.toFixed(2)}]  maxFrontDmg ${maxDmg.toFixed(2)}  NaN ${nan}  neg ${neg}`);
}

console.log("## Rosters (both default deployment, same general both sides unless stated)");
run("weakest 8 (F/D) vs strongest 8 (S/A), same general", mk("mazaeus", weakest), mk("mazaeus", strongest));
run("strongest vs weakest, worst general (Bessus) vs Hannibal", mk("bessus", strongest), mk("hannibal", weakest));
run("all line (no cav, no shooters) vs greedy-ish mix", mk("scipio", allLine), mk("scipio", strongest));
run("zero shooters vs zero shooters", mk("scipio", noShooters), mk("scipio", noShooters));
run("all shooters vs all line", mk("limu", allShooters), mk("limu", allLine));
run("all cavalry vs all line (plains)", mk("alexander", allCav), mk("alexander", allLine), "plains");
run("all cavalry vs all line (forest)", mk("alexander", allCav), mk("alexander", allLine), "forest");
run("all cavalry vs all line (hills)", mk("alexander", allCav), mk("alexander", allLine), "hills");
run("greek wall L2 (Epaminondas) vs strongest mix (Alexander)", mk("epaminondas", greekWall, "defensive"), mk("alexander", strongest));
run("mirror: strongest vs strongest (symmetry check)", mk("scipio", strongest), mk("scipio", strongest));
run("mirror: weakest vs weakest", mk("bessus", weakest), mk("bessus", weakest));

console.log("\n## Deployment extremes (strongest roster both sides, Scipio)");
const S = strongest;
run("all center vs default", mk("scipio", S, "aggressive", D("CCCCCCCC")), mk("scipio", S));
run("empty center (4L/4R) vs default", mk("scipio", S, "aggressive", D("LLLLRRRR")), mk("scipio", S));
run("1 center, 4L, 3R vs default", mk("scipio", S, "aggressive", D("LLLLCRRR")), mk("scipio", S));
run("7 center, 1 left, empty right vs default", mk("scipio", S, "aggressive", D("LCCCCCCC")), mk("scipio", S));
run("6 center, 1/1 wings vs default", mk("scipio", S, "aggressive", D("LCCCCCCR")), mk("scipio", S));
run("even 3/2/3 vs default", mk("scipio", S, "aggressive", D("LLLCCRRR")), mk("scipio", S));
run("all left (8L) vs all right (8R): both centers empty", mk("scipio", S, "aggressive", D("LLLLLLLL")), mk("scipio", S, "aggressive", D("RRRRRRRR")));
run("all center vs all center", mk("scipio", S, "aggressive", D("CCCCCCCC")), mk("scipio", S, "aggressive", D("CCCCCCCC")));

console.log("\n## Plans, mirror rosters (strongest, Scipio), each plan vs each");
for (const pa of ["aggressive", "defensive", "envelopment", "skirmish"] as PlanName[]) {
  const line: string[] = [];
  for (const pb of ["aggressive", "defensive", "envelopment", "skirmish"] as PlanName[]) {
    let w = 0; for (let s = 1; s <= 300; s++) if (resolveBattle(data, mk("scipio", S, pa), mk("scipio", S, pb), "plains", s).winner === "A") w++;
    line.push(`${pb.slice(0, 3)} ${pct(w / 300, 0).padStart(4)}`);
  }
  console.log(`${pa.padEnd(12)} ${line.join("  ")}`);
}

console.log("\n## Threshold range and damage budget");
const pa = prepareArmy(data, mk("alexander", greekWall, "defensive"), "plains");
const pb = prepareArmy(data, mk("bessus", weakest, "aggressive"), "forest");
console.log("max discipline after Greek L1/L2 (Spartans):", pa.units.find((u) => u.unit.id === "grk_spartans")!.stats.discipline);
console.log("best-case front threshold (Greek wall, Alexander cha 100, defensive):", frontThreshold(pa, pa.units.filter((u) => u.front === "C")).toFixed(3));
console.log("worst-case front threshold (levy wing, Bessus cha 40, aggressive, forest):", frontThreshold(pb, pb.units.filter((u) => u.front === "L")).toFixed(3), "units", pb.units.filter((u) => u.front === "L").map((u) => u.unit.id + ":" + u.stats.discipline.toFixed(0)).join(","));
const R = data.rules.fronts;
const maxPer = { skirmish: R.weights.skirmish * R.edgeCap * 2, contact: R.weights.contact * R.edgeCap * 2, pressRound: R.weights.press * R.edgeCap * 2, rollup: R.weights.rollup * R.edgeCap * 2 };
console.log("max damage per contest (plains):", JSON.stringify(maxPer), "→ skirmish+contact =", (maxPer.skirmish + maxPer.contact).toFixed(2), "; with 4 press rounds", (maxPer.skirmish + maxPer.contact + 4 * maxPer.pressRound).toFixed(2));
console.log("hills/forest: wing press max per round", (maxPer.pressRound * 0.5).toFixed(3), "; forest skirmish max", (maxPer.skirmish * 1.2).toFixed(3), "; river contact max", (maxPer.contact * 0.7).toFixed(3));
console.log("empty-wing cost to army morale:", (R.wingBreakShock + R.emptyFrontWeight).toFixed(2), "; empty center:", (R.centerBreakShock + R.emptyFrontWeight).toFixed(2), "; two empty wings:", (2 * (R.wingBreakShock + R.emptyFrontWeight)).toFixed(2), "of routLevel", R.routLevel);

console.log("\n## Terrain multipliers also scale discipline (prepare.ts:148-151): cavalry wing threshold on hills/forest");
const cavArmy = mk("alexander", allCav);
for (const t of TERRAINS) { const p = prepareArmy(data, cavArmy, t); console.log(`  ${t.padEnd(7)} left-wing threshold ${frontThreshold(p, p.units.filter((u) => u.front === "L")).toFixed(3)}`); }
