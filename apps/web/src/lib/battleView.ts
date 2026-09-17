// Derived views for the match report (v2 §3.5): opposed bars per front, cumulative damage, callouts.
import type { BattleResult, Beat, ContestRecord, Front } from "@warlord/engine";

const FRONT_WORD: Record<Front, string> = { L: "LEFT", C: "CENTER", R: "RIGHT" };

export interface OpposedBar {
  k: string;
  aPct: number;
  bPct: number;
  tag: string;
  winner: "A" | "B" | null;
}

/** One opposed bar per contest of a beat, keyed L / C / R (roll-ups as L→C etc.). */
export function opposedBars(beat: Beat): OpposedBar[] {
  return beat.contests.map((c) => {
    const max = Math.max(c.scoreA, c.scoreB, 1);
    const k = c.stage === "rollup" ? (c.note?.startsWith("A") ? `${c.frontA}→${c.frontB}` : `${c.frontB}→${c.frontA}`) : c.frontA;
    return {
      k,
      aPct: Math.round((c.scoreA / max) * 100),
      bPct: Math.round((c.scoreB / max) * 100),
      tag: c.edge === 0 ? "HELD" : `${c.winner === "A" ? "+" : "−"}${Math.round(c.edge * 100)}%`,
      winner: c.edge === 0 ? null : c.winner,
    };
  });
}

/** Front damage against threshold after `upTo` beats (inclusive), for both sides. */
export function frontsAfter(result: BattleResult, beats: Beat[], upTo: number) {
  const dmg = { A: { L: 0, C: 0, R: 0 } as Record<Front, number>, B: { L: 0, C: 0, R: 0 } as Record<Front, number> };
  const broke = { you: new Set<Front>(), him: new Set<Front>() };
  for (let i = 0; i <= Math.min(upTo, beats.length - 1); i++) {
    for (const c of beats[i].contests) {
      dmg.A[c.frontA] += c.damageA;
      dmg.B[c.frontB] += c.damageB;
    }
    beats[i].broke.you.forEach((f) => broke.you.add(f));
    beats[i].broke.him.forEach((f) => broke.him.add(f));
  }
  const thr = (side: "A" | "B", f: Front) => result.fronts![side].find((x) => x.front === f)!;
  return (["L", "C", "R"] as Front[]).map((f) => {
    const opp: Front = f === "L" ? "R" : f === "R" ? "L" : "C";
    const ya = thr("A", f), hb = thr("B", opp);
    return {
      you: { front: f, pct: ya.threshold > 0 ? Math.min(1, dmg.A[f] / ya.threshold) : 0, broken: broke.you.has(f), empty: ya.unitIds.length === 0 },
      him: { front: opp, pct: hb.threshold > 0 ? Math.min(1, dmg.B[opp] / hb.threshold) : 0, broken: broke.him.has(opp), empty: hb.unitIds.length === 0 },
    };
  });
}

export function pairLabel(c: ContestRecord): string {
  if (c.stage === "rollup") {
    const mine = c.note?.startsWith("A");
    return mine ? `YOUR ${FRONT_WORD[c.frontA]} → HIS ${FRONT_WORD[c.frontB]}` : `HIS ${FRONT_WORD[c.frontB]} → YOUR ${FRONT_WORD[c.frontA]}`;
  }
  if (c.frontA === "C") return "THE CENTERS";
  return `YOUR ${FRONT_WORD[c.frontA]} — HIS ${FRONT_WORD[c.frontB]}`;
}

export function endedLabel(brokeInPhase: string): string {
  if (brokeInPhase === "break") return "RECKONING";
  if (brokeInPhase === "skirmish") return "SKIRM";
  if (brokeInPhase === "contact") return "CLASH";
  const m = brokeInPhase.match(/press (\d)/);
  return m ? `P${m[1]}` : brokeInPhase.toUpperCase();
}

/** The rust tag on a key beat: what broke or routed. */
export function keyTag(beat: Beat, hisName: string): string | null {
  const bits: string[] = [];
  if (beat.contests.some((c) => c.stage === "rollup")) bits.push("ROLL-UP");
  if (beat.broke.him.length === 2 && !beat.broke.him.includes("C")) bits.push("BOTH HIS WINGS BREAK");
  else for (const f of beat.broke.him) bits.push(`HIS ${FRONT_WORD[f]} BREAKS`);
  if (beat.broke.you.length === 2 && !beat.broke.you.includes("C")) bits.push("BOTH YOUR WINGS BREAK");
  else for (const f of beat.broke.you) bits.push(`YOUR ${FRONT_WORD[f]} BREAKS`);
  if (beat.events.includes("B routs")) bits.push(`${hisName.toUpperCase()} ROUTS`);
  if (beat.events.includes("A routs")) bits.push("YOUR ARMY ROUTS");
  if (beat.contests.some((c) => c.note?.includes("rampage"))) bits.push("ELEPHANTS RAMPAGE");
  return bits.length ? bits.join(" · ") : null;
}

/** Whether a beat is one of the key beats (v2 "Key beats" mode): a break, a rout, a roll-up, or the first two. */
export function isKeyBeat(beat: Beat, index: number): boolean {
  return index < 2 || beat.kind === "result" || beat.broke.him.length > 0 || beat.broke.you.length > 0 || beat.routed || beat.contests.some((c) => c.stage === "rollup");
}
