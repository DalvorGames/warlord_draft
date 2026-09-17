// Copy helpers: stat words, culture colours, grades, class tints, trait descriptions (handoff v2 §2, §4.3).
import type { Engine, Grade, PhaseName, PlanName, StatKey, Style, TraitEntry, Unit, UnitClass } from "@warlord/engine";

/** Stats are words, not codes (v2 §1). Order is the battle's: the draft card shows them in this order. */
export const STAT_KEYS: readonly StatKey[] = ["melee", "ranged", "armor", "mobility", "discipline", "shock"];
export const STAT_WORD: Record<StatKey, string> = { melee: "FIGHT", ranged: "SHOOT", armor: "ARMOR", mobility: "SPEED", discipline: "STEADY", shock: "CHARGE" };
export const STAT_CODE: Record<StatKey, string> = { melee: "MEL", ranged: "RNG", armor: "ARM", mobility: "MOB", discipline: "DIS", shock: "SHK" };
export const GENERAL_STATS = [
  ["COMMAND", "command"],
  ["TACTICS", "tactics"],
  ["SUPPLY", "logistics"],
  ["CHARISMA", "charisma"],
] as const;

export function statColor(v: number): string {
  return v >= 75 ? "var(--white)" : v === 0 ? "var(--zero)" : "var(--dim)";
}

/** Culture colours: a deep fill and a bright ink (v2 §2.2). */
export const CULTURE_COLORS: Record<string, { deep: string; bright: string }> = {
  rom: { deep: "#6e1c1c", bright: "#e4574f" },
  car: { deep: "#4a2a6b", bright: "#b58ae0" },
  mac: { deep: "#1e3a6e", bright: "#6e9bf0" },
  grk: { deep: "#16465a", bright: "#4fc0e6" },
  per: { deep: "#124a44", bright: "#38c7ac" },
  chn: { deep: "#1e4a32", bright: "#52c98a" },
  ind: { deep: "#6b3e12", bright: "#f2a23c" },
  stp: { deep: "#4a4a1c", bright: "#c9c45a" },
  gal: { deep: "#5c2245", bright: "#da7ab0" },
};
export const cultureColor = (key: string) => CULTURE_COLORS[key] ?? { deep: "#2c2822", bright: "#b3ac9c" };

/** Wing tint for cavalry, skirmish, special and ranged; centre tint for line and shock (v2 §4.3). */
export const WING_CLASSES: ReadonlySet<UnitClass> = new Set(["cavalry", "skirmish", "special", "ranged"]);
export function classTint(c: UnitClass) {
  const wing = WING_CLASSES.has(c);
  return { wing, color: wing ? "var(--wing)" : "var(--center)", edge: wing ? "#3f5062" : "#4a4538", legend: wing ? "WANTS SPEED" : "WANTS STEADY" };
}

/** Achromatic grades (v2 §2.3). */
export function gradeStyle(g: Grade): { bg: string; text: string; edge: string } {
  if (g === "S") return { bg: "var(--bone)", text: "var(--ink)", edge: "var(--white)" };
  if (g === "A") return { bg: "var(--grade-a)", text: "var(--ink)", edge: "var(--grade-a)" };
  if (g === "B") return { bg: "var(--grade-b)", text: "var(--ink)", edge: "var(--grade-b)" };
  if (g === "C") return { bg: "transparent", text: "var(--dim)", edge: "var(--rule-btn)" };
  if (g === "D") return { bg: "transparent", text: "var(--faint)", edge: "var(--rule)" };
  return { bg: "transparent", text: "var(--faint-2)", edge: "var(--rule)" };
}
/** Grade letter colour on dark chrome (board sheet, result). */
export const gradeInk = (g: Grade) => (g === "S" ? "var(--bone)" : g === "A" ? "var(--grade-a)" : g === "B" ? "var(--grade-b)" : "var(--faint-2)");
export const isElite = (g: Grade) => g === "S" || g === "A";

export function cultureName(engine: Engine, key: string): string {
  return engine.data.cultures[key]?.name ?? key;
}
/** Short culture name for labels: "India", "Greece", "Gauls". */
const SHORT: Record<string, string> = { rom: "Rome", car: "Carthage", mac: "Macedon", grk: "Greece", per: "Persia", chn: "China", ind: "India", stp: "Steppe", gal: "Gauls" };
export function cultureShort(engine: Engine, key: string): string {
  return SHORT[key] ?? cultureName(engine, key).split(/ \(|&/)[0].trim();
}
export function traitName(engine: Engine, key: string): string {
  return engine.data.cultures[key]?.trait ?? "";
}
export const firstName = (name: string) => name.split(" ")[0];

const PHASE_SENTENCE: Record<PhaseName, string> = { skirmish: "the skirmish", charge: "the clash", grind: "the center press", flank: "the wings" };
const RULE_SENTENCE: Record<string, string> = {
  pikes_ignore_shaken: "pikes ignore being shaken",
  never_shaken_by_charge: "never shaken by a charge",
  half_morale_damage_from_lost_grind: "half morale damage from a lost center press",
  rampage_chance_halved: "elephants rampage half as often",
};
const pct = (m: number) => `${m >= 1 ? "+" : "−"}${Math.round(Math.abs(m - 1) * 100)}%`;
const STAT_LOWER: Record<string, string> = { melee: "Fight", ranged: "Shoot", armor: "Armor", mobility: "Speed", discipline: "Steady", shock: "Charge", all: "every stat" };

export function describeTrait(entries: TraitEntry[]): string {
  const bits = entries.map((e) => {
    if ("phase" in e && "mult" in e && !("generalStat" in e)) return `${pct(e.mult)} in ${PHASE_SENTENCE[e.phase]}`;
    if ("stat" in e) return `${pct(e.mult)} ${STAT_LOWER[e.stat] ?? e.stat} for ${e.scope === "culture" ? "its own units" : "every other culture's units"}`;
    if ("moraleThreshold" in e) return `${pct(e.moraleThreshold)} cohesion on every front`;
    if ("eliteSlots" in e) return `${e.eliteSlots > 0 ? "+" : ""}${e.eliteSlots} elite slot`;
    if ("phaseWeight" in e) return `the skirmish counts for more`;
    if ("generalStat" in e) return `${e.generalStat === "logistics" ? "Supply" : e.generalStat} counts ${pct(e.mult)} in ${PHASE_SENTENCE[e.phase]}`;
    if ("steadiness" in e) return `${pct(e.steadiness)} steadiness`;
    if ("rollup" in e) return `${pct(e.rollup)} roll-ups`;
    if ("rule" in e) return RULE_SENTENCE[e.rule] ?? e.rule;
    return "";
  });
  return bits.filter(Boolean).join(", ");
}

/** One-line gist per culture for the Rules page (v2 artboard copy). */
export const TRAIT_GIST: Record<string, string> = {
  rom: "Fronts stand 10% longer",
  car: "Every foreign unit +5%",
  mac: "Wings press +25%",
  grk: "Greeks steadier, fronts firmer",
  per: "One more elite slot",
  chn: "Skirmish +20%",
  stp: "Skirmish +25%",
  ind: "Charge +8%",
  gal: "Charge +8%, less steady at 6",
};

export const SLOT_LABEL: Record<string, string> = { line: "LINE", shock: "SHOCK", cavalry: "CAVALRY", ranged: "RANGED", flex: "FLEX" };
/** The row's reading hint (v2 §3.3). */
export const SLOT_HINT: Record<string, string> = {
  line: "A line row: read STEADY and ARMOR first. This is what holds the center.",
  shock: "A shock row: read CHARGE first, then FIGHT for the press after.",
  cavalry: "A cavalry row: read SPEED first, then FIGHT. Wings are won here.",
  ranged: "A ranged row: read SHOOT first, then SPEED if it goes on a wing.",
  flex: "A flex row: anything goes. Read what your line is still missing.",
};
export const PLAN_LABEL: Record<PlanName, string> = { aggressive: "AGGRESSIVE", defensive: "DEFENSIVE", envelopment: "ENVELOPMENT", skirmish: "SKIRMISH" };
export const PLAN_TITLE: Record<PlanName, string> = { aggressive: "Aggressive", defensive: "Defensive", envelopment: "Envelopment", skirmish: "Skirmish" };
export const STYLE_LABEL: Record<Style, string> = { hammer: "Hammer", envelopment: "Envelopment", attrition: "Attrition", skirmish: "Skirmish", defensive: "Defensive" };

export function shortUnitName(u: Unit): string {
  return u.name.replace(/\s*\(.*\)\s*/, "").replace(/ Cavalry$/, " Cav").replace(/ Infantry$/, " Inf").replace(/ Archers$/, " Arch").replace(/ Skirmishers$/, " Skirm").replace(/ Swordsmen$/, " Sw.");
}
