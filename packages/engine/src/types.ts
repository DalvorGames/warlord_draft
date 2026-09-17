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
  /** Trait ids from `rules.traits`, 0–3 of them (design/gdd/traits.md §3.2). Each scaling trait counts one level. */
  traits: string[];
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
  | { rule: RuleName }
  // --- trait-system hooks (design/gdd/traits.md). Neutral unless a data set or a lab script uses them. ---
  /** Volley: this army's center shoots at this strength instead of `fronts.lineSkirmishMult`. */
  | { centerShooting: number }
  /** Harass: multiplier on this army's wing shooting. */
  | { wingShooting: number }
  /** Terror: enemy fronts that lose contact to this army are shaken above this edge instead of `shakenEdge`. */
  | { shakenEdge: number }
  /** Furor's price: press scores lose this fraction per press round (round 1 = one step), floored at half. */
  | { pressDecay: number }
  /** Numbers: multiplier on `fronts.frontage` for this army. */
  | { frontage: number }
  /** Deep ranks: multiplier on `fronts.reserveMult` for this army; also divides the flanked penalty. */
  | { reserve: number }
  /** Oblique order: contact multiplier on this army's single most heavily loaded front (no bonus on a tie). */
  | { heaviestFrontContact: number }
  /** Terror: fronts shaken by this army fight at this multiplier instead of `shakenMult`. */
  | { enemyShakenMult: number }
  /** Numbers: added to the `fronts.lanchester` exponent for this army's press scores. */
  | { lanchester: number }
  /** Deep ranks: after each press round, each unbroken front sheds this fraction of its cohesion in damage. */
  | { relief: number }
  /** Hammer and anvil: multiplier on the damage this army's roll-ups deal. */
  | { rollupDamage: number }
  /** Rally: the first front to break stands again once with this fraction of its cohesion restored. */
  | { rally: number }
  /** Master of ground: this fraction of every ground penalty is ignored (1 = all of it). */
  | { groundPenalty: number }
  /** Delayer: no front breaks before this press round (1 = survives skirmish and contact, 2 = also round one). */
  | { noBreakBefore: number };

export interface Culture {
  name: string;
  /** The trait id this culture grants at `traitThresholds[0]` units (level I) and `[1]` (level II). */
  trait: string;
}

/** One entry of the shared trait pool (`rules.traits`). Scaling traits have three levels; rule traits one. */
export interface TraitDef {
  name: string;
  kind: "scaling" | "rule";
  /** The one sentence the player is told. */
  text: string;
  /** The culture whose trait this is, if any. */
  culture?: string;
  levels: TraitEntry[][];
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
  /** SUPPLY's rarity nudge: A and S card weight × (1 + maxRelative × clamp((SUPPLY − from) / (100 − from))). */
  supplyNudge: { from: number; maxRelative: number };
  traitThresholds: [number, number];
  generalCountsAsUnit: boolean;
  slotPenalties: Record<UnitClass, Record<PenaltySlot, number | null>>;
  lightCavInRangedSlot: number;
  wreckedThreshold: number;
  plans: Record<PlanName, PlanMults>;
  /** The shared trait pool, by id. */
  traits: Record<string, TraitDef>;
  /** cmd = base + slope × command/100. */
  command: { base: number; slope: number };
  terrain: Record<TerrainName, Record<string, number>>;
  /** Stats the ground multiplier leaves alone (STEADY, so a forest does not make horse brittle). */
  groundExcludes: StatKey[];
  /** Campaign shape (design/gdd/campaign.md §3.6): foe tiers and the player-blind line. */
  campaign: {
    battles: number;
    /** Per battle, the [min, max] summed general stats a foe's general may have. */
    generalBands: [number, number][];
    /** Per battle, the foe army's total-cost ceiling, or null for none. */
    costCeilings: (number | null)[];
    /** The foe's line: candidates simulated against a neutral mirror over `seeds`; those within `nearTie` of the best score (at most `top`) are a seeded pick. */
    blindLine: { seeds: number; nearTie: number; top: number; panel?: number };
  };
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
  /**
   * Extra trait entries applied after culture traits: the hook for general traits (design/gdd/traits.md).
   * Not part of a run string. No shipped data sets it; the lab scripts use it to measure trait sizes.
   */
  extraTraits?: TraitEntry[];
}
