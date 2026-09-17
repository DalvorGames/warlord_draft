// Derived views for the battle stepper: cumulative front damage, broken state, tags (handoff §3.5, §4.5).
import type { BattleResult, Beat, ContestRecord, Front } from "@warlord/engine";

export const PAIRS: { label: string; a: Front; b: Front }[] = [
  { label: "L — HIS R", a: "L", b: "R" },
  { label: "CENTERS", a: "C", b: "C" },
  { label: "R — HIS L", a: "R", b: "L" },
];
const FRONT_WORD: Record<Front, string> = { L: "LEFT", C: "CENTER", R: "RIGHT" };

export interface FrontState {
  label: string;
  you: { pct: number; broken: boolean; empty: boolean };
  him: { pct: number; broken: boolean; empty: boolean };
  state: string;
}

/** Front bars after `step` beats have played. */
export function frontsAfter(result: BattleResult, beats: Beat[], step: number): FrontState[] {
  const dmg = { A: { L: 0, C: 0, R: 0 } as Record<Front, number>, B: { L: 0, C: 0, R: 0 } as Record<Front, number> };
  const broke = { you: new Set<Front>(), him: new Set<Front>() };
  for (let i = 0; i <= Math.min(step, beats.length - 1); i++) {
    for (const c of beats[i].contests) {
      dmg.A[c.frontA] += c.damageA;
      dmg.B[c.frontB] += c.damageB;
    }
    beats[i].broke.you.forEach((f) => broke.you.add(f));
    beats[i].broke.him.forEach((f) => broke.him.add(f));
  }
  const thr = (side: "A" | "B", f: Front) => result.fronts![side].find((x) => x.front === f)!;
  return PAIRS.map((p) => {
    const ya = thr("A", p.a), hb = thr("B", p.b);
    const you = { pct: ya.threshold > 0 ? Math.min(1, dmg.A[p.a] / ya.threshold) : 0, broken: broke.you.has(p.a), empty: ya.unitIds.length === 0 };
    const him = { pct: hb.threshold > 0 ? Math.min(1, dmg.B[p.b] / hb.threshold) : 0, broken: broke.him.has(p.b), empty: hb.unitIds.length === 0 };
    const state = him.broken && you.broken ? "BOTH BROKE" : him.broken ? "HIS BROKE" : you.broken ? "YOURS BROKE" : you.empty || him.empty ? "EMPTY" : "HOLDING";
    return { label: p.label, you, him, state };
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

export function edgeTag(c: ContestRecord): { text: string; color: string; mark: string } {
  if (c.edge === 0) return { text: "HELD", color: "var(--faint)", mark: "var(--rule-2)" };
  const pct = Math.round(c.edge * 100);
  return c.winner === "A" ? { text: `YOURS BY ${pct}%`, color: "var(--brass)", mark: "#7a6420" } : { text: `HIS BY ${pct}%`, color: "var(--enemy)", mark: "#3e4e5c" };
}

export function damageLine(c: ContestRecord): { text: string; color: string } {
  if (c.damageA === 0 && c.damageB === 0) return { text: "NOTHING LOST", color: "var(--faint-2)" };
  return c.damageA >= c.damageB ? { text: `YOU TAKE +${c.damageA.toFixed(2)}`, color: "var(--bad)" } : { text: `HE TAKES +${c.damageB.toFixed(2)}`, color: "var(--good)" };
}

export function whoLine(c: ContestRecord): string {
  const a = c.topA[0]?.name, b = c.topB[0]?.name;
  if (c.stage === "skirmish") {
    if (a && !b) return `Your ${a}, and nothing shooting back.`;
    if (b && !a) return `His ${b}, into a front that brought no bows.`;
  }
  if (a && b) return `Your ${a} against his ${b}.`;
  if (a) return `Your ${a}.`;
  if (b) return `His ${b}.`;
  return "";
}

export function endedLabel(brokeInPhase: string): string {
  if (brokeInPhase === "break") return "RECKONING";
  if (brokeInPhase === "skirmish") return "SKIRM";
  if (brokeInPhase === "contact") return "CONTACT";
  const m = brokeInPhase.match(/press (\d)/);
  return m ? `P${m[1]}` : brokeInPhase.toUpperCase();
}

/** Rust callouts for a beat: breaks, empty fronts giving way, routs. */
export function calloutsFor(beat: Beat, hisName: string): { tag: string; text: string }[] {
  const out: { tag: string; text: string }[] = [];
  const word = (fs: Front[]) => fs.map((f) => FRONT_WORD[f].toLowerCase());
  if (beat.broke.him.length === 2 && !beat.broke.him.includes("C")) out.push({ tag: "BOTH HIS WINGS BREAK", text: "Both of your wings are free to wheel inward." });
  else for (const f of beat.broke.him) out.push({ tag: `HIS ${FRONT_WORD[f]} BREAKS`, text: f === "C" ? "His center gives way. His general stands alone." : `Your ${word([f === "L" ? "R" : "L"])[0]} is free.` });
  if (beat.broke.you.length === 2 && !beat.broke.you.includes("C")) out.push({ tag: "BOTH YOUR WINGS BREAK", text: "His wings are free to wheel into your center." });
  else for (const f of beat.broke.you) out.push({ tag: `YOUR ${FRONT_WORD[f]} BREAKS`, text: f === "C" ? "Your center gives way." : `His ${word([f === "L" ? "R" : "L"])[0]} is free.` });
  if (beat.events.includes("B routs")) out.push({ tag: `${hisName.toUpperCase()} ROUTS`, text: "Past the rout line. What is left of his army leaves the field." });
  if (beat.events.includes("A routs")) out.push({ tag: "YOUR ARMY ROUTS", text: "Past the rout line. The field is his." });
  for (const c of beat.contests) if (c.note?.includes("rampage")) out.push({ tag: "ELEPHANTS RAMPAGE", text: `${c.winner === "A" ? "His" : "Your"} elephants panic and trample their own line.` });
  return out;
}
