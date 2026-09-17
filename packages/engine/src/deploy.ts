// Deployment helpers for the three-fronts model.

import { resolveBattle } from "./resolve.js";
import type { Army, Front, GameData, TerrainName, Unit } from "./types.js";

export const FRONTS: Front[] = ["L", "C", "R"];

/** Which enemy front a front faces. */
export const OPPOSITE: Record<Front, Front> = { L: "R", C: "C", R: "L" };

/**
 * A sensible default: line, shock and foot ranged units hold the center; cavalry, skirmishers and specials
 * take the wings, dealt alternately by descending wing power so the wings come out even. A roster with no
 * infantry puts its three steadiest units in the center.
 */
export function defaultDeployment(data: GameData, army: Army): Front[] {
  const units = army.slots.map((s) => data.unitById.get(s.unitId)!);
  const out: Front[] = new Array(units.length).fill("C");
  const wingPower = (u: Unit) => u.stats.mobility * 0.4 + u.stats.melee * 0.4 + u.stats.shock * 0.2;
  const wingIdx = units.map((u, i) => i).filter((i) => ["cavalry", "skirmish", "special"].includes(units[i].class));
  if (units.length - wingIdx.length === 0) {
    // no infantry at all: steadiest three hold the center
    const bySteady = units.map((u, i) => i).sort((a, b) => units[b].stats.discipline - units[a].stats.discipline);
    const center = new Set(bySteady.slice(0, 3));
    for (const i of wingIdx) if (center.has(i)) wingIdx.splice(wingIdx.indexOf(i), 1);
  }
  wingIdx.sort((a, b) => wingPower(units[b]) - wingPower(units[a]));
  let side: Front = "L";
  for (const i of wingIdx) { out[i] = side; side = side === "L" ? "R" : "L"; }
  return out;
}

/**
 * Per-battle deployment for the bots: the default, then a terrain lean. On hills and forest the weakest wing
 * unit falls back to the center; on plains a center unit with mobility ≥ 60 goes to the thinner wing.
 */
export function deployFor(data: GameData, army: Army, terrain: TerrainName, lean = false): Front[] {
  const dep = [...defaultDeployment(data, army)];
  // The terrain lean below measured worse than the plain default (src/cli/deploy_swap.ts: −4 pts overall,
  // −13 in forest), so the bots use the default unless `lean` is asked for.
  if (!lean) return dep;
  const units = army.slots.map((s) => data.unitById.get(s.unitId)!);
  const wingPower = (u: Unit) => u.stats.mobility * 0.4 + u.stats.melee * 0.4 + u.stats.shock * 0.2;
  const count = (f: Front) => dep.filter((x) => x === f).length;
  if (terrain === "hills" || terrain === "forest") {
    const wing = units.map((u, i) => i).filter((i) => dep[i] !== "C").sort((a, b) => wingPower(units[a]) - wingPower(units[b]));
    const moves = terrain === "forest" ? 2 : 1;
    for (const i of wing.slice(0, moves)) if (count(dep[i]) > 1) dep[i] = "C";
  } else if (terrain === "plains") {
    const cand = units.map((u, i) => i).filter((i) => dep[i] === "C" && units[i].stats.mobility >= 60 && units[i].class !== "line");
    if (cand.length && count("C") > 3) {
      cand.sort((a, b) => wingPower(units[b]) - wingPower(units[a]));
      dep[cand[0]] = count("L") <= count("R") ? "L" : "R";
    }
  }
  return dep;
}

export function withDeployment(data: GameData, army: Army): Army {
  return army.deployment && army.deployment.length === army.slots.length ? army : { ...army, deployment: defaultDeployment(data, army) };
}

/** Encode a deployment as a string like "LCCRCLRC" for run strings and logs. */
export const deploymentString = (d: Front[]) => d.join("");

/** Candidate deployments derived from the default: swapped wings, one unit moved between fronts. */
export function deploymentCandidates(data: GameData, army: Army): Front[][] {
  const base = defaultDeployment(data, army);
  const units = army.slots.map((s) => data.unitById.get(s.unitId)!);
  const seen = new Set<string>();
  const out: Front[][] = [];
  const push = (d: Front[]) => { const k = d.join(""); if (!seen.has(k) && d.filter((f) => f === "C").length >= 1) { seen.add(k); out.push(d); } };
  push(base);
  push(base.map((f) => (f === "L" ? "R" : f === "R" ? "L" : f)));
  for (let i = 0; i < units.length; i++) {
    for (const to of ["L", "C", "R"] as Front[]) {
      if (base[i] === to) continue;
      if (to !== "C" && units[i].class === "line" && units[i].stats.mobility < 50) continue; // slow line units stay in the center
      const d = [...base]; d[i] = to; push(d);
    }
  }
  return out;
}

/**
 * Roster-reading deployment: assume the enemy deploys by the default heuristic (what a player would guess
 * from the roster), simulate each candidate against it over a few seeds, keep the best. The seeds are the
 * bot's own, never the battle's.
 */
export function deployAgainst(data: GameData, army: Army, enemy: Army, terrain: TerrainName, seeds = 6): Front[] {
  if (seeds <= 0) return defaultDeployment(data, army);
  const assumed: Army = { ...enemy, deployment: defaultDeployment(data, enemy) };
  let best: Front[] = defaultDeployment(data, army), bestScore = -Infinity;
  for (const d of deploymentCandidates(data, army)) {
    const a: Army = { ...army, deployment: d };
    let score = 0;
    for (let s = 1; s <= seeds; s++) {
      const r = resolveBattle(data, a, assumed, terrain, 1000 + s);
      // win counts most; the morale gap breaks ties so the bot prefers convincing wins
      score += (r.winner === "A" ? 1 : 0) + 0.25 * (r.moraleFraction.B - r.moraleFraction.A);
    }
    if (score > bestScore) { bestScore = score; best = d; }
  }
  return best;
}
