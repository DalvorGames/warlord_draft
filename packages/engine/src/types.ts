// Core data shapes. Everything numeric that can be tuned lives in rules.json, never here.

export type UnitClass = "line" | "shock" | "cavalry" | "ranged" | "skirmish" | "special";
export type SlotKind = "line" | "shock" | "cavalry" | "ranged" | "flex";
/** The slot class a penalty is keyed by. "ranged" rows accept ranged and skirmish units on-class. */
export type PenaltySlot = "line" | "shock" | "cavalry" | "ranged";
export type Grade = "S" | "A" | "B" | "C" | "D" | "F";
export type Period = "early" | "mid" | "late";
export type StatKey = "melee" | "ranged" | "armor" | "mobility" | "discipline" | "shock";
export type Stats = Record<StatKey, number>;
export type PhaseName = "skirmish" | "charge" | "grind" | "flank";
export type PlanName = "aggressive" | "defensive" | "envelopment" | "skirmish";
export type Style = "hammer" | "envelopment" | "attrition" | "skirmish" | "defensive";
export type TerrainName = "plains" | "hills" | "river" | "forest";
export type Side = "A" | "B";
export type RuleName =
  | "pikes_ignore_shaken"
  | "never_shaken_by_charge"
  | "half_morale_damage_from_lost_grind"
  | "rampage_chance_halved";

export interface Unit {
  id: string;
  name: string;
  culture: string;
  class: UnitClass;
  subtype: string;
  archetype: string;
  cost: number;
  grade: Grade;
  period: Period;
  stats: Stats;
  tags: string[];
}

export interface General {
  id: string;
  name: string;
  culture: string;
  period: Period;
  stats: { command: number; tactics: number; logistics: number; charisma: number };
  style: Style;
  note?: string;
}

export type TraitEntry =
  | { phase: PhaseName; mult: number }
  | { stat: StatKey | "all"; mult: number; scope: "culture" | "other_cultures" }
  | { moraleThreshold: number }
  | { eliteSlots: number }
  | { phaseWeight: PhaseName; value: number }
  | { generalStat: "command" | "tactics" | "logistics" | "charisma"; mult: number; phase: PhaseName }
  | { steadiness: number }
  | { rollup: number }
  | { rule: RuleName };

export interface Culture {
  name: string;
  trait: string;
  level1: TraitEntry[];
  level2: TraitEntry[];
}

export interface PlanMults {
  skirmish: number;
  charge: number;
  grind: number;
  flank: number;
  moraleThreshold: number;
}

export interface EventDef {
  id: string;
  name: string;
  phase: PhaseName;
  effect: string;
  weight: number;
  requires?: string;
  campaignOnly?: boolean;
  params?: Record<string, number>;
}

export type Front = "L" | "C" | "R";

export interface FrontsPlan {
  skirmish: number;
  contact: number;
  steadiness: number;
  center: number;
  wing: number;
  moraleThreshold: number;
}
export type FightKind = "skirmish" | "contact" | "wing" | "center" | "rollup";

export interface FrontsRules {
  rounds: number;
  plans: Record<PlanName, FrontsPlan>;
  terrain: Record<TerrainName, Partial<Record<FightKind, number>>>;
  edgeCap: number;
  weights: { skirmish: number; contact: number; press: number; rollup: number };
  chargeCurve: number;
  wingCurve: number;
  lineSkirmishMult: number;
  steadinessCoef: number;
  lanchester: number;
  emptyFrontWeight: number;
  wingBreakShock: number;
  centerBreakShock: number;
  routLevel: number;
  rollupMult: number;
  flankedMult: number;
  frontage: number;
  reserveMult: number;
  rampageChance: number;
}

export interface Rules {
  dataVersion: number;
  battleModel: "v1" | "fronts";
  fronts: FrontsRules;
  grades: Record<Grade, [number, number]>;
  draftRarity: Record<Grade, number>;
  slots: SlotKind[];
  cardsPerRow: number;
  onClassCardsPerRow: number;
  rerolls: number;
  homeCultureTilt: number;
  generalPool: number;
  eliteCap: { base: number; logisticsThreshold: number; withLogistics: number };
  traitThresholds: [number, number];
  generalCountsAsUnit: boolean;
  slotPenalties: Record<UnitClass, Record<PenaltySlot, number | null>>;
  lightCavInRangedSlot: number;
  wreckedThreshold: number;
  plans: Record<PlanName, PlanMults>;
  styleToPlan: Record<Style, PlanName>;
  styleMatchBonus: number;
  terrain: Record<TerrainName, Record<string, number>>;
  phaseWeights: Record<PhaseName, number>;
  noiseSD: number;
  lanchesterExponent: number;
  grindBodyWeight: Record<UnitClass, number>;
  shakenMult: number;
  shakenEdge: number;
  chargeSteadinessSide: "own" | "enemy";
  chargeSteadinessCoef: number;
  chargeWallMatchup: boolean;
  chargeWallRoles: UnitClass[];
  chargeMinShock: number;
  flankFloor: number;
  events: { chancePerBattle: number; list: EventDef[] };
  casualties: {
    loserBase: number;
    loserMargin: number;
    pursuit: number;
    loserMax: number;
    winnerBase: number;
    winnerCloseness: number;
  };
  matchups: Record<string, Record<string, number>>;
}

export interface GameData {
  units: Unit[];
  generals: General[];
  cultures: Record<string, Culture>;
  rules: Rules;
  unitById: Map<string, Unit>;
  generalById: Map<string, General>;
}

/** Engine input: a drafted army. */
export interface ArmySlot {
  slot: SlotKind;
  unitId: string;
}
export interface Army {
  generalId: string;
  slots: ArmySlot[];
  plan: PlanName;
  /** Three-fronts model: one entry per slot. Omitted → `defaultDeployment`. */
  deployment?: Front[];
}
