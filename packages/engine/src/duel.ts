// Helpers for 1v1 rooms (docs/versus-plan.md §5): see a battle from the guest's seat, and the auto-picks the
// server applies when a timer runs out. Nothing here changes a rule.

import { pickCard, unpickRow, type DraftState } from "./draft.js";
import type { BattleResult, PhaseRecord } from "./resolve.js";
import type { ContestRecord, RoundRecord, TraitEvent } from "./resolveFronts.js";
import type { GameData, Side } from "./types.js";

const other = (s: Side): Side => (s === "A" ? "B" : "A");

function swapContest(c: ContestRecord): ContestRecord {
  return { ...c, frontA: c.frontB, frontB: c.frontA, scoreA: c.scoreB, scoreB: c.scoreA, winner: other(c.winner), damageA: c.damageB, damageB: c.damageA, topA: c.topB, topB: c.topA, note: c.note?.replace(/\b([AB])(?=:|\b)/g, (m) => other(m as Side)) };
}
function swapEvent(ev: string): string {
  return ev.replace(/^([AB])/, (s) => other(s as Side)).replace(/ into ([AB]):/, (_, s: string) => ` into ${other(s as Side)}:`);
}
function swapTrait(t: TraitEvent): TraitEvent {
  return { ...t, side: other(t.side), frontSide: other(t.frontSide) };
}
function swapRound(rd: RoundRecord): RoundRecord {
  return { ...rd, contests: rd.contests.map(swapContest), events: rd.events.map(swapEvent), traits: (rd.traits ?? []).map(swapTrait), moraleA: rd.moraleB, moraleB: rd.moraleA };
}
function swapPhase(p: PhaseRecord): PhaseRecord {
  return { ...p, scoreA: p.scoreB, scoreB: p.scoreA, winner: other(p.winner), damageA: p.damageB, damageB: p.damageA, moraleA: p.moraleB, moraleB: p.moraleA, topA: p.topB, topB: p.topA, shakenA: p.shakenB, shakenB: p.shakenA };
}

/**
 * The same battle with A and B exchanged, so the guest's screens can keep "A = you". `resolve` is not
 * symmetric (the RNG draws in side order), so both players resolve host-versus-guest and the guest flips.
 */
export function flipSides(r: BattleResult): BattleResult {
  return {
    ...r,
    winner: other(r.winner),
    phaseLog: r.phaseLog.map(swapPhase),
    rounds: r.rounds?.map(swapRound),
    fronts: r.fronts ? { A: r.fronts.B, B: r.fronts.A } : undefined,
    generalFell: r.generalFell ? { A: r.generalFell.B, B: r.generalFell.A } : undefined,
    moraleFraction: { A: r.moraleFraction.B, B: r.moraleFraction.A },
    casualties: { A: r.casualties.B, B: r.casualties.A },
    armies: { A: r.armies.B, B: r.armies.A },
  };
}

/**
 * The auto-pick for a draft row whose timer ran out: the first card that is legal. If every card is elite and
 * the cap is full, an earlier elite pick is swapped for a non-elite card in its row so the row can be taken.
 */
export function firstLegalCard(data: GameData, state: DraftState, row: number): { state: DraftState; card: number } {
  const tryPick = (s: DraftState, r: number, c: number): DraftState | null => { try { return pickCard(data, s, r, c); } catch { return null; } };
  for (let c = 0; c < state.rows[row].cards.length; c++) { const next = tryPick(state, row, c); if (next) return { state: next, card: c }; }
  const elite = (id: string) => { const g = data.unitById.get(id)!.grade; return g === "A" || g === "S"; };
  for (let r = 0; r < state.rows.length; r++) {
    const rw = state.rows[r];
    if (r === row || rw.pick === null || !elite(rw.cards[rw.pick].unitId)) continue;
    for (let c = 0; c < rw.cards.length; c++) {
      if (elite(rw.cards[c].unitId)) continue;
      const swapped = tryPick(unpickRow(state, r), r, c);
      if (!swapped) continue;
      const next = tryPick(swapped, row, 0);
      if (next) return { state: next, card: 0 };
    }
  }
  throw new Error(`no legal card in row ${row}`);
}
