// Copy the Deploy screen derives from the rules and the enemy roster (v3 §3.5, §4.4, §4.10–4.12).
import { SHOOTER_MIN, type Army, type Engine, type Front, type PlanName, type Unit } from "@warlord/engine";
import { WING_CLASSES, PLAN_TITLE, cultureShort } from "./text";

const WORDS = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight"];
const FRONT_WORD: Record<Front, string> = { L: "left", C: "center", R: "right" };

/** "He brings four that stand, two that ride and two that skirmish. Half his army rides." */
export function enemyRead(engine: Engine, foe: Army): string {
  const units = foe.slots.map((s) => engine.data.unitById.get(s.unitId)!);
  const stand = units.filter((u) => !WING_CLASSES.has(u.class)).length;
  const ride = units.filter((u) => u.class === "cavalry").length;
  const skirm = units.filter((u) => u.class === "skirmish" || u.class === "special" || u.class === "ranged").length;
  const parts = [`${WORDS[stand]} that stand${stand === 1 ? "s" : ""}`];
  if (ride) parts.push(`${WORDS[ride]} that ride${ride === 1 ? "s" : ""}`);
  if (skirm) parts.push(`${WORDS[skirm]} that ${units.some((u) => u.class === "special") ? "skirmish or trample" : "skirmish"}${skirm === 1 ? (units.some((u) => u.class === "special") ? "s" : "es") : ""}`);
  const brings = parts.length > 1 ? `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}` : parts[0];
  let read: string;
  if (stand >= 6) read = "A heavy line: whatever he does with it, most of his army stands.";
  else if (ride + skirm >= 4) read = "Half his army rides. Expect strong wings and a thin center, or a trap.";
  else if (units.every((u) => u.stats.ranged === 0)) read = "Nothing of his shoots. The skirmish is yours if you brought bows.";
  else read = "A balanced line. Whoever wins a wing first will decide it.";
  return `He brings ${brings}. ${read}`;
}

/** Matchup edge of `a` against `b` (v3 §4.10): both directions of rules.matchups, missing entries 1. */
export function matchupEdge(engine: Engine, a: Unit, b: Unit): number {
  const m = engine.data.rules.matchups;
  const f = (x: Unit, y: Unit) => m[x.subtype]?.[y.subtype] ?? m[x.subtype]?.[y.class] ?? 1;
  return f(a, b) / f(b, a);
}
export function matchups(engine: Engine, unit: Unit, foe: Army): { favored: number[]; beaten: number[] } {
  const favored: number[] = [], beaten: number[] = [];
  foe.slots.forEach((s, k) => {
    const e = matchupEdge(engine, unit, engine.data.unitById.get(s.unitId)!);
    if (e >= 1.1) favored.push(k);
    else if (e <= 0.9) beaten.push(k);
  });
  return { favored, beaten };
}
export function matchupSentence(engine: Engine, unit: Unit, foe: Army): string {
  const { favored, beaten } = matchups(engine, unit, foe);
  const names = (ix: number[]) => ix.map((k) => engine.data.unitById.get(foe.slots[k].unitId)!.name.replace(/\s*\(.*\)/, "")).join(", ");
  const bits: string[] = [];
  if (favored.length) bits.push(`Favored against his ${names(favored)}.`);
  if (beaten.length) bits.push(`Beaten by his ${names(beaten)}.`);
  return bits.join(" ") || "Nothing of his counters it, and it counters nothing of his.";
}

/** The roster-level matchup line (v3 §4.11). */
export function rosterMatchupLine(engine: Engine, mine: Army, foe: Army): string {
  const his = foe.slots.map((s) => engine.data.unitById.get(s.unitId)!);
  const yours = mine.slots.map((s) => engine.data.unitById.get(s.unitId)!);
  const groups = new Map<string, Unit[]>();
  for (const u of his) groups.set(u.subtype, [...(groups.get(u.subtype) ?? []), u]);
  const ranked = [...groups.entries()].sort((a, b) => b[1].length - a[1].length);
  for (const [, units] of ranked) {
    const counters = yours.filter((y) => units.every((h) => matchupEdge(engine, y, h) >= 1.1));
    if (!counters.length) continue;
    const kind = units[0].subtype.replace(/_/g, " ");
    const names = counters.slice(0, 2).map((u) => u.name.replace(/\s*\(.*\)/, ""));
    return `He has ${WORDS[units.length]} ${kind}${units.length > 1 ? "" : " unit"}. Your ${names.length > 1 ? names.join(" and ") : names[0]} ${names.length > 1 ? "are" : "is"} favored against ${units.length > 1 ? "them" : "it"} wherever they meet.`;
  }
  return "Nothing in your army is favored against his. Win it on the line.";
}

/** The plan fit line for the current line (v3 §4.12). */
export function planFit(engine: Engine, plan: PlanName, mine: Army, placed: (Front | null)[], brittle: Front[]): string {
  if (!placed.some(Boolean)) return "Set your line to see the fit.";
  const count = (f: Front) => placed.filter((x) => x === f).length;
  const units = mine.slots.map((s) => engine.data.unitById.get(s.unitId)!);
  const L = count("L"), C = count("C"), R = count("R");
  const heaviest = C >= L && C >= R ? "center" : L >= R ? "left" : "right";
  switch (plan) {
    case "aggressive": return C >= 4 ? "Your clash is strong: a loaded center." : "Your clash is ordinary; breaking sooner costs you more than it gives.";
    case "defensive": return brittle.length ? `Your ${FRONT_WORD[brittle[0]]} is brittle; standing longer helps it least.` : "Your fronts are steady; standing longer suits them.";
    case "envelopment": return Math.max(L, R) >= C ? "Your wings are heavy: this is their plan." : `Wants heavy wings; your ${heaviest} is heaviest.`;
    case "skirmish": {
      const shooters = units.filter((u, k) => placed[k] && (u.class === "ranged" || u.subtype === "horse_archer"));
      const onWings = shooters.filter((u) => placed[units.indexOf(u)] !== "C").length;
      return shooters.length >= 3 ? `You have ${WORDS[shooters.length]} shooters, ${WORDS[onWings]} on the wings.` : "Few shooters: the softer clash costs more than it gives.";
    }
  }
}
export const planTitle = (p: PlanName) => PLAN_TITLE[p];

/** Line-dependent trait chip state in your general's row (v3 §4.4). */
export function lineTraitState(engine: Engine, id: string, mine: Army, placed: (Front | null)[]): { on: boolean; note: string } | null {
  const count = (f: Front) => placed.filter((x) => x === f).length;
  if (id === "oblique_order") {
    const sizes = [count("L"), count("C"), count("R")];
    const top = Math.max(...sizes);
    const on = top > 0 && sizes.filter((n) => n === top).length === 1;
    return { on, note: on ? "On: one front is heavier than the other two, and it hits harder at the clash." : "Not on yet: needs one front heavier than the other two." };
  }
  if (id === "volley") {
    const n = mine.slots.filter((s, k) => placed[k] === "C" && engine.data.unitById.get(s.unitId)!.stats.ranged >= SHOOTER_MIN).length;
    return { on: n > 0, note: n > 0 ? `On: ${WORDS[n]} shooter${n > 1 ? "s" : ""} in the center.` : "Wants shooters in the center: none there now." };
  }
  return null;
}

/** The inspector's fit sentence (v2 §4.6, unchanged), from the engine's press weights. */
export function inspectorFit(unit: Unit): { wingScore: number; centerScore: number; text: string } {
  const s = unit.stats;
  const wingScore = Math.round(s.mobility * 0.4 + s.melee * 0.4 + s.shock * 0.2);
  const centerScore = Math.round(s.melee * 0.5 + s.armor * 0.3 + s.discipline * 0.2);
  let text: string;
  if (unit.class === "ranged" || (unit.class === "cavalry" && unit.subtype === "horse_archer")) text = `Shoots ${s.ranged} in the skirmish, then presses at only ${wingScore} on a wing, ${centerScore} in the center. Keep it where the fight is short.`;
  else if (WING_CLASSES.has(unit.class)) text = `On a wing it presses at ${wingScore} and charges ${s.shock}. In the center it would grind at ${centerScore} and lose its Speed.`;
  else text = `In the center it grinds at ${centerScore} and holds with Steady ${Math.round(s.discipline)}. On a wing it would press at only ${wingScore}.`;
  return { wingScore, centerScore, text };
}

export const tierWord = (tier: number) => ["THE LIGHTEST OF THE THREE", "THE MIDDLE ONE", "THE HARD ONE"][tier] ?? "";
export const tierShort = (tier: number) => ["a light army", "a full army", "at full strength, the hard one"][tier] ?? "";
export const cultureOf = (engine: Engine, key: string) => cultureShort(engine, key);
