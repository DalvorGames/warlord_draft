// Draft: general pool, the 8-row board, picks, rerolls, run strings.
// All randomness comes from one mulberry32 stream seeded by draftSeed so any client replays it.

import { mulberry32, fromState, type Rng } from "./rng.js";
import type { Army, Front, GameData, Grade, PlanName, SlotKind, Unit, General, PenaltySlot } from "./types.js";

export interface Card {
  unitId: string;
  onClass: boolean;
  /** Stat multiplier if placed here. Always non-null on a dealt card. */
  penalty: number;
  wrecked: boolean;
}
export interface Row {
  slot: SlotKind;
  culture: string;
  cards: Card[];
  /** Index into cards, or null if nothing picked from this row yet. */
  pick: number | null;
}
export interface DraftState {
  dataVersion: number;
  draftSeed: number;
  generalPool: string[];
  generalIndex: number | null;
  rows: Row[];
  rerollsLeft: number;
  /** Row indices rerolled, in order. Order matters: each reroll consumes RNG draws. */
  rerollLog: number[];
  /** RNG state after the board (and any rerolls) — rerolls resume from here. */
  rngState: number;
  plan: PlanName | null;
  /** Three-fronts deployment, one per row; null = engine default. */
  deployment: Front[] | null;
}

export interface DraftSummary {
  cultureCounts: Record<string, number>;
  traitLevels: Record<string, 0 | 1 | 2>;
  eliteUsed: number;
  eliteCap: number;
  totalCost: number;
  picksMade: number;
}

const ELITE: ReadonlySet<Grade> = new Set(["A", "S"]);
const LIGHT_CAV_SUBTYPES: ReadonlySet<string> = new Set(["light_cav", "horse_archer"]);

// ---------- slot rules ----------

export function isOnClass(unit: Unit, slot: SlotKind): boolean {
  if (slot === "flex") return true;
  if (slot === "ranged") return unit.class === "ranged" || unit.class === "skirmish";
  return unit.class === slot;
}

/** Stat multiplier for placing `unit` in `slot`, or null if not allowed. */
export function slotPenalty(data: GameData, unit: Unit, slot: SlotKind): number | null {
  if (slot === "flex") return 1;
  if (isOnClass(unit, slot)) return 1;
  const { rules } = data;
  if (slot === "ranged" && unit.class === "cavalry" && LIGHT_CAV_SUBTYPES.has(unit.subtype)) {
    return rules.lightCavInRangedSlot;
  }
  return rules.slotPenalties[unit.class][slot as PenaltySlot];
}

export function isWrecked(data: GameData, penalty: number): boolean {
  return penalty <= data.rules.wreckedThreshold;
}

// ---------- board generation ----------

function weightedSampleWithoutReplacement(rng: Rng, pool: Unit[], weights: number[], k: number): Unit[] {
  const remaining = pool.map((u, i) => ({ u, w: weights[i] }));
  const out: Unit[] = [];
  while (out.length < k && remaining.length > 0) {
    const idx = rng.weightedIndex(remaining.map((r) => r.w));
    out.push(remaining[idx].u);
    remaining.splice(idx, 1);
  }
  return out;
}

function shuffleInPlace<T>(rng: Rng, arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = rng.int(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function rollRow(data: GameData, rng: Rng, slot: SlotKind, homeCulture: string): Row {
  const { rules, units } = data;
  const cultureIds = Object.keys(data.cultures);
  let culture: string;
  if (rng.next() < rules.homeCultureTilt) culture = homeCulture;
  else culture = rng.pick(cultureIds.filter((c) => c !== homeCulture));

  const cultureUnits = units.filter((u) => u.culture === culture);
  const rarity = (u: Unit) => rules.draftRarity[u.grade];

  const onPool = cultureUnits.filter((u) => isOnClass(u, slot));
  const offPool = cultureUnits.filter((u) => !isOnClass(u, slot) && slotPenalty(data, u, slot) !== null);

  const onDrawn = weightedSampleWithoutReplacement(rng, onPool, onPool.map(rarity), rules.onClassCardsPerRow);
  const offDrawn = weightedSampleWithoutReplacement(rng, offPool, offPool.map(rarity), rules.cardsPerRow - rules.onClassCardsPerRow);
  let drawn = [...onDrawn, ...offDrawn];
  // Fill to cardsPerRow when a pool ran short: more on-class first (e.g. cavalry rows have no legal
  // off-class card), then more off-class (e.g. a Steppe shock row has one shock unit).
  for (const pool of [onPool, offPool]) {
    if (drawn.length >= rules.cardsPerRow) break;
    const rest = pool.filter((u) => !drawn.includes(u));
    drawn = drawn.concat(weightedSampleWithoutReplacement(rng, rest, rest.map(rarity), rules.cardsPerRow - drawn.length));
  }
  shuffleInPlace(rng, drawn);

  const cards: Card[] = drawn.map((u) => {
    const penalty = slotPenalty(data, u, slot)!;
    return { unitId: u.id, onClass: isOnClass(u, slot), penalty, wrecked: isWrecked(data, penalty) };
  });
  return { slot, culture, cards, pick: null };
}

// ---------- state transitions (each returns a new state; inputs are not mutated) ----------

function clone(state: DraftState): DraftState {
  return { ...state, generalPool: [...state.generalPool], rows: state.rows.map((r) => ({ ...r, cards: r.cards.map((c) => ({ ...c })) })), rerollLog: [...state.rerollLog] };
}

/** `rerolls` overrides the rule's default (verified play grants rerolls per run, e.g. after a rewarded ad). */
export function startDraft(data: GameData, draftSeed: number, opts: { rerolls?: number } = {}): DraftState {
  const rng = mulberry32(draftSeed);
  const pool: string[] = [];
  const ids = data.generals.map((g) => g.id);
  while (pool.length < data.rules.generalPool && pool.length < ids.length) {
    const g = rng.pick(ids);
    if (!pool.includes(g)) pool.push(g);
  }
  return {
    dataVersion: data.rules.dataVersion,
    draftSeed,
    generalPool: pool,
    generalIndex: null,
    rows: [],
    rerollsLeft: opts.rerolls ?? data.rules.rerolls,
    rerollLog: [],
    rngState: rng.state(),
    plan: null,
    deployment: null,
  };
}

export function pickGeneral(data: GameData, state: DraftState, index: number): DraftState {
  if (state.generalIndex !== null) throw new Error("general already picked");
  if (index < 0 || index >= state.generalPool.length) throw new Error(`bad general index ${index}`);
  const next = clone(state);
  next.generalIndex = index;
  const general = data.generalById.get(state.generalPool[index])!;
  const rng = fromState(state.rngState);
  next.rows = data.rules.slots.map((slot) => rollRow(data, rng, slot, general.culture));
  next.rngState = rng.state();
  return next;
}

export function rerollRow(data: GameData, state: DraftState, rowIndex: number): DraftState {
  if (state.generalIndex === null) throw new Error("pick a general first");
  if (state.rerollsLeft <= 0) throw new Error("no rerolls left");
  const row = state.rows[rowIndex];
  if (!row) throw new Error(`bad row ${rowIndex}`);
  if (row.pick !== null) throw new Error("cannot reroll a row you have picked from");
  const next = clone(state);
  const general = data.generalById.get(state.generalPool[state.generalIndex])!;
  const rng = fromState(state.rngState);
  next.rows[rowIndex] = rollRow(data, rng, row.slot, general.culture);
  next.rngState = rng.state();
  next.rerollsLeft--;
  next.rerollLog.push(rowIndex);
  return next;
}

export function pickCard(data: GameData, state: DraftState, rowIndex: number, cardIndex: number, opts: { enforce?: boolean } = {}): DraftState {
  const enforce = opts.enforce ?? true;
  if (state.generalIndex === null) throw new Error("pick a general first");
  const row = state.rows[rowIndex];
  if (!row) throw new Error(`bad row ${rowIndex}`);
  const card = row.cards[cardIndex];
  if (!card) throw new Error(`bad card ${cardIndex} in row ${rowIndex}`);
  const next = clone(state);
  next.rows[rowIndex].pick = cardIndex;
  if (enforce) {
    const s = summarize(data, next);
    if (s.eliteUsed > s.eliteCap) throw new Error(`elite cap: ${s.eliteUsed} > ${s.eliteCap}`);
  }
  return next;
}

export function unpickRow(state: DraftState, rowIndex: number): DraftState {
  const next = clone(state);
  next.rows[rowIndex].pick = null;
  return next;
}

export function setPlan(state: DraftState, plan: PlanName): DraftState {
  return { ...clone(state), plan };
}

export function setDeployment(state: DraftState, deployment: Front[] | null): DraftState {
  if (deployment && (deployment.length !== state.rows.length || deployment.some((f) => !"LCR".includes(f)))) throw new Error("deployment must be one of L/C/R per row");
  return { ...clone(state), deployment: deployment ? [...deployment] : null };
}

// ---------- derived views ----------

export function selectedGeneral(data: GameData, state: DraftState): General | null {
  return state.generalIndex === null ? null : data.generalById.get(state.generalPool[state.generalIndex])!;
}

export function pickedUnits(data: GameData, state: DraftState): { row: Row; card: Card; unit: Unit }[] {
  const out: { row: Row; card: Card; unit: Unit }[] = [];
  for (const row of state.rows) {
    if (row.pick === null) continue;
    const card = row.cards[row.pick];
    out.push({ row, card, unit: data.unitById.get(card.unitId)! });
  }
  return out;
}

/** Culture counts and trait levels for any list of units plus a general. Shared with prepare(). */
export function cultureCounts(data: GameData, units: Unit[], general: General | null): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const u of units) counts[u.culture] = (counts[u.culture] ?? 0) + 1;
  if (general && data.rules.generalCountsAsUnit) counts[general.culture] = (counts[general.culture] ?? 0) + 1;
  return counts;
}

export function traitLevel(data: GameData, count: number): 0 | 1 | 2 {
  const [t1, t2] = data.rules.traitThresholds;
  return count >= t2 ? 2 : count >= t1 ? 1 : 0;
}

export function eliteCapFor(data: GameData, general: General | null, counts: Record<string, number>): number {
  const { rules, cultures } = data;
  let cap = rules.eliteCap.base;
  if (general && general.stats.logistics >= rules.eliteCap.logisticsThreshold) cap = rules.eliteCap.withLogistics;
  for (const [cid, n] of Object.entries(counts)) {
    const lvl = traitLevel(data, n);
    if (lvl === 0) continue;
    const entries = lvl === 2 ? cultures[cid].level2 : cultures[cid].level1;
    for (const e of entries) if ("eliteSlots" in e) cap += e.eliteSlots;
  }
  return cap;
}

export function summarize(data: GameData, state: DraftState): DraftSummary {
  const general = selectedGeneral(data, state);
  const picks = pickedUnits(data, state);
  const units = picks.map((p) => p.unit);
  const counts = cultureCounts(data, units, general);
  const traitLevels: Record<string, 0 | 1 | 2> = {};
  for (const [cid, n] of Object.entries(counts)) traitLevels[cid] = traitLevel(data, n);
  return {
    cultureCounts: counts,
    traitLevels,
    eliteUsed: units.filter((u) => ELITE.has(u.grade)).length,
    eliteCap: eliteCapFor(data, general, counts),
    totalCost: units.reduce((s, u) => s + u.cost, 0),
    picksMade: picks.length,
  };
}

/** Validate a finished draft. Returns a list of problems (empty = valid). */
export function validateDraft(data: GameData, state: DraftState): string[] {
  const problems: string[] = [];
  if (state.generalIndex === null) problems.push("no general picked");
  const missing = state.rows.map((r, i) => (r.pick === null ? i : -1)).filter((i) => i >= 0);
  if (state.rows.length === 0) problems.push("no board");
  if (missing.length) problems.push(`rows not picked: ${missing.join(",")}`);
  if (!state.plan) problems.push("no plan chosen");
  const s = summarize(data, state);
  if (s.eliteUsed > s.eliteCap) problems.push(`elite cap exceeded: ${s.eliteUsed} > ${s.eliteCap}`);
  return problems;
}

export function toArmy(data: GameData, state: DraftState): Army {
  const problems = validateDraft(data, state);
  if (problems.length) throw new Error(`draft incomplete: ${problems.join("; ")}`);
  return {
    generalId: state.generalPool[state.generalIndex!],
    slots: state.rows.map((r) => ({ slot: r.slot, unitId: r.cards[r.pick!].unitId })),
    plan: state.plan!,
    ...(state.deployment ? { deployment: [...state.deployment] } : {}),
  };
}

// ---------- run strings ----------

export function toRunString(state: DraftState): string {
  const parts = [
    `v=${state.dataVersion}`,
    `d=${state.draftSeed}`,
    `g=${state.generalIndex ?? ""}`,
    `p=${state.rows.map((r) => (r.pick === null ? "" : r.pick)).join(",")}`,
    `r=${state.rerollLog.join(",")}`,
    `plan=${state.plan ?? ""}`,
  ];
  if (state.deployment) parts.push(`dep=${state.deployment.join("")}`);
  return parts.join("&");
}

export function parseRunString(run: string): { v: number; d: number; g: number | null; p: (number | null)[]; r: number[]; plan: PlanName | null; dep: Front[] | null } {
  const kv = new Map(run.split("&").map((kv) => kv.split("=") as [string, string]));
  const num = (s: string | undefined) => (s === undefined || s === "" ? null : Number(s));
  const p = (kv.get("p") ?? "").split(",").map((s) => num(s));
  const r = (kv.get("r") ?? "").split(",").filter((s) => s !== "").map(Number);
  return {
    v: Number(kv.get("v")),
    d: Number(kv.get("d")),
    g: num(kv.get("g")),
    p: p.length === 1 && p[0] === null ? [] : p,
    r,
    plan: (kv.get("plan") || null) as PlanName | null,
    dep: kv.get("dep") ? (kv.get("dep")!.split("") as Front[]) : null,
  };
}

/** Rebuild the draft state (and the Army, if complete) from a run string. */
export function replayDraft(data: GameData, run: string, opts: { rerolls?: number } = {}): { state: DraftState; army: Army | null } {
  const q = parseRunString(run);
  if (q.v !== data.rules.dataVersion) throw new Error(`run string is data version ${q.v}, engine has ${data.rules.dataVersion}`);
  // A replay must accept exactly the rerolls the run took; the verifier passes the granted count.
  let state = startDraft(data, q.d, { rerolls: opts.rerolls ?? Math.max(data.rules.rerolls, q.r.length) });
  if (q.g === null) return { state, army: null };
  state = pickGeneral(data, state, q.g);
  for (const row of q.r) state = rerollRow(data, state, row);
  q.p.forEach((c, row) => {
    if (c !== null) state = pickCard(data, state, row, c, { enforce: false });
  });
  if (q.plan) state = setPlan(state, q.plan);
  if (q.dep) state = setDeployment(state, q.dep);
  const army = validateDraft(data, state).length === 0 ? toArmy(data, state) : null;
  return { state, army };
}
