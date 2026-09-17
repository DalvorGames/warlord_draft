// Derived views for the match report (v3 §3.6, §4.5–4.7): the front strip, contest rows, the chronicle.
import { strength, type BattleResult, type Beat, type ContestRecord, type Front } from "@warlord/engine";

export const FRONT_WORD: Record<Front, string> = { L: "LEFT", C: "CENTER", R: "RIGHT" };
export const OPP: Record<Front, Front> = { L: "R", C: "C", R: "L" };

export interface ContestRow { k: string; yourShare: number; word: string; pct: string; winner: "A" | "B" | null }

/** One row per contest of a beat: your share of the two scores, the edge word and the signed percent (v3 §4.6). */
export function contestRows(beat: Beat): ContestRow[] {
  return beat.contests.map((c) => {
    const total = Math.max(c.scoreA + c.scoreB, 1e-9);
    const k = c.stage === "rollup" ? (c.note?.startsWith("A") ? `${c.frontA}→${c.frontB}` : `${c.frontB}→${c.frontA}`) : c.frontA;
    const yours = c.winner === "A";
    const e = c.edge;
    const word = e === 0 ? (c.stage === "rollup" ? "held" : "even") : e < 0.12 ? (yours ? "yours, narrowly" : "his, narrowly") : e >= 0.3 ? (yours ? "yours, clearly" : "his, clearly") : yours ? "yours" : "his";
    return { k, yourShare: c.scoreA / total, word, pct: e === 0 ? "0%" : `${yours ? "+" : "−"}${Math.round(e * 100)}%`, winner: e === 0 ? null : c.winner };
  });
}

export type FrontStateWord = "BROKE" | "HE BROKE" | "FLANKED" | "SHAKEN" | "HE'S SHAKEN" | "HOLDING" | "NOBODY";
export interface FrontPairState { you: { front: Front; unitIds: string[]; broken: boolean; shaken: boolean; flanked: boolean }; him: { front: Front; unitIds: string[]; broken: boolean; shaken: boolean; flanked: boolean }; word: FrontStateWord }

/** Front strip state after `upTo` beats (v3 §4.7): BROKE · HE BROKE · FLANKED · SHAKEN · HE'S SHAKEN · HOLDING. */
export function frontStrip(result: BattleResult, beats: Beat[], upTo: number): FrontPairState[] {
  const broke = { you: new Set<Front>(), him: new Set<Front>() };
  const flanked = { you: new Set<Front>(), him: new Set<Front>() };
  const shaken = { you: new Set<Front>(), him: new Set<Front>() };
  let contactSeen = false;
  for (let i = 0; i <= Math.min(upTo, beats.length - 1); i++) {
    const b = beats[i];
    b.broke.you.forEach((f) => broke.you.add(f));
    b.broke.him.forEach((f) => broke.him.add(f));
    for (const c of b.contests) if (c.stage === "rollup") { if (c.note?.startsWith("A")) flanked.him.add(c.frontB); else flanked.you.add(c.frontA); }
    if (b.kind === "contact") contactSeen = true;
    for (const t of b.traits) if (t.trait === "rally") (t.side === "A" ? shaken.you : shaken.him).add(t.front!);
  }
  if (contactSeen) {
    for (const f of result.fronts!.A) if (f.shaken) shaken.you.add(f.front);
    for (const f of result.fronts!.B) if (f.shaken) shaken.him.add(f.front);
  }
  return (["L", "C", "R"] as Front[]).map((f) => {
    const o = OPP[f];
    const ya = result.fronts!.A.find((x) => x.front === f)!, hb = result.fronts!.B.find((x) => x.front === o)!;
    const you = { front: f, unitIds: ya.unitIds, broken: broke.you.has(f), shaken: shaken.you.has(f), flanked: flanked.you.has(f) };
    const him = { front: o, unitIds: hb.unitIds, broken: broke.him.has(o), shaken: shaken.him.has(o), flanked: flanked.him.has(o) };
    const word: FrontStateWord = you.broken ? "BROKE" : him.broken ? "HE BROKE" : you.flanked ? "FLANKED" : you.shaken ? "SHAKEN" : him.shaken ? "HE'S SHAKEN" : !you.unitIds.length && !him.unitIds.length ? "NOBODY" : "HOLDING";
    return { you, him, word };
  });
}

export function strengthOf(morale: number, routLevel: number) {
  return strength(morale, routLevel);
}

export function endedLabel(brokeInPhase: string): string {
  if (brokeInPhase === "break") return "THE RECKONING";
  if (brokeInPhase === "skirmish") return "ROUT, SKIRMISH";
  if (brokeInPhase === "contact") return "ROUT, CLASH";
  const m = brokeInPhase.match(/press (\d)/);
  return m ? `ROUT, PRESS ${m[1]}` : brokeInPhase.toUpperCase();
}
export const stageGutter = (b: Beat) => (b.kind === "result" ? "END" : b.kind === "skirmish" ? "SKIRM" : b.kind === "contact" ? "CLASH" : b.label);

/** The chronicle: one clause per beat with the traits named in brackets (v3 §3.7). */
export function chronicle(beats: Beat[]): { label: string; text: string; key: boolean }[] {
  return beats.filter((b) => b.kind !== "result").map((b) => {
    const traits = [...new Set(b.keys.filter((k) => k.kind === "trait").map((k) => k.label.split(" · ")[0]))].map((w) => w.charAt(0) + w.slice(1).toLowerCase());
    const text = b.short.replace(/\.$/, "") + (traits.length ? ` (${traits.join(", ")})` : "") + ".";
    return { label: stageGutter(b), text, key: b.keys.some((k) => k.kind !== "trait") || b.routed };
  });
}

export const pairLabel = (c: ContestRecord): string => {
  if (c.stage === "rollup") return c.note?.startsWith("A") ? `YOUR ${FRONT_WORD[c.frontA]} → HIS ${FRONT_WORD[c.frontB]}` : `HIS ${FRONT_WORD[c.frontB]} → YOUR ${FRONT_WORD[c.frontA]}`;
  return c.frontA === "C" ? "THE CENTERS" : `YOUR ${FRONT_WORD[c.frontA]} — HIS ${FRONT_WORD[c.frontB]}`;
};
