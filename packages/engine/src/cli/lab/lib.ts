// Shared helpers for the balance review scratch scripts. Parametrised copy of the engine's greedy bot.
import { loadData } from "../../node/loadData.js";
import { mulberry32 } from "../../rng.js";
import { pickCard, pickGeneral, rerollRow, setPlan, startDraft, summarize, toArmy, unpickRow, type DraftState, type Card } from "../../draft.js";
import { withDeployment } from "../../deploy.js";
import type { Army, GameData, PlanName } from "../../types.js";

export const data: GameData = loadData();
export const ELITE = new Set(["A", "S"]);
export const PLANS: PlanName[] = ["aggressive", "defensive", "envelopment", "skirmish"];

function tryPick(state: DraftState, row: number, card: number): DraftState | null {
  try { return pickCard(data, state, row, card); } catch { return null; }
}
function freeEliteSlot(state: DraftState, exceptRow: number): DraftState | null {
  for (let r = 0; r < state.rows.length; r++) {
    const row = state.rows[r];
    if (r === exceptRow || row.pick === null) continue;
    if (!ELITE.has(data.unitById.get(row.cards[row.pick].unitId)!.grade)) continue;
    for (let c = 0; c < row.cards.length; c++) {
      if (ELITE.has(data.unitById.get(row.cards[c].unitId)!.grade)) continue;
      const next = tryPick(unpickRow(state, r), r, c);
      if (next) return next;
    }
  }
  return null;
}

export interface GreedyOpts {
  rerolls?: number;            // rerolls granted (default rules.rerolls)
  cultureChase?: boolean;      // default true
  rerollFloor?: number;        // reroll a row whose best value < this (default 7)
  chooseGeneral?: (pool: string[]) => number; // default uniform
  plan?: PlanName | "style";   // default "style"
  eliteWeight?: number;        // extra value per elite card (default 0)
  budget?: number;             // total army cost ceiling; picks keep room for 3-cost cards in the rows left
}

export function greedyState(draftSeed: number, botSeed: number, o: GreedyOpts = {}): DraftState {
  const rng = mulberry32(botSeed);
  let state = startDraft(data, draftSeed, { rerolls: o.rerolls ?? data.rules.rerolls });
  const gi = o.chooseGeneral ? o.chooseGeneral(state.generalPool) : rng.int(state.generalPool.length);
  state = pickGeneral(data, state, gi);
  const general = data.generalById.get(state.generalPool[state.generalIndex!])!;
  const [t1, t2] = data.rules.traitThresholds;
  const chase = o.cultureChase ?? true;
  const cardValue = (card: Card, counts: Record<string, number>): number => {
    const u = data.unitById.get(card.unitId)!;
    let v = u.cost * card.penalty;
    if (card.wrecked) v -= 6;
    if (chase) {
      const n = (counts[u.culture] ?? 0) + 1;
      if (n === t1 || n === t2) v += 2.5;
      else if (n === t1 - 1 || n === t2 - 1) v += 1;
    }
    if (o.eliteWeight && ELITE.has(u.grade)) v += o.eliteWeight;
    return v + rng.next() * 0.01;
  };
  const rowBest = (s: DraftState, row: number) => Math.max(...s.rows[row].cards.map((c) => cardValue(c, summarize(data, s).cultureCounts)));
  const floor = o.rerollFloor ?? 7;
  for (let k = 0; k < (o.rerolls ?? data.rules.rerolls); k++) {
    let worst = -1, worstV = Infinity;
    for (let r = 0; r < state.rows.length; r++) {
      if (state.rows[r].pick !== null) continue;
      const v = rowBest(state, r);
      if (v < worstV) { worstV = v; worst = r; }
    }
    if (worst < 0 || worstV >= floor) break;
    state = rerollRow(data, state, worst);
  }
  for (let n = 0; n < state.rows.length; n++) {
    const counts = summarize(data, state).cultureCounts;
    const candidates: { row: number; card: number; v: number }[] = [];
    state.rows.forEach((r, ri) => {
      if (r.pick !== null) return;
      r.cards.forEach((c, ci) => candidates.push({ row: ri, card: ci, v: cardValue(c, counts) }));
    });
    candidates.sort((a, b) => b.v - a.v);
    let next: DraftState | null = null;
    const spent = summarize(data, state).totalCost;
    const rowsLeft = state.rows.filter((r) => r.pick === null).length;
    const fits = (c: { row: number; card: number }) => o.budget === undefined || spent + data.unitById.get(state.rows[c.row].cards[c.card].unitId)!.cost + 3 * (rowsLeft - 1) <= o.budget;
    for (const c of candidates) { if (!fits(c)) continue; next = tryPick(state, c.row, c.card); if (next) break; }
    // nothing fits the budget: take the cheapest legal card instead of failing
    if (!next && o.budget !== undefined) {
      const cheap = candidates.slice().sort((a, b) => data.unitById.get(state.rows[a.row].cards[a.card].unitId)!.cost - data.unitById.get(state.rows[b.row].cards[b.card].unitId)!.cost);
      for (const c of cheap) { next = tryPick(state, c.row, c.card); if (next) break; }
    }
    if (!next) {
      const stuckRow = state.rows.findIndex((r) => r.pick === null);
      const freed = freeEliteSlot(state, stuckRow);
      if (!freed) throw new Error("greedy: no legal pick");
      state = freed; n--; continue;
    }
    state = next;
  }
  const plan = o.plan && o.plan !== "style" ? o.plan : data.rules.styleToPlan[general.style];
  return setPlan(state, plan);
}
export function greedyArmy(draftSeed: number, botSeed: number, o: GreedyOpts = {}): Army {
  return withDeployment(data, toArmy(data, greedyState(draftSeed, botSeed, o)));
}
export function armyCost(a: Army): number { return a.slots.reduce((t, s) => t + data.unitById.get(s.unitId)!.cost, 0); }
export function pct(x: number, d = 1): string { return (x * 100).toFixed(d) + "%"; }
export function ci95(w: number, n: number): string { const p = w / n; return `±${(196 * Math.sqrt(p * (1 - p) / n)).toFixed(1)}`; }
