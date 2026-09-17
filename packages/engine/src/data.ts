import type { GameData, Grade, Rules, Unit, General, Culture } from "./types.js";

const STAT_KEYS = ["melee", "ranged", "armor", "mobility", "discipline", "shock"] as const;

export function gradeOf(cost: number, rules: Rules): Grade {
  for (const [g, [lo, hi]] of Object.entries(rules.grades) as [Grade, [number, number]][]) {
    if (cost >= lo && cost <= hi) return g;
  }
  throw new Error(`cost ${cost} has no grade`);
}

/** Build a GameData from already-parsed JSON (what a browser client will do). */
export function buildData(raw: {
  units: Unit[];
  generals: General[];
  cultures: Record<string, Culture>;
  rules: Rules;
}): GameData {
  const { units, generals, cultures, rules } = raw;
  const unitById = new Map<string, Unit>();
  for (const u of units) {
    if (unitById.has(u.id)) throw new Error(`duplicate unit id ${u.id}`);
    if (!cultures[u.culture]) throw new Error(`unit ${u.id}: unknown culture ${u.culture}`);
    if (!(u.class in rules.slotPenalties)) throw new Error(`unit ${u.id}: unknown class ${u.class}`);
    for (const k of STAT_KEYS) {
      const v = u.stats[k];
      if (typeof v !== "number" || v < 0 || v > 100) throw new Error(`unit ${u.id}: bad stat ${k}=${v}`);
    }
    const g = gradeOf(u.cost, rules);
    if (u.grade !== g) throw new Error(`unit ${u.id}: grade ${u.grade} does not match cost ${u.cost} (${g})`);
    unitById.set(u.id, u);
  }
  const generalById = new Map<string, General>();
  for (const g of generals) {
    if (generalById.has(g.id)) throw new Error(`duplicate general id ${g.id}`);
    if (!cultures[g.culture]) throw new Error(`general ${g.id}: unknown culture ${g.culture}`);
    if (!Array.isArray(g.traits)) throw new Error(`general ${g.id}: traits must be a list`);
    for (const t of g.traits) if (!rules.traits[t]) throw new Error(`general ${g.id}: unknown trait ${t}`);
    generalById.set(g.id, g);
  }
  for (const [cid, c] of Object.entries(cultures)) if (!rules.traits[c.trait]) throw new Error(`culture ${cid}: unknown trait ${c.trait}`);
  for (const [id, t] of Object.entries(rules.traits)) {
    if (t.kind === "scaling" && t.levels.length !== 3) throw new Error(`trait ${id}: scaling traits need three levels`);
    if (t.kind === "rule" && t.levels.length !== 1) throw new Error(`trait ${id}: rule traits have one level`);
  }
  if (rules.slots.length !== 8) throw new Error("rules.slots must have 8 rows");
  return { units, generals, cultures, rules, unitById, generalById };
}

export type RawData = Parameters<typeof buildData>[0];
