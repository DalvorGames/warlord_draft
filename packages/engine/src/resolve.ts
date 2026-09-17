// Battle resolution (HANDOFF §5). resolveBattle(armyA, armyB, terrain, seed) is pure given the data.

import { mulberry32, type Rng } from "./rng.js";
import { prepareArmy, type PreparedArmy, type PreparedUnit, type PrepareOptions } from "./prepare.js";
import { narrate } from "./recap.js";
import { resolveBattleFronts, type RoundRecord, type FrontSummary } from "./resolveFronts.js";
import type { Army, EventDef, GameData, PhaseName, Side, TerrainName } from "./types.js";

export interface Contribution { unitId: string; name: string; cost: number; value: number }
export interface PhaseRecord {
  phase: PhaseName;
  scoreA: number;
  scoreB: number;
  edge: number;
  winner: Side;
  damageA: number;
  damageB: number;
  /** Cumulative morale damage after this phase. */
  moraleA: number;
  moraleB: number;
  topA: Contribution[];
  topB: Contribution[];
  shakenA: boolean;
  shakenB: boolean;
  eventApplied?: string;
}
export interface BattleResult {
  seed: number;
  terrain: TerrainName;
  winner: Side;
  /** v1: phase name or "break". fronts: "skirmish" | "contact" | "press N" | "break". */
  brokeInPhase: string;
  event: { id: string; name: string; applied: boolean } | null;
  /** v1 only. */
  phaseLog: PhaseRecord[];
  /** fronts only. */
  rounds?: RoundRecord[];
  fronts?: { A: FrontSummary[]; B: FrontSummary[] };
  generalFell?: { A: boolean; B: boolean };
  moraleFraction: { A: number; B: number };
  casualties: { A: number; B: number };
  recap: string[];
  armies: { A: PreparedArmy; B: PreparedArmy };
}
export interface ResolveOptions extends PrepareOptions {
  campaign?: boolean;
}

interface SideState {
  side: Side;
  army: PreparedArmy;
  damage: number;
  threshold: number;
  shaken: boolean;
  /** Set by the pursuit_lost event. */
  cavExcludedFromFlank: boolean;
  lastCharge: { impact: number; elephantImpact: number };
}

const PHASES: PhaseName[] = ["skirmish", "charge", "grind", "flank"];

// ---------- helpers ----------

function matchupMult(data: GameData, attacker: PreparedUnit, defenders: PreparedUnit[]): number {
  if (defenders.length === 0) return 1;
  const table = data.rules.matchups[attacker.unit.subtype] ?? {};
  let total = 0;
  for (const d of defenders) total += table[d.unit.subtype] ?? table[d.unit.class] ?? 1;
  return total / defenders.length;
}

const byRole = (s: SideState, ...roles: string[]) => s.army.units.filter((u) => roles.includes(u.role));
const avg = (arr: PreparedUnit[], f: (u: PreparedUnit) => number) => (arr.length ? arr.reduce((t, u) => t + f(u), 0) / arr.length : 0);

/** Per-unit shaken multiplier: pikes are exempt under pikes_ignore_shaken. */
function unitShaken(data: GameData, s: SideState, u: PreparedUnit): number {
  if (!s.shaken) return 1;
  if (u.unit.subtype === "pike" && s.army.rules.has("pikes_ignore_shaken")) return 1;
  return data.rules.shakenMult;
}
const sideShaken = (data: GameData, s: SideState) => (s.shaken ? data.rules.shakenMult : 1);

function top(contribs: Contribution[]): Contribution[] {
  return contribs.filter((c) => c.value > 0).sort((a, b) => b.cost - a.cost || b.value - a.value).slice(0, 3);
}
const contrib = (u: PreparedUnit, value: number): Contribution => ({ unitId: u.unit.id, name: u.unit.name, cost: u.unit.cost, value });

// ---------- phases: each returns [score, contributions] for side x against side y ----------

function skirmish(data: GameData, x: SideState, y: SideState, rng: Rng): [number, Contribution[]] {
  const shooters = [...byRole(x, "ranged", "skirmish"), ...byRole(x, "cavalry").filter((u) => u.stats.ranged > 30)];
  const targets = byRole(y, "line", "shock", "special");
  const cs = shooters.map((u) => contrib(u, (u.stats.ranged * 0.7 + u.stats.mobility * 0.3) * matchupMult(data, u, targets)));
  const raw = cs.reduce((s, c) => s + c.value, 0);
  const cover = (avg(targets, (u) => u.stats.armor) / 100) * 0.5;
  return [raw * (1 - cover) * x.army.phaseMult.skirmish * x.army.cmd * rng.gaussian(data.rules.noiseSD), cs];
}

function charge(data: GameData, x: SideState, y: SideState, rng: Rng): [number, Contribution[]] {
  const { rules } = data;
  const chargers = byRole(x, "shock", "cavalry", "special").filter((u) => u.stats.shock >= rules.chargeMinShock);
  const enemyWall = byRole(y, ...rules.chargeWallRoles);
  const cs = chargers.map((u) => contrib(u, u.stats.shock * matchupMult(data, u, enemyWall) * unitShaken(data, x, u)));
  const impact = cs.reduce((s, c) => s + c.value, 0);
  x.lastCharge = {
    impact,
    elephantImpact: cs.filter((c) => data.unitById.get(c.unitId)!.tags.includes("elephant")).reduce((s, c) => s + c.value, 0),
  };
  const wall = rules.chargeSteadinessSide === "own" ? byRole(x, ...rules.chargeWallRoles) : enemyWall;
  const enemyChargers = byRole(y, "shock", "cavalry", "special").filter((u) => u.stats.shock >= rules.chargeMinShock);
  const resist = (u: PreparedUnit) => (rules.chargeWallMatchup ? matchupMult(data, u, enemyChargers) : 1);
  const steadiness = wall.reduce((s, u) => s + (u.stats.discipline * 0.6 + u.stats.armor * 0.4) * resist(u), 0);
  const score = (impact + rules.chargeSteadinessCoef * steadiness) * x.army.phaseMult.charge * x.army.terrainChargeMult * x.army.cmd * rng.gaussian(rules.noiseSD);
  return [score, cs];
}

function grind(data: GameData, x: SideState, y: SideState, rng: Rng): [number, Contribution[]] {
  const { rules } = data;
  const fighters = byRole(x, "line", "shock", "special");
  const enemy = byRole(y, "line", "shock", "special");
  const cs = fighters.map((u) => contrib(u, (u.stats.melee * 0.5 + u.stats.armor * 0.3 + u.stats.discipline * 0.2) * matchupMult(data, u, enemy) * unitShaken(data, x, u)));
  const quality = cs.length ? cs.reduce((s, c) => s + c.value, 0) / cs.length : 0;
  // Body weight follows the role, except special units (elephants, chariots) are always half a body wherever they stand.
  const bodies = fighters.reduce((s, u) => s + (u.unit.class === "special" ? rules.grindBodyWeight.special : rules.grindBodyWeight[u.role]), 0);
  return [quality * Math.pow(bodies, rules.lanchesterExponent) * x.army.phaseMult.grind * x.army.cmd * rng.gaussian(rules.noiseSD), cs];
}

function flank(data: GameData, x: SideState, y: SideState, rng: Rng): [number, Contribution[]] {
  const cav = x.cavExcludedFromFlank ? [] : byRole(x, "cavalry");
  const enemyCav = byRole(y, "cavalry");
  const opp = enemyCav.length ? enemyCav : byRole(y, "line");
  const cs = cav.map((u) => contrib(u, (u.stats.mobility * 0.5 + u.stats.melee * 0.3 + u.stats.shock * 0.2) * matchupMult(data, u, opp)));
  const power = cs.reduce((s, c) => s + c.value, 0);
  const tactics = 0.7 + (x.army.general.stats.tactics / 100) * 0.6 * x.army.tacticsMult;
  return [(power + data.rules.flankFloor) * tactics * x.army.phaseMult.flank * x.army.cmd * sideShaken(data, x) * rng.gaussian(data.rules.noiseSD), cs];
}

const PHASE_FN: Record<PhaseName, typeof skirmish> = { skirmish, charge, grind, flank };

// ---------- events ----------

function rollEvent(data: GameData, rng: Rng, A: SideState, B: SideState, campaign: boolean): EventDef | null {
  const { events } = data.rules;
  const roll = rng.next(); // always consumed so later draws don't shift with the event list
  if (roll >= events.chancePerBattle) return null;
  const hasElephant = (s: SideState) => s.army.units.some((u) => u.unit.tags.includes("elephant"));
  const eligible = events.list.filter((e) => {
    if (e.campaignOnly && !campaign) return false;
    if (e.requires === "elephant" && !hasElephant(A) && !hasElephant(B)) return false;
    return true;
  });
  if (!eligible.length) return null;
  const weights = eligible.map((e) => {
    let w = e.weight;
    if (e.id === "rampage" && (A.army.rules.has("rampage_chance_halved") || B.army.rules.has("rampage_chance_halved"))) w /= 2;
    return w;
  });
  return eligible[rng.weightedIndex(weights)];
}

// ---------- resolver ----------

export function resolveBattle(data: GameData, armyA: Army, armyB: Army, terrain: TerrainName, seed: number, opts: ResolveOptions = {}): BattleResult {
  if (data.rules.battleModel === "fronts") return resolveBattleFronts(data, armyA, armyB, terrain, seed, opts);
  return resolveBattleV1(data, armyA, armyB, terrain, seed, opts);
}

export function resolveBattleV1(data: GameData, armyA: Army, armyB: Army, terrain: TerrainName, seed: number, opts: ResolveOptions = {}): BattleResult {
  const { rules } = data;
  const rng = mulberry32(seed);
  const mk = (side: Side, army: Army): SideState => {
    const p = prepareArmy(data, army, terrain, opts);
    return { side, army: p, damage: 0, threshold: p.moraleThreshold, shaken: p.startsShaken, cavExcludedFromFlank: false, lastCharge: { impact: 0, elephantImpact: 0 } };
  };
  const A = mk("A", armyA), B = mk("B", armyB);
  const event = rollEvent(data, rng, A, B, opts.campaign ?? false);
  let eventApplied = false;

  // Pre-phase event: reinforcements (campaign) boosts the higher-logistics side's grind.
  if (event?.id === "reinforcements") {
    const la = A.army.general.stats.logistics, lb = B.army.general.stats.logistics;
    if (la !== lb) { (la > lb ? A : B).army.phaseMult.grind *= event.params?.grindMult ?? 1.2; eventApplied = true; }
  }

  const log: PhaseRecord[] = [];
  let brokeIn: string | null = null;
  let winner: Side | null = null;

  for (const phase of PHASES) {
    // Pre-phase event hooks.
    if (event?.id === "pursuit_lost" && phase === "flank") {
      const chargeRec = log.find((r) => r.phase === "charge");
      if (chargeRec) { (chargeRec.winner === "A" ? A : B).cavExcludedFromFlank = true; eventApplied = true; }
    }

    const fn = PHASE_FN[phase];
    const [sA, cA] = fn(data, A, B, rng);
    const [sB, cB] = fn(data, B, A, rng);
    const topScore = Math.max(sA, sB);
    const edge = topScore > 0 ? Math.abs(sA - sB) / topScore : 0;
    const won = sA >= sB ? A : B, lost = sA >= sB ? B : A;

    const base = won.army.phaseWeights[phase] * edge * 2;
    let loserMult = 1, winnerMult = 1;
    if (phase === "grind" && lost.army.rules.has("half_morale_damage_from_lost_grind")) loserMult *= 0.5;
    let applied: string | undefined;
    if (event && event.phase === phase) {
      if (event.id === "downpour") { const m = event.params?.damageMult ?? 0.3; loserMult *= m; winnerMult *= m; applied = event.id; }
      if (event.id === "flank_collapse") { loserMult *= event.params?.damageMult ?? 2; applied = event.id; }
    }
    lost.damage += base * loserMult;
    won.damage += base * 0.25 * winnerMult;

    if (phase === "charge") {
      if (edge > rules.shakenEdge && !lost.army.rules.has("never_shaken_by_charge")) lost.shaken = true;
      if (event?.id === "general_falls") {
        const mp = lost.army.moraleParts;
        lost.threshold = (0.55 + (mp.avgDiscipline / 100) * 0.35) * mp.mult * (event.params?.thresholdMult ?? 0.85);
        applied = event.id;
      }
      if (event?.id === "rampage" && lost.lastCharge.elephantImpact > 0) {
        const share = lost.lastCharge.elephantImpact / lost.lastCharge.impact;
        lost.damage += won.army.phaseWeights.charge * share * (event.params?.damageMult ?? 1);
        applied = event.id;
      }
    }
    if (event?.id === "pursuit_lost" && phase === "flank" && (A.cavExcludedFromFlank || B.cavExcludedFromFlank)) applied = event.id;
    if (applied) eventApplied = true;

    log.push({
      phase, scoreA: sA, scoreB: sB, edge, winner: won.side,
      damageA: A === lost ? base * loserMult : base * 0.25 * winnerMult,
      damageB: B === lost ? base * loserMult : base * 0.25 * winnerMult,
      moraleA: A.damage, moraleB: B.damage, topA: top(cA), topB: top(cB),
      shakenA: A.shaken, shakenB: B.shaken, eventApplied: applied,
    });

    const routA = A.damage >= A.threshold, routB = B.damage >= B.threshold;
    if (routA || routB) {
      brokeIn = phase;
      if (routA && routB) winner = A.damage / A.threshold > B.damage / B.threshold ? "B" : "A";
      else winner = routA ? "B" : "A";
      break;
    }
  }

  const fracA = A.damage / A.threshold, fracB = B.damage / B.threshold;
  if (!winner) { winner = fracA > fracB ? "B" : "A"; brokeIn = "break"; }
  const W = winner === "A" ? A : B, L = winner === "A" ? B : A;
  const margin = Math.min(1, Math.abs(fracA - fracB));
  const pursuit = avg(byRole(W, "cavalry"), (u) => u.stats.mobility) / 100;
  const c = rules.casualties;
  const lossL = Math.min(c.loserMax, c.loserBase + c.loserMargin * margin + c.pursuit * pursuit);
  const lossW = Math.max(0.02, c.winnerBase + c.winnerCloseness * (1 - margin));

  const result: BattleResult = {
    seed, terrain, winner, brokeInPhase: brokeIn!,
    event: event ? { id: event.id, name: event.name, applied: eventApplied } : null,
    phaseLog: log,
    moraleFraction: { A: fracA, B: fracB },
    casualties: { A: winner === "A" ? lossW : lossL, B: winner === "B" ? lossW : lossL },
    recap: [],
    armies: { A: A.army, B: B.army },
  };
  result.recap = narrate(data, result, margin);
  return result;
}
