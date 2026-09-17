// Copy helpers: stat words, culture colours, grades, class glyphs, trait words (handoff v2 §2, v3 §2).
import type { Engine, Grade, PlanName, StatKey, TraitDef, Unit, UnitClass } from "@warlord/engine";

/** Stats are words, not codes. Order is the battle's: FIGHT SHOOT ARMOR SPEED STEADY CHARGE. */
export const STAT_KEYS: readonly StatKey[] = ["melee", "ranged", "armor", "mobility", "discipline", "shock"];
export const STAT_WORD: Record<StatKey, string> = { melee: "FIGHT", ranged: "SHOOT", armor: "ARMOR", mobility: "SPEED", discipline: "STEADY", shock: "CHARGE" };
export const STAT_TITLE: Record<StatKey, string> = { melee: "Fight", ranged: "Shoot", armor: "Armor", mobility: "Speed", discipline: "Steady", shock: "Charge" };
export const GENERAL_STATS = [
  ["CMD", "command", "Command"],
  ["TAC", "tactics", "Tactics"],
  ["SUP", "logistics", "Supply"],
  ["CHA", "charisma", "Charisma"],
] as const;

/** One sentence per stat label (v3 §1.14): what it does, and why it is loud where it is loud. */
export const STAT_NOTE: Record<StatKey, string> = {
  melee: "Plain close combat. Once the charge is spent this is what wins the press, especially in the center.",
  ranged: "Arrows, slings, javelins. Decides the skirmish before anyone closes. His Armor soaks up to half of it.",
  armor: "Shields and mail. Blunts arrows, braces the line in the clash, and keeps the center grinding.",
  mobility: "Wings need it. Fast units get round a flank, shoot better on the move, and run down a broken enemy.",
  discipline: "Drill. How much punishment a front takes before it breaks. Loud here because the center must hold.",
  shock: "The weight of the first contact. Elephants, heavy horse and pike blocks live here.",
};
export const GENERAL_STAT_NOTE: Record<string, string> = {
  command: "Multiplies everything your army does, on every front, at every stage.",
  tactics: "How hard your wings press once the lines are locked.",
  logistics: "Supply. Nudges better cards onto your board a little, and at 75 or more feeds a third elite.",
  charisma: "How long every front stands before it breaks: a fifth of each front's cohesion is him.",
};

/** Culture colours: a deep fill and a bright ink (v2 §2.2). Text on a deep fill is always bone (v3 §2). */
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

/** Wing classes want SPEED; center classes want STEADY. */
export const WING_CLASSES: ReadonlySet<UnitClass> = new Set(["cavalry", "skirmish", "special", "ranged"]);

/** Achromatic grades (v3 §2): S and A filled with ink text; B, C and D outlined. */
export function gradeStyle(g: Grade): { bg: string; text: string; edge: string } {
  if (g === "S") return { bg: "var(--bone)", text: "var(--ink)", edge: "var(--bone)" };
  if (g === "A") return { bg: "var(--grade-a)", text: "var(--ink)", edge: "var(--grade-a)" };
  if (g === "B") return { bg: "transparent", text: "#c4bdac", edge: "var(--rule-btn)" };
  if (g === "C") return { bg: "transparent", text: "var(--dim)", edge: "var(--rule-btn)" };
  if (g === "D") return { bg: "transparent", text: "var(--faint)", edge: "var(--rule)" };
  return { bg: "transparent", text: "var(--faint)", edge: "var(--rule)" };
}
/** The token's grade tick fill: a lightness step per grade. */
export const gradeTick = (g: Grade) => (g === "S" ? "var(--bone)" : g === "A" ? "var(--grade-a)" : g === "B" ? "var(--grade-b)" : g === "C" ? "#5a5449" : g === "D" ? "#3f3a32" : "#2c2822");
export const isElite = (g: Grade) => g === "S" || g === "A";

export function cultureName(engine: Engine, key: string): string {
  return engine.data.cultures[key]?.name ?? key;
}
/** Short culture name for labels: "India", "Greece", "Gauls". */
const SHORT: Record<string, string> = { rom: "Rome", car: "Carthage", mac: "Macedon", grk: "Greece", per: "Persia", chn: "China", ind: "India", stp: "Steppe", gal: "Gauls" };
export function cultureShort(engine: Engine, key: string): string {
  return SHORT[key] ?? cultureName(engine, key).split(/ \(|&/)[0].trim();
}
/** "of Macedon", "of Gauls" reads oddly; the mock says "of Gauls", so keep the short form throughout. */
export const ofCulture = (engine: Engine, key: string) => `of ${cultureShort(engine, key)}`;
export const firstName = (name: string) => name.split(" ")[0];

export const traitDef = (engine: Engine, id: string): TraitDef & { id: string } => ({ id, ...engine.data.rules.traits[id] });
export const cultureTraitId = (engine: Engine, culture: string) => engine.data.cultures[culture].trait;
export const ROMAN = ["", "I", "II", "III"];
export const traitWithLevel = (engine: Engine, id: string, level: number) => (engine.data.rules.traits[id].kind === "rule" || level <= 1 ? engine.data.rules.traits[id].name : `${engine.data.rules.traits[id].name} ${ROMAN[level]}`);

export const SLOT_LABEL: Record<string, string> = { line: "LINE", shock: "SHOCK", cavalry: "CAVALRY", ranged: "RANGED", flex: "FLEX" };
/** The row's serif question (v3 §3.3). */
export const SLOT_QUESTION: Record<string, string> = { line: "Who holds the center?", shock: "Who breaks the line?", cavalry: "Who rides the wing?", ranged: "Who shoots first?", flex: "Any class. Any culture." };
export const CLASS_WORD: Record<UnitClass, string> = { line: "LINE", shock: "SHOCK", cavalry: "CAVALRY", ranged: "RANGED", skirmish: "SKIRMISH", special: "SPECIAL" };
export const subtypeWord = (s: string) => s.replace(/_/g, " ").toUpperCase().replace("INF", "INF").replace("CAV", "CAV");

export const PLAN_TITLE: Record<PlanName, string> = { aggressive: "Aggressive", defensive: "Defensive", envelopment: "Envelopment", skirmish: "Skirmish" };
/** One consequence sentence and who it suits (v3 §3.5.7). No multipliers. */
export const PLAN_TEXT: Record<PlanName, { does: string; suits: string }> = {
  aggressive: { does: "You hit harder at the clash; your fronts break a little sooner.", suits: "For an army that wins early or not at all." },
  defensive: { does: "Your fronts stand longer; your wings press less.", suits: "For a steady center that can outlast him." },
  envelopment: { does: "Your wings press harder; your center gives a little.", suits: "For fast wings against a thin flank." },
  skirmish: { does: "Your shooting counts for more; the clash a little less.", suits: "For an army that wants the fight decided before the lines meet." },
};
export const TERRAIN_WORD: Record<string, string> = { plains: "PLAINS", hills: "HILLS", forest: "FOREST", river: "RIVER" };
/** The ground chip's two clauses (v3 §3.5.3), from rules.terrain and rules.fronts.terrain. */
export const GROUND_NOTE: Record<string, string> = {
  plains: "Open ground. Horse and chariots move a little faster, and the wings count for more.",
  hills: "Horse and chariots lose a fifth of their combat stats; shooters gain a tenth. The wings count for half.",
  forest: "Horse loses a third, pikes and elephants a quarter; skirmishers gain. The clash is softer and the wings count for half.",
  river: "A charge across it lands at seven tenths; pikes lose a little of their reach.",
};

export function shortUnitName(u: Unit): string {
  return u.name.replace(/\s*\(.*\)\s*/, "");
}
