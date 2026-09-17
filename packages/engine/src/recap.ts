// Narrated recap (HANDOFF §5 "Recap"): 6–8 lines a UI can show verbatim.

import type { BattleResult, PhaseRecord } from "./resolve.js";
import type { GameData, Side } from "./types.js";

const sizeWord = (edge: number) => (edge < 0.1 ? "narrowly" : edge < 0.3 ? "clearly" : "decisively");

function phaseLine(r: BattleResult, rec: PhaseRecord): string {
  const won = r.armies[rec.winner], lost = r.armies[rec.winner === "A" ? "B" : "A"];
  const topWon = (rec.winner === "A" ? rec.topA : rec.topB)[0]?.name;
  const w = won.general.name, l = lost.general.name, size = sizeWord(rec.edge);
  switch (rec.phase) {
    case "skirmish":
      return `${w}'s ${topWon ?? "skirmishers"} ${size} win the missile exchange.`;
    case "charge":
      return `${w}'s ${topWon ?? "assault"} ${size} win the charge; ${l}'s line ${rec.edge > 0.25 ? "wavers" : "holds"}.`;
    case "grind":
      return `In the press of the lines, ${w}'s ${topWon ?? "infantry"} ${size} get the better of the grind.`;
    case "flank":
      return `${w}'s ${topWon ?? "reserves"} ${size} turn the flank.`;
  }
}

function eventLine(r: BattleResult): string | null {
  if (!r.event || !r.event.applied) return null;
  const rec = r.phaseLog.find((p) => p.eventApplied === r.event!.id);
  const loser: Side | null = rec ? (rec.winner === "A" ? "B" : "A") : null;
  const lName = loser ? r.armies[loser].general.name : "";
  const wName = loser ? r.armies[loser === "A" ? "B" : "A"].general.name : "";
  switch (r.event.id) {
    case "general_falls": return `${lName} falls in the charge and the army's heart goes out of it.`;
    case "rampage": return `${lName}'s elephants panic and trample their own line.`;
    case "downpour": return `A downpour soaks bowstrings and slings; the missile exchange comes to little.`;
    case "pursuit_lost": return `${wName}'s cavalry chase the beaten charge off the field and miss the flank.`;
    case "flank_collapse": return `${lName}'s flank collapses early and the wings fold in, as at Cannae.`;
    case "reinforcements": return `Reinforcements arrive for the better-supplied army.`;
    default: return r.event.name;
  }
}

export function narrate(data: GameData, r: BattleResult, margin: number): string[] {
  const A = r.armies.A, B = r.armies.B;
  const lines: string[] = [];
  lines.push(`${A.general.name} (${A.plan}) vs ${B.general.name} (${B.plan}) on ${r.terrain}.`);
  for (const side of [A, B]) {
    const notes = side.traits.map((t) => `${t.name} ${["", "I", "II", "III"][t.level]}`);
    if (side.combinedArms) notes.push("Combined Arms");
    if (side.startsShaken) notes.push("shaken by a wrecked placement");
    if (notes.length) lines.push(`${side.general.name} brings: ${notes.join(", ")}.`);
  }
  for (const rec of r.phaseLog) lines.push(phaseLine(r, rec));
  const ev = eventLine(r);
  if (ev) lines.push(ev);
  const W = r.armies[r.winner], L = r.armies[r.winner === "A" ? "B" : "A"];
  lines.push(
    r.brokeInPhase === "break"
      ? `Both lines hold to the end, but ${L.general.name}'s army breaks first. ${W.general.name} wins a ${margin > 0.3 ? "decisive" : "narrow"} victory.`
      : `${L.general.name}'s army routs during the ${r.brokeInPhase}. ${W.general.name} wins a crushing victory.`,
  );
  const cw = r.casualties[r.winner], cl = r.casualties[r.winner === "A" ? "B" : "A"];
  lines.push(`Casualties — ${W.general.name}: ${(cw * 100).toFixed(0)}%, ${L.general.name}: ${(cl * 100).toFixed(0)}%.`);
  return lines;
}
