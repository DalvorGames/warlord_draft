// Traits (design/gdd/traits.md): one shared pool for generals and cultures. A general carries 0–3 trait ids; a
// culture grants its trait at four units of that culture (level I) and again at six (level II). Levels of the same
// scaling trait from every source add, capped at III; rule traits are on or off. Pure lookups over the data.

import { cultureCounts, traitLevel } from "./draft.js";
import type { GameData, General, PlanName, TraitDef, TraitEntry, Unit } from "./types.js";

export interface TraitSource {
  kind: "general" | "culture";
  /** For a culture source: which culture and how many of its units (general included). */
  culture?: string;
  count?: number;
  levels: number;
}
export interface ActiveTrait {
  id: string;
  name: string;
  kind: "scaling" | "rule";
  /** 1–3. Rule traits are always 1. */
  level: number;
  sources: TraitSource[];
}

export const MAX_TRAIT_LEVEL = 3;

export const traitDef = (data: GameData, id: string): TraitDef => {
  const t = data.rules.traits[id];
  if (!t) throw new Error(`unknown trait ${id}`);
  return t;
};

/** Every trait an army fields, with its level and where each level came from. Order: the general's first, then cultures by count. */
export function activeTraits(data: GameData, general: General, units: Unit[]): ActiveTrait[] {
  const levels = new Map<string, TraitSource[]>();
  const add = (id: string, src: TraitSource) => levels.set(id, [...(levels.get(id) ?? []), src]);
  for (const id of general.traits) add(id, { kind: "general", levels: 1 });
  const counts = cultureCounts(data, units, general);
  const byCount = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  for (const [cid, n] of byCount) {
    const lv = traitLevel(data, n);
    if (lv === 0) continue;
    add(data.cultures[cid].trait, { kind: "culture", culture: cid, count: n, levels: lv });
  }
  const out: ActiveTrait[] = [];
  for (const [id, sources] of levels) {
    const def = traitDef(data, id);
    const raw = sources.reduce((t, s) => t + s.levels, 0);
    out.push({ id, name: def.name, kind: def.kind, level: def.kind === "rule" ? 1 : Math.min(MAX_TRAIT_LEVEL, raw), sources });
  }
  return out;
}

/** The entries the preparer applies for a set of active traits. */
export function traitEntries(data: GameData, traits: ActiveTrait[]): TraitEntry[] {
  const out: TraitEntry[] = [];
  for (const t of traits) {
    const def = traitDef(data, t.id);
    out.push(...def.levels[Math.min(t.level, def.levels.length) - 1]);
  }
  return out;
}

export const ROMAN = ["", "I", "II", "III"];
/** "Steady II"; rule traits and level I carry no numeral. */
export function traitLabel(data: GameData, t: { id: string; level: number }): string {
  const def = traitDef(data, t.id);
  return def.kind === "rule" || t.level <= 1 ? def.name : `${def.name} ${ROMAN[t.level]}`;
}

/** Trait ids per culture, for the draft's consequence lines. */
export function cultureTrait(data: GameData, culture: string): TraitDef & { id: string } {
  const id = data.cultures[culture].trait;
  return { id, ...traitDef(data, id) };
}

/**
 * The plan a general's traits suggest, used as the bots' plan and the Deploy screen's starting choice now that
 * doctrine is gone: wings traits → envelopment, shooting traits → skirmish, holding traits → defensive,
 * clash traits → aggressive. A general with no such trait attacks.
 */
export function defaultPlan(data: GameData, general: General): PlanName {
  const map: Record<string, PlanName> = {
    envelopment: "envelopment", hammer_and_anvil: "envelopment", harass: "skirmish", volley: "skirmish",
    steady: "defensive", delayer: "defensive", deep_ranks: "defensive", numbers: "defensive",
    furor: "aggressive", oblique_order: "aggressive", terror: "aggressive",
  };
  for (const id of general.traits) if (map[id]) return map[id];
  const own = data.cultures[general.culture]?.trait;
  return (own && map[own]) || "aggressive";
}
