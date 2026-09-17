// Army preparation (design/gdd/army-preparation.md): traits, combined arms, plan, ground, command, cohesion.
// Produces a PreparedArmy with effective per-unit stats and per-side modifiers. Pure; no RNG.

import { slotPenalty, isWrecked, cultureCounts } from "./draft.js";
import { defaultDeployment } from "./deploy.js";
import { activeTraits, traitEntries, type ActiveTrait } from "./traits.js";
import type { Army, Front, GameData, General, PhaseName, PlanName, RuleName, SlotKind, Stats, StatKey, TerrainName, TraitEntry, Unit, UnitClass } from "./types.js";

export type { ActiveTrait } from "./traits.js";

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
  /** Ground multiplier applied to this unit's combat stats (1 = none). */
  ground: number;
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
  /** Trait hooks, neutral by default (design/gdd/traits.md). */
  centerShooting: number | null;
  wingShooting: number;
  shakenEdge: number | null;
  pressDecay: number;
  frontageFactor: number;
  reserveFactor: number;
  heaviestFrontContact: number;
  enemyShakenMult: number | null;
  lanchesterBonus: number;
  relief: number;
  rollupDamage: number;
  rally: number;
  noBreakBefore: number;
  /** Cohesion multiplier from the Steady trait alone (so the resolver can tell when it saved a front). */
  steadyMult: number;
  phaseWeights: Record<PhaseName, number>;
  /** Multiplier applied to the general's tactics contribution in the flank. */
  tacticsMult: number;
  cmd: number;
  moraleThreshold: number;
  /** Components kept so events (general falls) can recompute the threshold. */
  moraleParts: { avgDiscipline: number; charisma: number; mult: number };
  terrainChargeMult: number;
  rules: Set<RuleName>;
  /** Every trait this army fields, with level and sources. */
  traits: ActiveTrait[];
  /** Fast lookup of the ids in `traits`. */
  traitIds: Set<string>;
  combinedArms: boolean;
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
  const { rules } = data;
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
    if (frontsModel) return { unit, slot: s.slot, role: unit.class, stats, penalty: 1, wrecked: false, front: deployment![i], ground: 1 };
    const penalty = slotPenalty(data, unit, s.slot);
    if (penalty === null) throw new Error(`${unit.id} (${unit.class}) may not be placed in a ${s.slot} slot`);
    const wrecked = penalty < 1 && isWrecked(data, penalty);
    if (wrecked) startsShaken = true;
    for (const k of STAT_KEYS) stats[k] *= penalty;
    return { unit, slot: s.slot, role: roleFor(unit, s.slot), stats, penalty, wrecked, ground: 1 };
  });

  const phaseMult: Record<PhaseName, number> = { skirmish: 1, charge: 1, grind: 1, flank: 1 };
  const phaseWeights: Record<PhaseName, number> = { ...rules.phaseWeights };
  let moraleMult = 1;
  let steadyMult = 1;
  let tacticsMult = 1;
  const ruleFlags = new Set<RuleName>();

  // 3. Traits: the general's own plus the cultures' at four and six units, levels stacked (traits.ts).
  let centerShooting: number | null = null, wingShooting = 1, shakenEdge: number | null = null, pressDecay = 0;
  let frontageFactor = 1, reserveFactor = 1, heaviestFrontContact = 1;
  let enemyShakenMult: number | null = null, lanchesterBonus = 0, relief = 0, rollupDamage = 1, rally = 0, groundPenalty = 0, noBreakBefore = 0;
  const counts = cultureCounts(data, units.map((u) => u.unit), general);
  const traits = useTraits ? activeTraits(data, general, units.map((u) => u.unit)) : [];
  const sources: { id: string | null; entries: TraitEntry[] }[] = traits.map((t) => ({ id: t.id, entries: traitEntries(data, [t]) }));
  if (army.extraTraits?.length) sources.push({ id: null, entries: army.extraTraits });
  for (const { id, entries } of sources) {
    for (const e of entries) {
      if ("phase" in e && "mult" in e && !("generalStat" in e)) phaseMult[e.phase] *= e.mult;
      else if ("stat" in e) {
        const keys = e.stat === "all" ? STAT_KEYS : [e.stat];
        for (const pu of units) {
          const match = e.scope === "culture" ? pu.unit.culture === general.culture : pu.unit.culture !== general.culture;
          if (match) for (const k of keys) pu.stats[k] *= e.mult;
        }
      } else if ("moraleThreshold" in e) { moraleMult *= e.moraleThreshold; if (id === "steady") steadyMult *= e.moraleThreshold; }
      else if ("eliteSlots" in e) { /* draft-time only */ }
      else if ("phaseWeight" in e) phaseWeights[e.phaseWeight] = e.value;
      else if ("generalStat" in e) { if (e.generalStat === "tactics" && e.phase === "flank") tacticsMult *= e.mult; }
      else if ("steadiness" in e) steadinessMult *= e.steadiness;
      else if ("rollup" in e) rollupMult *= e.rollup;
      else if ("rule" in e) ruleFlags.add(e.rule);
      else if ("centerShooting" in e) centerShooting = Math.max(centerShooting ?? 0, e.centerShooting);
      else if ("wingShooting" in e) wingShooting *= e.wingShooting;
      else if ("shakenEdge" in e) shakenEdge = Math.min(shakenEdge ?? Infinity, e.shakenEdge);
      else if ("pressDecay" in e) pressDecay += e.pressDecay;
      else if ("frontage" in e) frontageFactor *= e.frontage;
      else if ("reserve" in e) reserveFactor *= e.reserve;
      else if ("heaviestFrontContact" in e) heaviestFrontContact *= e.heaviestFrontContact;
      else if ("enemyShakenMult" in e) enemyShakenMult = Math.min(enemyShakenMult ?? Infinity, e.enemyShakenMult);
      else if ("lanchester" in e) lanchesterBonus += e.lanchester;
      else if ("relief" in e) relief += e.relief;
      else if ("rollupDamage" in e) rollupDamage *= e.rollupDamage;
      else if ("rally" in e) rally = Math.max(rally, e.rally);
      else if ("groundPenalty" in e) groundPenalty = Math.max(groundPenalty, e.groundPenalty);
      else if ("noBreakBefore" in e) noBreakBefore = Math.max(noBreakBefore, e.noBreakBefore);
    }
  }

  // 4. Combined arms (by role).
  const plays = (c: UnitClass) => units.some((u) => u.role === c);
  const combinedArms = plays("line") && plays("cavalry") && (plays("ranged") || plays("skirmish"));
  if (combinedArms) { phaseMult.flank *= 1.10; phaseMult.grind *= 1.05; }

  // 5. Plan.
  for (const p of PHASES) phaseMult[p] *= plan[p];
  moraleMult *= plan.moraleThreshold;

  // 6. Ground, by natural class or subtype, on combat stats only (`groundExcludes` are left alone).
  const t = rules.terrain[terrain];
  if (!t) throw new Error(`unknown terrain ${terrain}`);
  // Master of ground removes a fraction of each penalty (values below 1); bonuses are untouched.
  const ground = (v: number | undefined) => (v === undefined ? 1 : v < 1 ? 1 - (1 - v) * (1 - Math.min(1, groundPenalty)) : v);
  const excluded = new Set<StatKey>(rules.groundExcludes ?? []);
  for (const pu of units) {
    const m = ground(t[pu.unit.subtype]) * ground(t[pu.unit.class]);
    pu.ground = m;
    if (m !== 1) for (const k of STAT_KEYS) if (!excluded.has(k)) pu.stats[k] *= m;
  }
  const terrainChargeMult = t.chargeAttacker ?? 1;

  // 7. Command and cohesion (from effective STEADY, after all multipliers).
  const cmd = rules.command.base + (general.stats.command / 100) * rules.command.slope;
  const avgDiscipline = units.reduce((s, u) => s + u.stats.discipline, 0) / units.length;
  const charisma = general.stats.charisma;
  const moraleThreshold = (0.55 + (avgDiscipline / 100) * 0.35 + (charisma / 100) * 0.20) * moraleMult;

  return {
    general, plan: army.plan, units, phaseMult, steadinessMult, rollupMult, phaseWeights, tacticsMult, cmd,
    centerShooting, wingShooting, shakenEdge, pressDecay, frontageFactor, reserveFactor, heaviestFrontContact,
    enemyShakenMult, lanchesterBonus, relief, rollupDamage, rally, noBreakBefore, steadyMult,
    moraleThreshold, moraleParts: { avgDiscipline, charisma, mult: moraleMult },
    terrainChargeMult, rules: ruleFlags, traits, traitIds: new Set(traits.map((x) => x.id)), combinedArms, startsShaken,
    cultureCounts: counts, totalCost: units.reduce((s, u) => s + u.unit.cost, 0),
  };
}
