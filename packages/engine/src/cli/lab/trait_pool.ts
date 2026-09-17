// The proposed trait pool with sizes measured on 2026-09-16 (design/gdd/traits.md). Each scaling trait has
// three levels sized to lift win rate by about +4 / +8 / +12 points alone (so depth matches breadth); rule traits are on or off.
// This is lab data: nothing in the shipped game reads it yet.
import type { TraitEntry } from "../../types.js";

export interface TraitDef { id: string; name: string; kind: "scaling" | "rule"; text: string; culture?: string; levels: TraitEntry[][] }

export const TRAIT_POOL: TraitDef[] = [
  { id: "deep_ranks", name: "Deep ranks", kind: "scaling", culture: "rom", text: "Fresh ranks step up: your fronts recover a little each round.", levels: [[{ relief: 0.010 }], [{ relief: 0.020 }], [{ relief: 0.029 }]] },
  { id: "steady", name: "Steady", kind: "scaling", culture: "grk", text: "Your fronts take more punishment before they break.", levels: [[{ moraleThreshold: 1.04 }], [{ moraleThreshold: 1.075 }], [{ moraleThreshold: 1.12 }]] },
  { id: "hammer_and_anvil", name: "Hammer and anvil", kind: "scaling", culture: "mac", text: "A wing of yours that breaks its opponent wheels into his center harder.", levels: [[{ rollup: 1.8 }, { rollupDamage: 1.8 }], [{ rollup: 3.3 }, { rollupDamage: 3.3 }], [{ rollup: 5 }, { rollupDamage: 5 }]] },
  { id: "numbers", name: "Numbers", kind: "scaling", culture: "per", text: "Weight of numbers counts for more in the press.", levels: [[{ lanchester: 0.03 }], [{ lanchester: 0.06 }], [{ lanchester: 0.10 }]] },
  { id: "mercenary_captain", name: "Mercenary captain", kind: "scaling", culture: "car", text: "Units from outside your general's culture fight better.", levels: [[{ stat: "melee", mult: 1.12, scope: "other_cultures" }], [{ stat: "melee", mult: 1.25, scope: "other_cultures" }], [{ stat: "melee", mult: 1.42, scope: "other_cultures" }]] },
  { id: "volley", name: "Volley", kind: "scaling", culture: "chn", text: "Your center shoots harder.", levels: [[{ centerShooting: 0.68 }], [{ centerShooting: 0.92 }], [{ centerShooting: 1.39 }]] },
  { id: "harass", name: "Harass", kind: "scaling", culture: "stp", text: "Your wings win the missile exchange more heavily.", levels: [[{ wingShooting: 1.25 }], [{ wingShooting: 1.62 }], [{ wingShooting: 2.29 }]] },
  { id: "terror", name: "Terror", kind: "scaling", culture: "ind", text: "Fronts that lose the clash to you shake sooner and fight worse for it.", levels: [[{ shakenEdge: 0.15 }, { enemyShakenMult: 0.84 }], [{ shakenEdge: 0.15 }, { enemyShakenMult: 0.70 }], [{ shakenEdge: 0.15 }, { enemyShakenMult: 0.59 }]] },
  { id: "furor", name: "Furor", kind: "scaling", culture: "gal", text: "You hit harder at the clash, and a little weaker every round after.", levels: [[{ phase: "charge", mult: 1.06 }, { pressDecay: 0.015 }], [{ phase: "charge", mult: 1.17 }, { pressDecay: 0.042 }], [{ phase: "charge", mult: 1.51 }, { pressDecay: 0.127 }]] },
  { id: "envelopment", name: "Envelopment", kind: "scaling", text: "Your wings press harder.", levels: [[{ phase: "flank", mult: 1.10 }], [{ phase: "flank", mult: 1.22 }], [{ phase: "flank", mult: 1.38 }]] },
  { id: "oblique_order", name: "Oblique order", kind: "scaling", text: "Your most heavily loaded front hits harder at the clash.", levels: [[{ heaviestFrontContact: 1.08 }], [{ heaviestFrontContact: 1.16 }], [{ heaviestFrontContact: 1.28 }]] },
  { id: "delayer", name: "Delayer", kind: "rule", text: "None of your fronts can break before the second round.", levels: [[{ noBreakBefore: 2 }]] },
  { id: "rally", name: "Rally", kind: "rule", text: "The first of your fronts to break holds for one more stage.", levels: [[{ rally: 0.001 }]] },
  { id: "master_of_ground", name: "Master of ground", kind: "rule", text: "Ground penalties on your units are halved.", levels: [[{ groundPenalty: 0.5 }]] },
  { id: "scouts", name: "Scouts", kind: "rule", text: "Before you deploy, you are told which of his fronts is heaviest.", levels: [[]] },
];
export const trait = (id: string, level = 1): TraitEntry[] => { const t = TRAIT_POOL.find((x) => x.id === id); if (!t) throw new Error("no trait " + id); return t.levels[Math.min(level, t.levels.length) - 1]; };
