// Army preparation (HANDOFF §4): slot penalties, traits, combined arms, plan, command, morale, terrain.
// Produces a PreparedArmy with effective per-unit stats and per-side modifiers. Pure; no RNG.

import { cultureCounts, slotPenalty, isWrecked, traitLevel } from "./draft.js";
import { defaultDeployment } from "./deploy.js";
import type { Army, Front, GameData, General, PhaseName, PlanName, RuleName, SlotKind, Stats, StatKey, TerrainName, Unit, UnitClass } from "./types.js";

export interface PreparedUnit {
  unit: Unit;
  slot: SlotKind;
  /** The class the unit plays in the sim: the slot's class (flex → the unit's own class). */
  role: UnitClass;
  stats: Stats;
  penalty: number;
  wrecked: boolean;
  /** Three-fronts model only. */
  front?: Front;
}

export interface ActiveTrait {
  culture: string;
  name: string;
  level: 1 | 2;
  count: number;
}

export interface PreparedArmy {
  general: General;
  plan: PlanName;
  units: PreparedUnit[];
  /** v1: per phase. fronts: skirmish, charge = contact and roll-up, grind = center press, flank = wing press. */
  phaseMult: Record<PhaseName, number>;
  /** fronts only: multiplier on the contact's own-steadiness term (plan and traits). */
  steadinessMult: number;
  /** fronts only: multiplier on roll-up impact (traits). */
  rollupMult: number;
  phaseWeights: Record<PhaseName, number>;
  /** Multiplier applied to the general's tactics contribution in the flank (Carthage L2). */
  tacticsMult: number;
  cmd: number;
  moraleThreshold: number;
  /** Components kept so events (general falls) can recompute the threshold. */
  moraleParts: { avgDiscipline: number; charisma: number; mult: number };
  terrainChargeMult: number;
  rules: Set<RuleName>;
  traits: ActiveTrait[];
  combinedArms: boolean;
  styleMatch: boolean;
  startsShaken: boolean;
  cultureCounts: Record<string, number>;
  totalCost: number;
}

export interface PrepareOptions {
  /** Set false to measure trait lift (batch --trait-toggle). Default true. */
  traits?: boolean;
}

const STAT_KEYS: StatKey[] = ["melee", "ranged", "armor", "mobility", "discipline", "shock"];
const PHASES: PhaseName[] = ["skirmish", "charge", "grind", "flank"];

export function roleFor(unit: Unit, slot: SlotKind): UnitClass {
  if (slot === "flex") return unit.class;
  if (slot === "ranged") return unit.class === "skirmish" ? "skirmish" : "ranged";
  return slot;
}

export function prepareArmy(data: GameData, army: Army, terrain: TerrainName, opts: PrepareOptions = {}): PreparedArmy {
  const { rules, cultures } = data;
  const general = data.generalById.get(army.generalId);
  if (!general) throw new Error(`unknown general ${army.generalId}`);
  if (army.slots.length !== rules.slots.length) throw new Error(`army must have ${rules.slots.length} slots`);
  const frontsPlan = rules.battleModel === "fronts" ? rules.fronts.plans[army.plan] : null;
  const plan = frontsPlan
    ? { skirmish: frontsPlan.skirmish, charge: frontsPlan.contact, grind: frontsPlan.center, flank: frontsPlan.wing, moraleThreshold: frontsPlan.moraleThreshold }
    : rules.plans[army.plan];
  if (!plan) throw new Error(`unknown plan ${army.plan}`);
  let steadinessMult = frontsPlan?.steadiness ?? 1;
  let rollupMult = 1;
  const useTraits = opts.traits ?? true;

  // 1–2. Slot penalties and roles (v1). In the fronts model a unit is its stats plus a front: no penalties.
  const frontsModel = rules.battleModel === "fronts";
  const deployment = frontsModel ? (army.deployment?.length === army.slots.length ? army.deployment : defaultDeployment(data, army)) : null;
  let startsShaken = false;
  const units: PreparedUnit[] = army.slots.map((s, i) => {
    const unit = data.unitById.get(s.unitId);
    if (!unit) throw new Error(`unknown unit ${s.unitId}`);
    const stats = { ...unit.stats };
    if (frontsModel) return { unit, slot: s.slot, role: unit.class, stats, penalty: 1, wrecked: false, front: deployment![i] };
    const penalty = slotPenalty(data, unit, s.slot);
    if (penalty === null) throw new Error(`${unit.id} (${unit.class}) may not be placed in a ${s.slot} slot`);
    const wrecked = penalty < 1 && isWrecked(data, penalty);
    if (wrecked) startsShaken = true;
    for (const k of STAT_KEYS) stats[k] *= penalty;
    return { unit, slot: s.slot, role: roleFor(unit, s.slot), stats, penalty, wrecked };
  });

  const phaseMult: Record<PhaseName, number> = { skirmish: 1, charge: 1, grind: 1, flank: 1 };
  const phaseWeights: Record<PhaseName, number> = { ...rules.phaseWeights };
  let moraleMult = 1;
  let tacticsMult = 1;
  const ruleFlags = new Set<RuleName>();
  const traits: ActiveTrait[] = [];

  // 3. Culture traits.
  const counts = cultureCounts(data, units.map((u) => u.unit), general);
  if (useTraits) {
    for (const [cid, count] of Object.entries(counts)) {
      const level = traitLevel(data, count);
      if (level === 0) continue;
      const culture = cultures[cid];
      traits.push({ culture: cid, name: culture.trait, level, count });
      const entries = level === 2 ? culture.level2 : culture.level1;
      for (const e of entries) {
        if ("phase" in e && "mult" in e && !("generalStat" in e)) phaseMult[e.phase] *= e.mult;
        else if ("stat" in e) {
          const keys = e.stat === "all" ? STAT_KEYS : [e.stat];
          for (const pu of units) {
            const match = e.scope === "culture" ? pu.unit.culture === cid : pu.unit.culture !== cid;
            if (match) for (const k of keys) pu.stats[k] *= e.mult;
          }
        } else if ("moraleThreshold" in e) moraleMult *= e.moraleThreshold;
        else if ("eliteSlots" in e) { /* draft-time only */ }
        else if ("phaseWeight" in e) phaseWeights[e.phaseWeight] = e.value;
        else if ("generalStat" in e) { if (e.generalStat === "tactics" && e.phase === "flank") tacticsMult *= e.mult; }
        else if ("steadiness" in e) steadinessMult *= e.steadiness;
        else if ("rollup" in e) rollupMult *= e.rollup;
        else if ("rule" in e) ruleFlags.add(e.rule);
      }
    }
  }

  // 4. Combined arms (by role).
  const plays = (c: UnitClass) => units.some((u) => u.role === c);
  const combinedArms = plays("line") && plays("cavalry") && (plays("ranged") || plays("skirmish"));
  if (combinedArms) { phaseMult.flank *= 1.10; phaseMult.grind *= 1.05; }

  // 5. Plan and style match.
  for (const p of PHASES) phaseMult[p] *= plan[p];
  moraleMult *= plan.moraleThreshold;
  const styleMatch = rules.styleToPlan[general.style] === army.plan;
  if (styleMatch) for (const p of PHASES) phaseMult[p] *= rules.styleMatchBonus;

  // 8. Terrain, by natural class or subtype.
  const t = rules.terrain[terrain];
  if (!t) throw new Error(`unknown terrain ${terrain}`);
  for (const pu of units) {
    const m = (t[pu.unit.subtype] ?? 1) * (t[pu.unit.class] ?? 1);
    if (m !== 1) for (const k of STAT_KEYS) pu.stats[k] *= m;
  }
  const terrainChargeMult = t.chargeAttacker ?? 1;

  // 6–7. Command and morale threshold (from effective discipline, after all multipliers).
  const cmd = 0.85 + (general.stats.command / 100) * 0.30;
  const avgDiscipline = units.reduce((s, u) => s + u.stats.discipline, 0) / units.length;
  const charisma = general.stats.charisma;
  const moraleThreshold = (0.55 + (avgDiscipline / 100) * 0.35 + (charisma / 100) * 0.20) * moraleMult;

  return {
    general, plan: army.plan, units, phaseMult, steadinessMult, rollupMult, phaseWeights, tacticsMult, cmd,
    moraleThreshold, moraleParts: { avgDiscipline, charisma, mult: moraleMult },
    terrainChargeMult, rules: ruleFlags, traits, combinedArms, styleMatch, startsShaken,
    cultureCounts: counts, totalCost: units.reduce((s, u) => s + u.unit.cost, 0),
  };
}
