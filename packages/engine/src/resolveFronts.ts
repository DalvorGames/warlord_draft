// Three-fronts resolver (docs/battle-design-three-fronts.md).
// Left faces enemy right, center faces center, right faces enemy left. Skirmish → contact → press rounds
// with breaks and roll-ups → rout or reckoning. Pure given the data and seed.

import { mulberry32, type Rng } from "./rng.js";
import { prepareArmy, type PreparedArmy, type PreparedUnit } from "./prepare.js";
import { FRONTS, OPPOSITE } from "./deploy.js";
import { frontThreshold } from "./preview.js";
import type { Army, EventDef, Front, GameData, Side, TerrainName } from "./types.js";
import type { BattleResult, Contribution, ResolveOptions } from "./resolve.js";

export type Stage = "skirmish" | "contact" | "press" | "rollup";

export interface ContestRecord {
  stage: Stage;
  round: number;
  /** Fronts involved, from each side's point of view. */
  frontA: Front;
  frontB: Front;
  scoreA: number;
  scoreB: number;
  edge: number;
  winner: Side;
  damageA: number;
  damageB: number;
  topA: Contribution[];
  topB: Contribution[];
  note?: string;
}
export interface FrontSummary {
  front: Front;
  unitIds: string[];
  threshold: number;
  damage: number;
  broken: boolean;
  brokenAt: string | null;
  shaken: boolean;
  flanked: number;
  rolledUp: boolean;
}
export interface RoundRecord {
  round: number;
  contests: ContestRecord[];
  events: string[];
  moraleA: number;
  moraleB: number;
}

interface FrontState {
  id: Front;
  units: PreparedUnit[];
  deployed: number;
  damage: number;
  threshold: number;
  broken: boolean;
  brokenAt: string | null;
  shaken: boolean;
  flanked: number;
  rolledUp: boolean;
}
interface SideState {
  side: Side;
  army: PreparedArmy;
  fronts: Record<Front, FrontState>;
  morale: number;
  routed: boolean;
  routedAt: string | null;
}

const avg = (arr: PreparedUnit[], f: (u: PreparedUnit) => number) => (arr.length ? arr.reduce((t, u) => t + f(u), 0) / arr.length : 0);
const contrib = (u: PreparedUnit, value: number): Contribution => ({ unitId: u.unit.id, name: u.unit.name, cost: u.unit.cost, value });
const top = (cs: Contribution[]) => cs.filter((c) => c.value > 0).sort((a, b) => b.value - a.value).slice(0, 3);

function matchupMult(data: GameData, attacker: PreparedUnit, defenders: PreparedUnit[]): number {
  if (!defenders.length) return 1;
  const table = data.rules.matchups[attacker.unit.subtype] ?? {};
  let total = 0;
  for (const d of defenders) total += table[d.unit.subtype] ?? table[d.unit.class] ?? 1;
  return total / defenders.length;
}

function unitShaken(data: GameData, s: SideState, f: FrontState, u: PreparedUnit): number {
  if (!f.shaken) return 1;
  if (u.unit.subtype === "pike" && s.army.rules.has("pikes_ignore_shaken")) return 1;
  return data.rules.shakenMult;
}

/** Fraction of a front's summed contribution that counts when only `oppN × frontage` units can engage. */
function frontageMult(data: GameData, n: number, oppN: number): number {
  if (n === 0) return 0;
  const R = data.rules.fronts;
  const k = Math.min(n, Math.ceil(Math.max(1, oppN) * R.frontage));
  return (k + (n - k) * R.reserveMult) / n;
}

function threshold(s: SideState, units: PreparedUnit[]): number {
  return frontThreshold(s.army, units);
}

// ---------- scoring ----------

function skirmishScore(data: GameData, s: SideState, f: FrontState, enemy: PreparedUnit[], rng: Rng): [number, Contribution[]] {
  const R = data.rules.fronts;
  const mult = f.id === "C" ? R.lineSkirmishMult : 1;
  const cs = f.units.map((u) => contrib(u, u.stats.ranged * (0.7 + 0.3 * u.stats.mobility / 100) * matchupMult(data, u, enemy) * mult));
  const raw = cs.reduce((t, c) => t + c.value, 0);
  const cover = (avg(enemy, (u) => u.stats.armor) / 100) * 0.5;
  return [raw * (1 - cover) * s.army.phaseMult.skirmish * s.army.cmd * rng.gaussian(data.rules.noiseSD), cs];
}

function contactParts(data: GameData, s: SideState, f: FrontState, units: PreparedUnit[], enemy: PreparedUnit[]): { impact: number; steadiness: number; cs: Contribution[] } {
  const R = data.rules.fronts;
  const cs = units.map((u) => contrib(u, u.stats.shock * Math.pow(u.stats.shock / 100, R.chargeCurve) * matchupMult(data, u, enemy) * unitShaken(data, s, f, u)));
  const impact = cs.reduce((t, c) => t + c.value, 0);
  const steadiness = units.reduce((t, u) => t + (u.stats.discipline * 0.6 + u.stats.armor * 0.4) * matchupMult(data, u, enemy), 0);
  return { impact, steadiness, cs };
}

function contactScore(data: GameData, s: SideState, f: FrontState, enemy: PreparedUnit[], rng: Rng): [number, Contribution[]] {
  const R = data.rules.fronts;
  const { impact, steadiness, cs } = contactParts(data, s, f, f.units, enemy);
  const fm = frontageMult(data, f.units.length, enemy.length);
  return [(impact + R.steadinessCoef * steadiness * s.army.steadinessMult) * fm * s.army.phaseMult.charge * s.army.cmd * rng.gaussian(data.rules.noiseSD), cs];
}

function pressScore(data: GameData, s: SideState, f: FrontState, enemy: PreparedUnit[], rng: Rng): [number, Contribution[]] {
  const R = data.rules.fronts;
  let cs: Contribution[], mult: number;
  if (f.id === "C") {
    cs = f.units.map((u) => contrib(u, (u.stats.melee * 0.5 + u.stats.armor * 0.3 + u.stats.discipline * 0.2) * matchupMult(data, u, enemy) * unitShaken(data, s, f, u)));
    mult = s.army.phaseMult.grind * Math.pow(R.flankedMult, f.flanked);
  } else {
    cs = f.units.map((u) => contrib(u, (u.stats.mobility * 0.4 + u.stats.melee * 0.4 + u.stats.shock * 0.2) * Math.pow(u.stats.mobility / 100, R.wingCurve) * matchupMult(data, u, enemy) * unitShaken(data, s, f, u)));
    mult = s.army.phaseMult.flank * (0.7 + (s.army.general.stats.tactics / 100) * 0.6 * s.army.tacticsMult);
  }
  const sum = cs.reduce((t, c) => t + c.value, 0) * frontageMult(data, f.units.length, enemy.length);
  return [sum * Math.pow(Math.max(1, f.units.length), R.lanchester) * mult * s.army.cmd * rng.gaussian(data.rules.noiseSD), cs];
}

// ---------- events ----------

function rollEvent(data: GameData, rng: Rng, A: SideState, B: SideState, campaign: boolean): EventDef | null {
  const { events } = data.rules;
  const roll = rng.next();
  if (roll >= events.chancePerBattle) return null;
  const hasElephant = (s: SideState) => s.army.units.some((u) => u.unit.tags.includes("elephant"));
  const eligible = events.list.filter((e) => e.id !== "rampage" && !(e.campaignOnly && !campaign) && !(e.requires === "elephant" && !hasElephant(A) && !hasElephant(B)));
  if (!eligible.length) return null;
  const weights = eligible.map((e) => (e.id === "rampage" && (A.army.rules.has("rampage_chance_halved") || B.army.rules.has("rampage_chance_halved")) ? e.weight / 2 : e.weight));
  return eligible[rng.weightedIndex(weights)];
}

// ---------- resolver ----------

export function resolveBattleFronts(data: GameData, armyA: Army, armyB: Army, terrain: TerrainName, seed: number, opts: ResolveOptions = {}): BattleResult {
  const R = data.rules.fronts;
  const rng = mulberry32(seed);
  const mk = (side: Side, army: Army): SideState => {
    const p = prepareArmy(data, army, terrain, opts);
    const s: SideState = { side, army: p, fronts: {} as Record<Front, FrontState>, morale: 0, routed: false, routedAt: null };
    for (const f of FRONTS) {
      const units = p.units.filter((u) => u.front === f);
      s.fronts[f] = { id: f, units, deployed: units.length, damage: 0, threshold: 0, broken: false, brokenAt: null, shaken: false, flanked: 0, rolledUp: false };
      s.fronts[f].threshold = threshold(s, units);
    }
    return s;
  };
  const A = mk("A", armyA), B = mk("B", armyB);
  const event = rollEvent(data, rng, A, B, opts.campaign ?? false);
  const eventNotes: string[] = [];
  let eventApplied = false;
  if (event?.id === "reinforcements") {
    const la = A.army.general.stats.logistics, lb = B.army.general.stats.logistics;
    if (la !== lb) { (la > lb ? A : B).army.phaseMult.grind *= event.params?.grindMult ?? 1.2; eventApplied = true; }
  }

  const rounds: RoundRecord[] = [];
  const pairs: [Front, Front][] = [["L", "R"], ["C", "C"], ["R", "L"]];
  const other = (s: SideState) => (s === A ? B : A);
  /** Terrain scales the stakes (damage weight) of each kind of fight. Roll-ups ride on the wing stakes. */
  const T = R.terrain[terrain] ?? {};
  const stakes = (kind: "skirmish" | "contact" | "wing" | "center" | "rollup"): number => (kind === "rollup" ? T.rollup ?? T.wing ?? 1 : T[kind] ?? 1);

  /** Unit-weighted front damage plus a flat shock per broken front (empty fronts included). */
  function armyMorale(s: SideState): number {
    let m = 0;
    for (const f of FRONTS) {
      const fs = s.fronts[f];
      if (fs.broken) m += f === "C" ? R.centerBreakShock : R.wingBreakShock;
      if (!fs.deployed) { if (fs.broken) m += R.emptyFrontWeight; continue; }
      const w = fs.deployed / s.army.units.length;
      m += w * (fs.broken ? 1 : Math.min(1, fs.threshold > 0 ? fs.damage / fs.threshold : 0));
    }
    return m;
  }

  /**
   * A free front wheels into an exposed enemy front: one-directional. The charge's impact is set against the
   * target's steadiness; only the target takes damage, and it is marked flanked. The charging units then join
   * the fight on that front.
   */
  function rollInto(s: SideState, round: number, from: FrontState, target: FrontState, joinFront: Front): ContestRecord {
    const e = other(s);
    const parts = contactParts(data, s, from, from.units, target.units);
    const sW = parts.impact * frontageMult(data, from.units.length, target.units.length) * R.rollupMult * s.army.rollupMult * s.army.phaseMult.charge * s.army.cmd * rng.gaussian(data.rules.noiseSD);
    const tParts = contactParts(data, e, target, target.units, from.units);
    // Only the units on the exposed flank resist: frontage against the charging wing, not the whole front.
    const sT = R.steadinessCoef * tParts.steadiness * e.army.steadinessMult * frontageMult(data, target.units.length, from.units.length) * e.army.phaseMult.charge * e.army.cmd * rng.gaussian(data.rules.noiseSD);
    const edge = sW > sT ? Math.min(R.edgeCap, (sW - sT) / sW) : 0;
    const dmg = R.weights.rollup * stakes("rollup") * edge * 2;
    target.damage += dmg;
    target.flanked++;
    s.fronts[joinFront].units = s.fronts[joinFront].units.concat(from.units);
    from.units = [];
    from.rolledUp = true;
    const note = `${s.side}:${from.id} wheels into ${e.side}:${target.id}`;
    return s === A
      ? { stage: "rollup", round, frontA: from.id, frontB: target.id, scoreA: sW, scoreB: sT, edge, winner: edge > 0 ? "A" : "B", damageA: 0, damageB: dmg, topA: top(parts.cs), topB: top(tParts.cs), note }
      : { stage: "rollup", round, frontA: target.id, frontB: from.id, scoreA: sT, scoreB: sW, edge, winner: edge > 0 ? "B" : "A", damageA: dmg, damageB: 0, topA: top(tParts.cs), topB: top(parts.cs), note };
  }

  /** Apply damage from a contest and record it. */
  function contest(stage: Stage, round: number, fa: FrontState, fb: FrontState, sA: number, sB: number, cA: Contribution[], cB: Contribution[], weight: number, mods: { loserMult?: number; winnerMult?: number; note?: string } = {}): ContestRecord {
    const topScore = Math.max(sA, sB);
    const edge = topScore > 0 ? Math.min(R.edgeCap, Math.abs(sA - sB) / topScore) : 0;
    const aWins = sA >= sB;
    const base = weight * edge * 2;
    const dA = aWins ? base * 0.25 * (mods.winnerMult ?? 1) : base * (mods.loserMult ?? 1);
    const dB = aWins ? base * (mods.loserMult ?? 1) : base * 0.25 * (mods.winnerMult ?? 1);
    fa.damage += dA;
    fb.damage += dB;
    return { stage, round, frontA: fa.id, frontB: fb.id, scoreA: sA, scoreB: sB, edge, winner: aWins ? "A" : "B", damageA: dA, damageB: dB, topA: top(cA), topB: top(cB), note: mods.note };
  }

  /** Break fronts past their threshold; returns notes. */
  function checkBreaks(stage: string): string[] {
    const notes: string[] = [];
    for (const s of [A, B]) for (const f of FRONTS) {
      const fs = s.fronts[f];
      if (fs.broken || !fs.deployed) continue;
      if (fs.damage >= fs.threshold) { fs.broken = true; fs.brokenAt = stage; notes.push(`${s.side}:${f} breaks`); }
    }
    for (const s of [A, B]) {
      s.morale = armyMorale(s);
      const allBroken = FRONTS.every((f) => !s.fronts[f].deployed || s.fronts[f].broken);
      if (!s.routed && (s.morale >= R.routLevel || allBroken)) { s.routed = true; s.routedAt = stage; notes.push(`${s.side} routs`); }
    }
    return notes;
  }

  // ----- Skirmish -----
  // Each front shoots the front opposite it; a front facing an empty front shoots the enemy center instead.
  const targetOf = (s: SideState, f: Front): Front | null => {
    const e = other(s);
    if (e.fronts[OPPOSITE[f]].units.length) return OPPOSITE[f];
    return e.fronts.C.units.length ? "C" : null;
  };
  const fireAt = (s: SideState, targetFront: Front): [number, Contribution[]] => {
    let score = 0; let cs: Contribution[] = [];
    for (const f of FRONTS) {
      const fs = s.fronts[f];
      if (!fs.units.length || targetOf(s, f) !== targetFront) continue;
      const [sc, c] = skirmishScore(data, s, fs, other(s).fronts[targetFront].units, rng);
      score += sc; cs = cs.concat(c);
    }
    return [score, cs];
  };
  let contests: ContestRecord[] = [];
  for (const [fa, fb] of pairs) {
    const FA = A.fronts[fa], FB = B.fronts[fb];
    if (!FA.units.length || !FB.units.length) continue;
    const [sA, cA] = fireAt(A, fb);
    const [sB, cB] = fireAt(B, fa);
    if (sA === 0 && sB === 0) continue;
    const mods: { loserMult?: number; winnerMult?: number; note?: string } = {};
    if (event?.id === "downpour") { mods.loserMult = mods.winnerMult = event.params?.damageMult ?? 0.3; mods.note = "downpour"; eventApplied = true; }
    contests.push(contest("skirmish", 0, FA, FB, sA, sB, cA, cB, R.weights.skirmish * stakes("skirmish"), mods));
  }
  let notes = checkBreaks("skirmish");
  rounds.push({ round: 0, contests, events: notes, moraleA: A.morale, moraleB: B.morale });

  // ----- Contact -----
  if (!A.routed && !B.routed) {
    contests = [];
    notes = [];
    for (const [fa, fb] of pairs) {
      const FA = A.fronts[fa], FB = B.fronts[fb];
      if (!FA.units.length && !FB.units.length) continue;
      if (!FA.units.length || !FB.units.length) {
        const empty = FA.units.length ? FB : FA;
        empty.broken = true; empty.brokenAt = "contact";
        notes.push(`${FA.units.length ? "B" : "A"}:${empty.id} is empty and gives way`);
        continue;
      }
      const [sA, cA] = contactScore(data, A, FA, FB.units, rng);
      const [sB, cB] = contactScore(data, B, FB, FA.units, rng);
      const mods: { loserMult?: number; note?: string } = {};
      const loserSide = sA >= sB ? B : A, loserFront = sA >= sB ? FB : FA;
      if (event?.id === "flank_collapse" && loserFront.id !== "C") { mods.loserMult = event.params?.damageMult ?? 2; mods.note = "flank collapses"; eventApplied = true; }
      const rec = contest("contact", 0, FA, FB, sA, sB, cA, cB, R.weights.contact * stakes("contact"), mods);
      if (rec.edge > data.rules.shakenEdge && !loserSide.army.rules.has("never_shaken_by_charge")) loserFront.shaken = true;
      if (event?.id === "general_falls" && loserFront.id === "C") {
        const mp = loserSide.army.moraleParts;
        loserFront.threshold = (0.55 + (avg(loserFront.units, (u) => u.stats.discipline) / 100) * 0.35) * mp.mult * (event.params?.thresholdMult ?? 0.85);
        rec.note = "general falls"; eventApplied = true;
      }
      // Rampage check: each elephant unit on a front that loses contact badly may panic and trample its own front.
      if (rec.edge > data.rules.shakenEdge) {
        const elephants = loserFront.units.filter((u) => u.unit.tags.includes("elephant"));
        if (elephants.length) {
          const parts = contactParts(data, loserSide, loserFront, loserFront.units, (loserSide === A ? FB : FA).units);
          const chance = R.rampageChance * (loserSide.army.rules.has("rampage_chance_halved") ? 0.5 : 1);
          let rampaged = 0;
          for (const el of elephants) {
            if (rng.next() >= chance) continue;
            const share = parts.impact > 0 ? (parts.cs.find((c) => c.unitId === el.unit.id)?.value ?? 0) / parts.impact : 0;
            loserFront.damage += R.weights.contact * share;
            rampaged++;
          }
          if (rampaged) rec.note = `${rampaged === 1 ? "elephants rampage" : `${rampaged} elephant units rampage`}`;
        }
      }
      contests.push(rec);
    }
    notes.push(...checkBreaks("contact"));
    rounds.push({ round: 0, contests, events: notes, moraleA: A.morale, moraleB: B.morale });
  }

  // ----- Press rounds -----
  let pursuitUsed = false;
  for (let round = 1; round <= R.rounds && !A.routed && !B.routed; round++) {
    contests = [];
    notes = [];
    // Roll-ups: a free wing wheels into the enemy center's side; a free center wheels onto an enemy wing.
    for (const s of [A, B]) {
      const e = other(s);
      for (const f of FRONTS) {
        const front = s.fronts[f];
        const opp = e.fronts[OPPOSITE[f]];
        if (front.broken || front.rolledUp || !front.units.length || !opp.broken) continue;
        if (f !== "C") {
          const ec = e.fronts.C;
          if (ec.broken || !ec.units.length) { front.rolledUp = true; notes.push(`${s.side}:${f} is free but the enemy center is already gone`); continue; }
          if (event?.id === "pursuit_lost" && !pursuitUsed) { pursuitUsed = true; eventApplied = true; front.rolledUp = true; notes.push(`${s.side}:${f} pursues the broken wing off the field`); continue; }
          contests.push(rollInto(s, round, front, ec, "C"));
        } else {
          // Free center: turn on the enemy wing that is still fighting where our own wing is worst off.
          const targets = (["L", "R"] as Front[]).map((w) => ({ mine: s.fronts[w], theirs: e.fronts[OPPOSITE[w]] })).filter((t) => !t.theirs.broken && t.theirs.units.length);
          if (!targets.length) { front.rolledUp = true; notes.push(`${s.side}:C is free but no enemy wing remains`); continue; }
          const frac = (x: FrontState) => (x.threshold > 0 ? x.damage / x.threshold : 1);
          targets.sort((a, b) => frac(b.mine) - frac(a.mine));
          const t = targets[0];
          contests.push(rollInto(s, round, front, t.theirs, t.mine.id));
        }
      }
    }
    // Press.
    for (const [fa, fb] of pairs) {
      const FA = A.fronts[fa], FB = B.fronts[fb];
      if (FA.broken || FB.broken || !FA.units.length || !FB.units.length) continue;
      const [sA, cA] = pressScore(data, A, FA, FB.units, rng);
      const [sB, cB] = pressScore(data, B, FB, FA.units, rng);
      const mods: { loserMult?: number } = {};
      const loser = sA >= sB ? B : A;
      if (fa === "C" && loser.army.rules.has("half_morale_damage_from_lost_grind")) mods.loserMult = 0.5;
      contests.push(contest("press", round, FA, FB, sA, sB, cA, cB, R.weights.press * stakes(fa === "C" ? "center" : "wing"), mods));
    }
    notes.push(...checkBreaks(`press ${round}`));
    rounds.push({ round, contests, events: notes, moraleA: A.morale, moraleB: B.morale });
  }

  // ----- Reckoning -----
  let winner: Side;
  let brokeIn: string;
  if (A.routed && B.routed) { winner = A.morale > B.morale ? "B" : "A"; brokeIn = A.routedAt!; }
  else if (A.routed) { winner = "B"; brokeIn = A.routedAt!; }
  else if (B.routed) { winner = "A"; brokeIn = B.routedAt!; }
  else { winner = A.morale > B.morale ? "B" : "A"; brokeIn = "break"; }
  const W = winner === "A" ? A : B, L = winner === "A" ? B : A;
  const margin = Math.min(1, Math.abs(A.morale - B.morale));
  const wingUnits = W.army.units.filter((u) => u.front !== "C");
  const pursuit = avg(wingUnits, (u) => u.stats.mobility) / 100;
  const c = data.rules.casualties;
  const lossL = Math.min(c.loserMax, c.loserBase + c.loserMargin * margin + c.pursuit * pursuit);
  const lossW = Math.max(0.02, c.winnerBase + c.winnerCloseness * (1 - margin));
  const generalFell = { A: A === L && A.fronts.C.broken, B: B === L && B.fronts.C.broken };

  const summary = (s: SideState): FrontSummary[] => FRONTS.map((f) => {
    const fs = s.fronts[f];
    return { front: f, unitIds: s.army.units.filter((u) => u.front === f).map((u) => u.unit.id), threshold: fs.threshold, damage: fs.damage, broken: fs.broken, brokenAt: fs.brokenAt, shaken: fs.shaken, flanked: fs.flanked, rolledUp: fs.rolledUp };
  });

  const result: BattleResult = {
    seed, terrain, winner, brokeInPhase: brokeIn,
    event: event ? { id: event.id, name: event.name, applied: eventApplied } : null,
    phaseLog: [],
    rounds,
    fronts: { A: summary(A), B: summary(B) },
    generalFell,
    moraleFraction: { A: A.morale, B: B.morale },
    casualties: { A: winner === "A" ? lossW : lossL, B: winner === "B" ? lossW : lossL },
    recap: [],
    armies: { A: A.army, B: B.army },
  };
  result.recap = narrateFronts(data, result, margin);
  void eventNotes;
  return result;
}

// ---------- recap ----------

const FRONT_NAME: Record<Front, string> = { L: "left", C: "center", R: "right" };

export function narrateFronts(data: GameData, r: BattleResult, margin: number): string[] {
  const A = r.armies.A, B = r.armies.B;
  const name = (s: Side) => r.armies[s].general.name;
  const lines: string[] = [];
  lines.push(`${A.general.name} (${A.plan}) vs ${B.general.name} (${B.plan}) on ${r.terrain}.`);
  for (const s of ["A", "B"] as Side[]) {
    const side = r.armies[s];
    const notes = side.traits.map((t) => `${t.name} ${t.level === 2 ? "II" : "I"}`);
    if (side.combinedArms) notes.push("Combined Arms");
    if (side.styleMatch) notes.push(`${side.general.style} doctrine`);
    const dep = r.fronts![s].map((f) => `${FRONT_NAME[f.front]} ${f.unitIds.length}`).join(", ");
    lines.push(`${side.general.name} deploys ${dep}${notes.length ? `; brings ${notes.join(", ")}` : ""}.`);
  }
  const rounds = r.rounds!;
  const sk = rounds[0]?.contests.filter((c) => c.stage === "skirmish" && c.edge >= 0.15) ?? [];
  if (sk.length) {
    const best = sk.sort((a, b) => b.edge - a.edge)[0];
    const tops = best.winner === "A" ? best.topA : best.topB;
    lines.push(`${name(best.winner)}'s ${tops[0]?.name ?? "skirmishers"} win the missile exchange on the ${FRONT_NAME[best.winner === "A" ? best.frontA : best.frontB]}.`);
  } else lines.push("The missile exchange is even.");
  const ct = rounds.find((x) => x.contests.some((c) => c.stage === "contact"));
  if (ct) {
    const parts = ct.contests.filter((c) => c.stage === "contact").map((c) => {
      const f = FRONT_NAME[c.winner === "A" ? c.frontA : c.frontB];
      const tops = c.winner === "A" ? c.topA : c.topB;
      return c.edge < 0.1 ? `the ${FRONT_NAME[c.frontA]} holds even` : `${name(c.winner)}'s ${tops[0]?.name ?? "assault"} ${c.edge > 0.3 ? "shatter" : "win"} the ${f}`;
    });
    lines.push(`Contact: ${parts.join("; ")}.`);
    for (const c of ct.contests) if (c.note?.includes("rampage")) lines.push(`${name(c.winner === "A" ? "B" : "A")}'s ${c.note} and trample their own ${FRONT_NAME[c.winner === "A" ? c.frontB : c.frontA]}.`);
    for (const ev of ct.events) lines.push(describeEvent(ev, name));
  }
  for (const rd of rounds.slice(1 + (ct ? 1 : 0))) {
    const bits: string[] = [];
    for (const c of rd.contests) if (c.stage === "rollup") {
      const s = c.note!.startsWith("A") ? "A" : "B";
      const target = c.note!.slice(-1) as Front;
      bits.push(`${name(s)}'s ${(s === "A" ? c.topA : c.topB)[0]?.name ?? "troops"} wheel into ${name(s === "A" ? "B" : "A")}'s ${FRONT_NAME[target]}${c.edge === 0 ? " and are held" : ""}`);
    }
    for (const ev of rd.events) bits.push(describeEvent(ev, name));
    if (bits.length) lines.push(`Round ${rd.round}: ${bits.join("; ")}.`);
  }
  const W = r.armies[r.winner], L = r.armies[r.winner === "A" ? "B" : "A"];
  const lSide = r.winner === "A" ? "B" : "A";
  if (r.brokeInPhase === "break") lines.push(`Night falls with both armies still standing; ${L.general.name}'s is the more shaken. ${W.general.name} wins a ${margin > 0.3 ? "clear" : "narrow"} victory.`);
  else lines.push(`${L.general.name}'s army routs at ${r.brokeInPhase}. ${W.general.name} wins a crushing victory.`);
  if (r.generalFell![lSide]) lines.push(`${L.general.name} falls with the center.`);
  else if (r.fronts![r.winner].find((f) => f.front === "C")!.broken) lines.push(`${W.general.name}'s own center had broken; the wings won the day and the general lives.`);
  const cw = r.casualties[r.winner], cl = r.casualties[lSide];
  lines.push(`Casualties — ${W.general.name}: ${(cw * 100).toFixed(0)}%, ${L.general.name}: ${(cl * 100).toFixed(0)}%.`);
  return lines;
}

function describeEvent(ev: string, name: (s: Side) => string): string {
  const m = ev.match(/^([AB])(?::([LCR]))? (.*)$/);
  if (!m) return ev;
  const [, side, front, what] = m;
  const who = name(side as Side);
  if (what === "breaks") return `${who}'s ${FRONT_NAME[front as Front]} breaks`;
  if (what === "routs") return `${who}'s army routs`;
  if (what.startsWith("is empty")) return `${who}'s ${FRONT_NAME[front as Front]} is empty and gives way`;
  if (what.startsWith("pursues")) return `${who}'s ${FRONT_NAME[front as Front]} wing pursues off the field`;
  if (what.startsWith("is free")) return `${who}'s ${FRONT_NAME[front as Front]} wing is free but the enemy center is already gone`;
  return `${who}: ${what}`;
}
