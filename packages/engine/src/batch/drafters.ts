// Draft bots for the batch sim. Both pick the general uniformly from the pool so general stats stay measurable.

import { mulberry32, type Rng } from "../rng.js";
import { pickCard, pickGeneral, rerollRow, setPlan, startDraft, summarize, toArmy, unpickRow, type DraftState, type Card } from "../draft.js";
import { withDeployment } from "../deploy.js";
import type { Army, GameData, PlanName } from "../types.js";

export type DrafterName = "random" | "greedy";
export type Drafter = (data: GameData, draftSeed: number, botSeed: number) => Army;
/** Same bots, returning the finished DraftState (plan set) so it can be serialised with toRunString. */
export type DraftStateBot = (data: GameData, draftSeed: number, botSeed: number) => DraftState;

const PLANS: PlanName[] = ["aggressive", "defensive", "envelopment", "skirmish"];
const ELITE = new Set(["A", "S"]);

function tryPick(data: GameData, state: DraftState, row: number, card: number): DraftState | null {
  try { return pickCard(data, state, row, card); } catch { return null; }
}

/**
 * A row can offer only elite cards while the elite cap is already full. Free a slot by swapping an earlier
 * elite pick for a non-elite card in its row. Returns null if no swap is possible.
 */
function freeEliteSlot(data: GameData, state: DraftState, exceptRow: number): DraftState | null {
  for (let r = 0; r < state.rows.length; r++) {
    const row = state.rows[r];
    if (r === exceptRow || row.pick === null) continue;
    if (!ELITE.has(data.unitById.get(row.cards[row.pick].unitId)!.grade)) continue;
    for (let c = 0; c < row.cards.length; c++) {
      if (ELITE.has(data.unitById.get(row.cards[c].unitId)!.grade)) continue;
      const next = tryPick(data, unpickRow(state, r), r, c);
      if (next) return next;
    }
  }
  return null;
}

/** Pick the first legal card in `order` for `row`, freeing an elite slot if the row is all-elite. */
function pickFirstLegal(data: GameData, state: DraftState, row: number, order: number[]): DraftState {
  for (let attempt = 0; attempt < 4; attempt++) {
    for (const c of order) { const next = tryPick(data, state, row, c); if (next) return next; }
    const freed = freeEliteSlot(data, state, row);
    if (!freed) break;
    state = freed;
  }
  throw new Error("no legal card in row " + row);
}

/** Uniform random legal picks, random plan, no rerolls. Measures units, not drafting skill. */
export const randomDraftState: DraftStateBot = (data, draftSeed, botSeed) => {
  const rng = mulberry32(botSeed);
  let state = startDraft(data, draftSeed);
  state = pickGeneral(data, state, rng.int(state.generalPool.length));
  for (let row = 0; row < state.rows.length; row++) {
    const order = state.rows[row].cards.map((_, i) => i);
    // random order, take the first legal card
    for (let i = order.length - 1; i > 0; i--) { const j = rng.int(i + 1); [order[i], order[j]] = [order[j], order[i]]; }
    state = pickFirstLegal(data, state, row, order);
  }
  return setPlan(state, rng.pick(PLANS));
};
export const randomDrafter: Drafter = (data, d, b) => withDeployment(data, toArmy(data, randomDraftState(data, d, b)));

/**
 * Greedy: on-class first, highest cost, chase culture thresholds, reroll the two weakest rows, plan = general's style.
 * A "reasonable player" baseline. Balance numbers should come from this bot.
 */
export const greedyDraftState: DraftStateBot = (data, draftSeed, botSeed) => {
  const rng = mulberry32(botSeed);
  let state = startDraft(data, draftSeed);
  state = pickGeneral(data, state, rng.int(state.generalPool.length));
  const general = data.generalById.get(state.generalPool[state.generalIndex!])!;
  const [t1, t2] = data.rules.traitThresholds;

  const cardValue = (card: Card, counts: Record<string, number>): number => {
    const u = data.unitById.get(card.unitId)!;
    let v = u.cost * card.penalty;
    if (card.wrecked) v -= 6;
    const n = (counts[u.culture] ?? 0) + 1;
    if (n === t1 || n === t2) v += 2.5;
    else if (n === t1 - 1 || n === t2 - 1) v += 1;
    return v + rng.next() * 0.01; // deterministic tie-break
  };
  const rowBest = (s: DraftState, row: number) => Math.max(...s.rows[row].cards.map((c) => cardValue(c, summarize(data, s).cultureCounts)));

  // Rerolls: reroll the weakest rows, if their best card is poor.
  for (let k = 0; k < data.rules.rerolls; k++) {
    let worst = -1, worstV = Infinity;
    for (let r = 0; r < state.rows.length; r++) {
      if (state.rows[r].pick !== null) continue;
      const v = rowBest(state, r);
      if (v < worstV) { worstV = v; worst = r; }
    }
    if (worst < 0 || worstV >= 7) break;
    state = rerollRow(data, state, worst);
  }

  // Picks: repeatedly take the globally best (row, card) that is legal.
  for (let n = 0; n < state.rows.length; n++) {
    const counts = summarize(data, state).cultureCounts;
    const candidates: { row: number; card: number; v: number }[] = [];
    state.rows.forEach((r, ri) => {
      if (r.pick !== null) return;
      r.cards.forEach((c, ci) => candidates.push({ row: ri, card: ci, v: cardValue(c, counts) }));
    });
    candidates.sort((a, b) => b.v - a.v);
    let next: DraftState | null = null;
    for (const c of candidates) { next = tryPick(data, state, c.row, c.card); if (next) break; }
    if (!next) {
      // Every remaining card is elite and the cap is full: swap an earlier elite for a non-elite and retry.
      const stuckRow = state.rows.findIndex((r) => r.pick === null);
      const freed = freeEliteSlot(data, state, stuckRow);
      if (!freed) throw new Error("greedy: no legal pick");
      state = freed;
      n--;
      continue;
    }
    state = next;
  }
  return setPlan(state, data.rules.styleToPlan[general.style]);
};
export const greedyDrafter: Drafter = (data, d, b) => withDeployment(data, toArmy(data, greedyDraftState(data, d, b)));

export const DRAFTERS: Record<DrafterName, Drafter> = { random: randomDrafter, greedy: greedyDrafter };
export const DRAFT_STATE_BOTS: Record<DrafterName, DraftStateBot> = { random: randomDraftState, greedy: greedyDraftState };
