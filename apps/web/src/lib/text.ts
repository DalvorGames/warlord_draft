// Copy helpers: names, labels, tints, and the one-line trait descriptions the draft shows.
import type { Engine, Grade, PhaseName, PlanName, StatKey, Style, TraitEntry, Unit, UnitClass } from "@warlord/engine";

export const STAT_KEYS: readonly StatKey[] = ["melee", "ranged", "armor", "mobility", "discipline", "shock"];
export const STAT_LABELS: Record<StatKey, string> = { melee: "MEL", ranged: "RNG", armor: "ARM", mobility: "MOB", discipline: "DIS", shock: "SHK" };

export function statColor(v: number): string {
  return v >= 75 ? "var(--brass)" : v === 0 ? "var(--zero)" : "var(--center)";
}

export const WING_CLASSES: ReadonlySet<UnitClass> = new Set(["cavalry", "skirmish", "special"]);
export function classTint(c: UnitClass) {
  const wing = WING_CLASSES.has(c);
  return { wing, color: wing ? "var(--wing)" : "var(--center)", edge: wing ? "#3f5062" : "#4a4538", legend: wing ? "WINS A WING" : "HOLDS A CENTER" };
}

export function gradeStyle(g: Grade): { bg: string; text: string; edge: string } {
  if (g === "S") return { bg: "var(--brass)", text: "#14130f", edge: "var(--brass)" };
  if (g === "A") return { bg: "var(--grade-a)", text: "#14130f", edge: "var(--grade-a)" };
  if (g === "B") return { bg: "var(--grade-b)", text: "#14130f", edge: "var(--grade-b)" };
  if (g === "C") return { bg: "transparent", text: "var(--grade-c-text)", edge: "var(--grade-c)" };
  return { bg: "transparent", text: "var(--faint)", edge: "var(--grade-d)" };
}
export const isElite = (g: Grade) => g === "S" || g === "A";

export function cultureName(engine: Engine, key: string): string {
  return engine.data.cultures[key]?.name ?? key;
}
export function cultureShort(engine: Engine, key: string): string {
  const n = cultureName(engine, key);
  return n.split(/ \(|&/)[0].trim();
}
export function traitName(engine: Engine, key: string): string {
  return engine.data.cultures[key]?.trait ?? "";
}
export const firstName = (name: string) => name.split(" ")[0];

/** Fronts-model vocabulary for the v1 phase names the data still uses. */
export const PHASE_WORD: Record<PhaseName, string> = { skirmish: "SKIRMISH", charge: "CONTACT", grind: "CENTER", flank: "WING" };
const PHASE_SENTENCE: Record<PhaseName, string> = { skirmish: "the skirmish", charge: "the contact", grind: "the center press", flank: "the wings" };
const RULE_SENTENCE: Record<string, string> = {
  pikes_ignore_shaken: "pikes ignore being shaken",
  never_shaken_by_charge: "never shaken by a charge",
  half_morale_damage_from_lost_grind: "half morale damage from a lost center press",
  rampage_chance_halved: "elephants rampage half as often",
};
const pct = (m: number) => `${m >= 1 ? "+" : "−"}${Math.round(Math.abs(m - 1) * 100)}%`;

/** One clause per entry, joined: "+25% on the wings, +30% roll-ups". */
export function describeTrait(entries: TraitEntry[]): string {
  const bits = entries.map((e) => {
    if ("phase" in e && "mult" in e && !("generalStat" in e)) return `${pct(e.mult)} in ${PHASE_SENTENCE[e.phase]}`;
    if ("stat" in e) return `${pct(e.mult)} ${e.stat === "all" ? "all stats" : e.stat} for ${e.scope === "culture" ? "its own units" : "every other culture's units"}`;
    if ("moraleThreshold" in e) return `${pct(e.moraleThreshold)} cohesion on every front`;
    if ("eliteSlots" in e) return `${e.eliteSlots > 0 ? "+" : ""}${e.eliteSlots} elite slot`;
    if ("phaseWeight" in e) return `the skirmish counts for more`;
    if ("generalStat" in e) return `${e.generalStat} counts ${pct(e.mult)} in ${PHASE_SENTENCE[e.phase]}`;
    if ("steadiness" in e) return `${pct(e.steadiness)} steadiness`;
    if ("rollup" in e) return `${pct(e.rollup)} roll-ups`;
    if ("rule" in e) return RULE_SENTENCE[e.rule] ?? e.rule;
    return "";
  });
  return bits.filter(Boolean).join(", ");
}

/** The phase a culture's trait mostly touches, for the general chip ("ELEPHANT LINE · CONTACT"). */
export function traitPhaseWord(entries: TraitEntry[]): string {
  for (const e of entries) {
    if ("phase" in e && !("generalStat" in e)) return PHASE_WORD[e.phase];
    if ("moraleThreshold" in e) return "COHESION";
    if ("eliteSlots" in e) return "ELITES";
    if ("stat" in e) return "STATS";
  }
  return "";
}

export const SLOT_LABEL: Record<string, string> = { line: "LINE", shock: "SHOCK", cavalry: "CAVALRY", ranged: "RANGED", flex: "FLEX" };
export const PLAN_LABEL: Record<PlanName, string> = { aggressive: "AGGRESSIVE", defensive: "DEFENSIVE", envelopment: "ENVELOPMENT", skirmish: "SKIRMISH" };
export const STYLE_LABEL: Record<Style, string> = { hammer: "Hammer", envelopment: "Envelopment", attrition: "Attrition", skirmish: "Skirmish", defensive: "Defensive" };

export function shortUnitName(u: Unit): string {
  return u.name.replace(/\s*\(.*\)\s*/, "").replace(/ Cavalry$/, " Cav").replace(/ Infantry$/, " Inf").replace(/ Archers$/, " Arch").replace(/ Skirmishers$/, " Skirm");
}
