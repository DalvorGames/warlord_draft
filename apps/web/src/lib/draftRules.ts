// Rules the UI computes itself (docs/ui-handoff/UI-HANDOFF.md §4.1–4.2), from the engine's DraftState and summary.
import type { DraftState, Engine, Grade } from "@warlord/engine";
import { describeTrait, isElite, traitName, cultureShort } from "./text";

export type Consequence = { text: string; tone: "brass" | "bone" | "faint" | "bad"; disabled: boolean };

/** The consequence line under card `card` of row `row`, given the current picks. */
export function consequenceLine(engine: Engine, state: DraftState, row: number, card: number): Consequence {
  const s = engine.summarize(state);
  const r = state.rows[row];
  const unit = engine.data.unitById.get(r.cards[card].unitId)!;
  const rowPickUnit = r.pick === null ? null : engine.data.unitById.get(r.cards[r.pick].unitId)!;
  const [t1, t2] = engine.data.rules.traitThresholds;
  const culture = cultureShort(engine, r.culture).toUpperCase();
  const trait = traitName(engine, r.culture).toUpperCase();
  const base = (s.cultureCounts[r.culture] ?? 0) - (rowPickUnit && rowPickUnit.culture === r.culture ? 1 : 0);
  const baseElite = s.eliteUsed - (rowPickUnit && isElite(rowPickUnit.grade) ? 1 : 0);
  const after = base + 1;
  const elite = isElite(unit.grade as Grade);
  const already = r.pick === card;
  if (elite && baseElite >= s.eliteCap && !already) return { text: "ELITE CAP FULL — DROP ONE TO TAKE THIS", tone: "bad", disabled: true };
  if (unit.culture !== r.culture) {
    // Off-culture fill (a row short of eligible units): count toward its own culture instead.
    const own = cultureShort(engine, unit.culture).toUpperCase();
    const n = (s.cultureCounts[unit.culture] ?? 0) - (rowPickUnit && rowPickUnit.culture === unit.culture ? 1 : 0) + 1;
    return { text: elite ? `ELITE ${baseElite + 1} OF ${s.eliteCap} · ${own} ${n}` : `${own} ${n} OF ${t1}`, tone: elite ? "bone" : "faint", disabled: false };
  }
  if (after === t1) return { text: already ? `${culture} ${t1} · ${trait} IS ON` : `${culture} ${t1} → ${trait} ON`, tone: "brass", disabled: false };
  if (after === t2) return { text: already ? `${culture} ${t2} · ${trait} II IS ON` : `${culture} ${t2} → ${trait} II`, tone: "brass", disabled: false };
  if (elite) return { text: `ELITE ${baseElite + 1} OF ${s.eliteCap} · ${culture} ${after}`, tone: "bone", disabled: false };
  return { text: `${culture} ${after} OF ${after < t1 ? t1 : t2}`, tone: "faint", disabled: false };
}

export interface TallyNote { culture: string; name: string; count: number; level: 0 | 1 | 2; note: string; withGeneral: boolean }

/** Top three cultures by count with the §4.2 note. */
export function cultureTallies(engine: Engine, state: DraftState): TallyNote[] {
  const s = engine.summarize(state);
  const [t1, t2] = engine.data.rules.traitThresholds;
  const general = state.generalIndex === null ? null : engine.data.generalById.get(state.generalPool[state.generalIndex])!;
  return Object.entries(s.cultureCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([culture, n]) => {
      const c = engine.data.cultures[culture];
      const trait = c?.trait ?? culture;
      let note: string;
      if (n >= t2) note = `${trait} II is on: ${describeTrait(c.level2)}.`;
      else if (n >= t1) note = `${trait} is on: ${describeTrait(c.level1)}. ${t2 - n} more upgrades it.`;
      else note = `${t1 - n} more for ${trait}.`;
      return { culture, name: cultureShort(engine, culture), count: n, level: s.traitLevels[culture] ?? 0, note, withGeneral: general?.culture === culture };
    });
}

/** The closest trait threshold, for the board sheet's footer. */
export function nearestThreshold(engine: Engine, state: DraftState, currentRow: number): string {
  const s = engine.summarize(state);
  const [t1, t2] = engine.data.rules.traitThresholds;
  const r = state.rows[currentRow];
  const n = s.cultureCounts[r.culture] ?? 0;
  const name = cultureShort(engine, r.culture);
  const trait = traitName(engine, r.culture);
  if (r.pick === null && n === t1 - 1) return `${name} ${n} of ${t1} — any card in this row turns ${trait} on`;
  if (r.pick === null && n === t2 - 1) return `${name} ${n} of ${t2} — any card in this row makes it ${trait} II`;
  if (n >= t2) return `${trait} II is on.`;
  if (n >= t1) return `${trait} is on. ${t2 - n} more upgrades it.`;
  return `${name} ${n} of ${t1}. ${t1 - n} more for ${trait}.`;
}

/** What the general card's hint says: the stat that matters and why. */
export function generalHint(engine: Engine, generalId: string): string {
  const g = engine.data.generalById.get(generalId)!;
  const cap = engine.data.rules.eliteCap;
  const c = engine.data.cultures[g.culture];
  const parts: string[] = [];
  if (g.stats.logistics >= cap.logisticsThreshold) parts.push(`Logistics ${g.stats.logistics} buys a third elite slot.`);
  if (g.stats.charisma >= 75) parts.push(`Charisma ${g.stats.charisma} raises every front's cohesion.`);
  if (g.stats.command >= 75) parts.push(`Command ${g.stats.command} lifts every fight a little.`);
  if (g.stats.tactics >= 75) parts.push(`Tactics ${g.stats.tactics} sharpen the wings.`);
  if (!parts.length) parts.push("Nothing spikes.");
  if (g.stats.logistics < cap.logisticsThreshold && parts.length < 2) parts.push(`Logistics ${g.stats.logistics} keeps you at ${cap.base === 2 ? "two" : cap.base} elites.`);
  parts.push(`${c.trait}: ${describeTrait(c.level1)}.`);
  return parts.slice(0, 2).join(" ");
}
