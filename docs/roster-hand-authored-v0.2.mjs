// Warlord Draft — data generator v0.1
// Source of truth for the roster. Edit here, then: node build_data.mjs  → writes ./data/*.json
// Stats are 1–100: [melee, ranged, armor, mobility, discipline, shock]
// cost 1–15 is the balance lever (hand-authored first pass; batch sim tunes it). Grade derives from cost.

import { writeFileSync, mkdirSync } from "node:fs";

// ---------- Archetypes: class, subtype, base stats ----------
const ARCH = {
  pike:         ["line",     "pike",         [65,  0, 55, 35, 75, 45]],
  hoplite:      ["line",     "hoplite",      [65,  0, 60, 35, 70, 40]],
  spear:        ["line",     "spear",        [65,  0, 60, 40, 70, 40]],
  levy:         ["line",     "spear",        [45,  0, 35, 45, 45, 30]],
  legion:       ["line",     "legion",       [70, 20, 60, 50, 75, 55]],
  halberd:      ["line",     "halberd",      [65,  0, 50, 40, 65, 50]],
  light_inf:    ["line",     "light_inf",    [55, 35, 40, 65, 60, 35]],
  elite_inf:    ["shock",    "elite_inf",    [80,  5, 65, 50, 85, 60]],
  sword:        ["shock",    "sword",        [70,  0, 50, 50, 60, 65]],
  warband:      ["shock",    "warband",      [65,  0, 30, 55, 40, 75]],
  archer:       ["ranged",   "archer",       [30, 70, 20, 60, 55, 10]],
  longbow:      ["ranged",   "archer",       [35, 80, 20, 50, 55, 10]],
  crossbow:     ["ranged",   "crossbow",     [25, 80, 30, 45, 65,  5]],
  slinger:      ["ranged",   "slinger",      [25, 65, 10, 65, 45,  5]],
  javelin:      ["skirmish", "javelin",      [45, 60, 20, 80, 55, 25]],
  peltast:      ["skirmish", "javelin",      [50, 55, 30, 70, 55, 30]],
  heavy_cav:    ["cavalry",  "heavy_cav",    [70,  0, 55, 75, 65, 80]],
  cataphract:   ["cavalry",  "cataphract",   [70,  0, 80, 60, 70, 85]],
  medium_cav:   ["cavalry",  "medium_cav",   [60, 15, 40, 80, 60, 60]],
  light_cav:    ["cavalry",  "light_cav",    [40, 50, 15, 95, 50, 30]],
  horse_archer: ["cavalry",  "horse_archer", [40, 75, 20, 95, 55, 30]],
  elephant:     ["special",  "elephant",     [75,  0, 70, 55, 40, 90]],
  chariot:      ["special",  "chariot",      [50, 10, 40, 80, 35, 80]],
  scythed:      ["special",  "chariot",      [45,  0, 35, 85, 25, 90]],
};

const STAT_KEYS = ["melee", "ranged", "armor", "mobility", "discipline", "shock"];
const gradeOf = c => c >= 13 ? "S" : c >= 10 ? "A" : c >= 7 ? "B" : c >= 5 ? "C" : c >= 3 ? "D" : "F";

// U(id, name, archetype, cost, period, tweaks, tags?, classOverride?)
// tweaks are deltas on [melee, ranged, armor, mobility, discipline, shock]
function U(culture) {
  return (id, name, arch, cost, period, tw = [0, 0, 0, 0, 0, 0], tags = [], cls = null) => {
    const [defClass, subtype, base] = ARCH[arch];
    const stats = Object.fromEntries(STAT_KEYS.map((k, i) => [k, Math.max(0, Math.min(100, base[i] + (tw[i] || 0)))]));
    return { id: `${culture}_${id}`, name, culture, class: cls || defClass, subtype, archetype: arch, cost, grade: gradeOf(cost), period, stats, tags };
  };
}

// ---------- Units (15 per culture) ----------
const mac = U("mac");
const grk = U("grk");
const per = U("per");
const car = U("car");
const rom = U("rom");
const chn = U("chn");
const stp = U("stp");
const ind = U("ind");
const gal = U("gal");

export const UNITS = [
  // ===== Macedon & Successors =====
  mac("pezhetairoi",     "Pezhetairoi (Foot Companions)", "pike",       8,  "mid",  [ 5, 0,  5, 0,  5,  0], ["phalanx"]),
  mac("argyraspides",    "Argyraspides (Silver Shields)", "pike",       13, "mid",  [12, 0, 10, 0, 15,  5], ["phalanx", "veteran"]),
  mac("hypaspists",      "Hypaspists",                    "elite_inf",  11, "mid",  [ 0, 5,  0, 5,  0,  5], ["guard"]),
  mac("successor_pike",  "Successor Phalangites",         "pike",       6,  "late", [-3, 0,  0, 0, -5, -3], ["phalanx"]),
  mac("thureophoroi",    "Thureophoroi",                  "light_inf",  5,  "late", [ 0, 0,  0, 0,  0,  0], []),
  mac("antigonid_pelt",  "Antigonid Peltastai (Guard)",   "elite_inf",  10, "late", [-3, 5, -5, 5,  0,  0], ["guard"]),
  mac("companions",      "Companion Cavalry",             "heavy_cav",  13, "mid",  [10, 0, 10, 0, 15, 15], ["elite"]),
  mac("prodromoi",       "Prodromoi (Lancers)",           "medium_cav", 7,  "mid",  [ 5,-15, 0, 5,  0, 15], ["lancer"]),
  mac("cataphracts",     "Seleucid Cataphracts",          "cataphract", 12, "late", [ 0, 0,  0, 0,  0,  0], ["armored"]),
  mac("tarantines",      "Tarantine Cavalry",             "light_cav",  6,  "late", [ 5, 5,  5,-5,  5,  0], ["skirmish"]),
  mac("archers",         "Macedonian Archers",            "archer",     4,  "mid",  [ 0,-5,  0, 0,  0,  0], []),
  mac("agrianians",      "Agrianian Javelinmen",          "javelin",    6,  "mid",  [ 0, 5,  0, 5, 10,  0], ["elite"]),
  mac("thracians",       "Thracian Peltasts",             "peltast",    5,  "mid",  [ 5, 0, -5, 0, -5,  5], ["rhomphaia"]),
  mac("galatians",       "Galatian Mercenaries",          "warband",    5,  "late", [ 0, 0,  0, 0,  0,  0], ["mercenary"]),
  mac("elephants",       "Indian Elephants (Seleucid)",   "elephant",   12, "late", [ 0, 0,  0, 0,  5,  0], ["elephant"]),

  // ===== Greek city-states =====
  grk("militia",         "Militia Hoplites",              "hoplite",    5,  "early",[-5, 0, -5, 0, -5, -5], []),
  grk("epilektoi",       "Epilektoi (Picked Hoplites)",   "hoplite",    8,  "early",[ 5, 0,  5, 0, 10,  5], ["veteran"]),
  grk("spartans",        "Spartan Hoplites",              "hoplite",    13, "early",[10, 0,  5, 0, 20,  5], ["elite"]),
  grk("sacred_band",     "Theban Sacred Band",            "elite_inf",  11, "early",[ 0,-5,  5,-5,  5,  0], ["elite"]),
  grk("mercenaries",     "Greek Mercenary Hoplites",      "hoplite",    7,  "early",[ 3, 0,  0, 5,  5,  0], ["mercenary"]),
  grk("syracusan_hop",   "Syracusan Hoplites",            "hoplite",    6,  "early",[ 0, 0,  0, 0,  0,  0], []),
  grk("achaean_thureo",  "Achaean Thureophoroi",          "light_inf",  5,  "late", [ 0, 0,  0, 0,  0,  0], []),
  grk("achaean_pike",    "Achaean Phalanx",               "pike",       6,  "late", [-5, 0,  0, 0, -5,  0], ["phalanx"]),
  grk("iphicrateans",    "Iphicratean Peltasts",          "peltast",    7,  "early",[ 5, 5,  0, 5, 10,  5], ["reformed"]),
  grk("peltasts",        "Peltasts",                      "peltast",    4,  "early",[-5, 0,  0, 0, -5,  0], []),
  grk("cretans",         "Cretan Archers",                "archer",     6,  "mid",  [ 0,10,  0, 0,  5,  0], ["elite"]),
  grk("rhodians",        "Rhodian Slingers",              "slinger",    5,  "mid",  [ 0,10,  0, 0,  5,  0], []),
  grk("thessalians",     "Thessalian Cavalry",            "heavy_cav",  9,  "mid",  [-5, 0, -5, 5,  0, -5], []),
  grk("hippeis",         "Athenian Hippeis",              "medium_cav", 5,  "early",[ 0,-5,  0, 0,  0,  0], []),
  grk("syracusan_cav",   "Syracusan Cavalry",             "heavy_cav",  8,  "early",[-5, 0, -5, 5,  0, -5], []),

  // ===== Achaemenid Persia =====
  per("immortals",       "Immortals",                     "spear",      12, "early",[ 0,35,  0, 0,  0,  0], ["guard"]),
  per("apple_bearers",   "Melophoroi (Apple-Bearers)",    "elite_inf",  10, "mid",  [-5, 5, -5, 0, -5, -5], ["guard"]),
  per("kardakes",        "Kardakes",                      "hoplite",    4,  "mid",  [-10,0,-10, 5,-15, -5], []),
  per("sparabara",       "Sparabara Levy",                "levy",       3,  "early",[ 0,20,  5,-5,  0,  0], ["levy"]),
  per("greek_mercs",     "Greek Mercenaries (Persian)",   "hoplite",    7,  "mid",  [ 3, 0,  0, 0,  5,  0], ["mercenary"]),
  per("takabara",        "Takabara",                      "peltast",    4,  "mid",  [-5, 0,  0, 0, -5,  0], []),
  per("archers",         "Persian Archers",               "archer",     5,  "early",[ 0, 0,  0, 0,  0,  0], []),
  per("mardians",        "Mardian Archers",               "archer",     6,  "mid",  [ 5, 5,  0, 5,  5,  0], []),
  per("heavy_cav",       "Persian Heavy Cavalry",         "heavy_cav",  9,  "mid",  [-5, 0,  0, 0, -5, -5], []),
  per("bactrians",       "Bactrian Cavalry",              "medium_cav", 8,  "mid",  [ 5, 5,  5, 0,  0,  5], []),
  per("saka",            "Saka Horse Archers (Allied)",   "horse_archer",8, "mid",  [ 0, 0,  0, 0, -5,  0], []),
  per("cappadocians",    "Cappadocian Cavalry",           "medium_cav", 5,  "mid",  [-5, 0,  0, 0, -5,  0], []),
  per("hyrcanians",      "Hyrcanian Cavalry",             "medium_cav", 5,  "mid",  [ 0, 0,  0, 0, -5,  0], []),
  per("scythed",         "Scythed Chariots",              "scythed",    7,  "mid",  [ 0, 0,  0, 0,  0,  0], ["chariot"]),
  per("elephants",       "War Elephants (Gaugamela)",     "elephant",   9,  "mid",  [-10,0,-10,0,-10,-10], ["elephant"]),

  // ===== Carthage =====
  car("libyans",         "Libyan Spearmen",               "spear",      8,  "late", [ 5, 0,  5, 0,  5,  5], []),
  car("libyan_vets",     "Libyan Veterans (Roman Kit)",   "spear",      13, "late", [12, 0, 10, 5, 15,  8], ["veteran"]),
  car("sacred_band",     "Sacred Band of Carthage",       "elite_inf",  11, "mid",  [ 0,-5, 10,-10, 0, -5], ["elite"]),
  car("citizens",        "Citizen Militia",               "hoplite",    3,  "mid",  [-10,0,-5,0,-15,-10], ["levy"]),
  car("sicilian_greeks", "Sicilian Greek Mercenaries",    "hoplite",    6,  "early",[ 0, 0,  0, 0,  0,  0], ["mercenary"]),
  car("scutarii",        "Iberian Scutarii",              "sword",      8,  "late", [ 5, 0,  0, 0,  5,  0], ["mercenary"]),
  car("gauls",           "Gallic Mercenaries",            "warband",    5,  "late", [ 0, 0,  0, 0,  0,  0], ["mercenary"]),
  car("caetrati",        "Iberian Caetrati",              "peltast",    5,  "late", [ 5, 0,  0, 5,  0,  0], ["mercenary"]),
  car("ligurians",       "Ligurian Mercenaries",          "peltast",    4,  "late", [ 0,-5,  0, 5, -5,  0], ["mercenary"]),
  car("balearics",       "Balearic Slingers",             "slinger",    6,  "late", [ 0,15,  0, 0,  5,  0], ["elite"]),
  car("moorish_archers", "Moorish Archers",               "archer",     3,  "late", [ 0,-10, 0, 0,-10,  0], []),
  car("numidians",       "Numidian Cavalry",              "light_cav",  8,  "late", [ 0,10,  0, 0,  5,  0], ["elite"]),
  car("iberian_cav",     "Iberian Heavy Cavalry",         "heavy_cav",  8,  "late", [-5, 0, -5, 0, -5,-10], ["mercenary"]),
  car("noble_cav",       "Carthaginian Noble Cavalry",    "heavy_cav",  7,  "mid",  [-5, 0,  0,-5, -5, -5], []),
  car("elephants",       "War Elephants",                 "elephant",   12, "late", [ 0, 0,  0, 0,  0,  0], ["elephant"]),

  // ===== Rome =====
  rom("hoplites",        "Roman Hoplites (Servian)",      "hoplite",    5,  "early",[ 0, 0,  0, 0,  0,  0], []),
  rom("hastati",         "Hastati",                       "legion",     6,  "mid",  [-5, 0,-10, 5, -5,  0], ["manipular"]),
  rom("principes",       "Principes",                     "legion",     8,  "mid",  [ 0, 0,  0, 0,  5,  0], ["manipular"]),
  rom("triarii",         "Triarii",                       "spear",      8,  "mid",  [ 5, 0, 10,-5, 20, -5], ["manipular", "veteran"]),
  rom("veterans",        "Punic War Veterans",            "legion",     13, "late", [ 8, 0,  5, 0, 15,  5], ["veteran"]),
  rom("leves",           "Leves",                         "javelin",    3,  "early",[-5,-10,-5, 0,-10, -5], []),
  rom("velites",         "Velites",                       "javelin",    5,  "late", [ 0, 0,  0, 0,  5,  0], []),
  rom("extraordinarii",  "Extraordinarii",                "elite_inf",  9,  "late", [-5, 5, -5, 5, -5,  0], ["allied"]),
  rom("samnites",        "Samnite Allies",                "sword",      6,  "mid",  [ 0,10, -5, 5,  0,  0], ["allied"]),
  rom("equites",         "Roman Equites",                 "medium_cav", 5,  "mid",  [ 0,-10, 0,-5,  0,  0], []),
  rom("socii_cav",       "Italian Allied Cavalry",        "medium_cav", 5,  "mid",  [ 0,-5,  0, 0,  0,  0], ["allied"]),
  rom("campanians",      "Campanian Cavalry",             "heavy_cav",  8,  "mid",  [-5, 0, -5, 0,  0, -5], ["allied"]),
  rom("numidians",       "Numidian Allies (Masinissa)",   "light_cav",  7,  "late", [ 0, 5,  0, 0,  0,  0], ["allied"]),
  rom("archers",         "Allied Archers",                "archer",     3,  "late", [ 0,-10, 0, 0,-10,  0], ["allied"]),
  rom("slingers",        "Allied Slingers",               "slinger",    3,  "late", [ 0,-5,  0, 0,-10,  0], ["allied"]),

  // ===== Warring States China =====
  chn("qin_conscripts",  "Qin Conscript Spearmen",        "spear",      5,  "late", [-5, 0,-10, 5, -5,  0], ["levy"]),
  chn("wuzu",            "Wei Wuzu (Armored Infantry)",   "spear",      13, "early",[10, 0, 15, 0, 15,  5], ["elite"]),
  chn("ji",              "Ji Halberdiers",                "halberd",    7,  "mid",  [ 0, 0,  0, 0,  5,  0], []),
  chn("ge",              "Ge Dagger-Axe Infantry",        "halberd",    5,  "early",[-5, 0, -5, 0, -5, -5], []),
  chn("jiji",            "Qi Technicians (Ji Ji)",        "elite_inf",  9,  "mid",  [-5, 0,-10, 5, -5, -5], ["elite"]),
  chn("qin_sword",       "Qin Sword Infantry",            "sword",      7,  "late", [ 0, 0,  0, 0,  5, -5], []),
  chn("crossbows",       "Crossbowmen",                   "crossbow",   10, "mid",  [ 0, 5,  0, 0,  5,  0], ["elite"]),
  chn("heavy_crossbows", "Heavy Crossbow Batteries",      "crossbow",   8,  "late", [-5,10,  5,-10, 0,  0], []),
  chn("chu_archers",     "Chu Archers",                   "archer",     5,  "mid",  [ 0, 0,  0, 0,  0,  0], []),
  chn("skirmishers",     "Light Skirmish Infantry",       "javelin",    4,  "mid",  [ 0,-10, 0, 0,  0,  0], []),
  chn("zhao_cav",        "Zhao Cavalry",                  "medium_cav", 8,  "late", [ 5, 5,  0, 5,  0,  5], []),
  chn("qin_cav",         "Qin Cavalry",                   "medium_cav", 6,  "late", [ 0, 0,  0, 0,  0,  0], []),
  chn("zhao_ha",         "Zhao Horse Archers",            "horse_archer",8, "late", [ 0, 0,  0, 0,  0,  0], []),
  chn("yan_cav",         "Yan Border Cavalry",            "light_cav",  5,  "mid",  [ 0, 0,  0,-5,  0,  0], []),
  chn("chariots",        "War Chariots",                  "chariot",    7,  "early",[ 0,20,  5,-5, 10,-10], ["chariot"]),

  // ===== Steppe (Scythian / Saka / Sarmatian) =====
  stp("scythian_ha",     "Scythian Horse Archers",        "horse_archer",8, "mid",  [ 0, 5,  0, 0,  0,  0], []),
  stp("saka_ha",         "Saka Horse Archers",            "horse_archer",8, "mid",  [ 0, 0,  0, 0,  5,  0], []),
  stp("dahae",           "Dahae Horse Archers",           "horse_archer",6, "mid",  [ 0,-5,  0, 0, -5,  0], []),
  stp("massagetae",      "Massagetae Cataphracts",        "cataphract", 11, "mid",  [ 0, 0, -5, 0, -5,  0], ["armored"]),
  stp("scythian_nobles", "Scythian Noble Lancers",        "heavy_cav",  9,  "mid",  [ 0,10,  0, 5,  0,  0], []),
  stp("sarmatians",      "Sarmatian Lancers",             "heavy_cav",  9,  "late", [ 5, 0,  5, 0,  0,  5], ["lancer"]),
  stp("sogdians",        "Bactrian-Sogdian Cavalry",      "medium_cav", 7,  "mid",  [ 0,10,  0, 5,  0,  0], []),
  stp("parni",           "Parni Cavalry",                 "medium_cav", 6,  "late", [ 0,10,  0, 5, -5,  0], []),
  stp("foot_archers",    "Scythian Foot Archers",         "archer",     5,  "mid",  [ 0, 5,  0, 0,  0,  0], []),
  stp("levy",            "Steppe Levy Infantry",          "levy",       2,  "mid",  [ 0, 0,  0, 0,  0,  0], ["levy"]),
  stp("getae",           "Getae Allied Infantry",         "spear",      5,  "mid",  [-5, 0,-10, 5, -5,  0], ["allied"]),
  stp("sindi",           "Sindi-Maeotian Infantry",       "spear",      5,  "mid",  [-5, 0,-10, 5,-10,  0], ["allied"]),
  stp("getae_pelt",      "Getae Peltasts",                "peltast",    4,  "mid",  [ 0, 0,  0, 0, -5,  0], ["allied"]),
  stp("axemen",          "Steppe Axemen",                 "warband",    5,  "mid",  [ 0, 0,  5, 0,  5, -5], []),
  stp("camp_guard",      "Camp Guard (Dismounted)",       "spear",      4,  "mid",  [ 0,15,-10, 0,  0,  0], []),

  // ===== India (Nanda / Maurya) =====
  ind("elephants",       "War Elephants",                 "elephant",   12, "mid",  [ 0, 0,  0, 0,  5,  0], ["elephant"]),
  ind("armored_eleph",   "Armored War Elephants",         "elephant",   14, "late", [ 5, 5, 15, -5, 10, 5], ["elephant", "elite"]),
  ind("longbows",        "Indian Longbowmen",             "longbow",    12, "mid",  [ 0, 5,  0, 0,  0,  0], ["elite"]),
  ind("hill_archers",    "Hill Tribe Archers",            "archer",     5,  "mid",  [ 0, 0,  0, 5,  0,  0], []),
  ind("kshatriya_sword", "Kshatriya Swordsmen",           "sword",      8,  "mid",  [ 5, 0,  0, 0,  5,  0], []),
  ind("mace",            "Mace Infantry",                 "sword",      5,  "mid",  [ 0, 0, -5, 0, -5,  5], []),
  ind("levy",            "Levy Spearmen",                 "levy",       3,  "mid",  [ 0, 0,  0, 0,  0,  0], ["levy"]),
  ind("mauryan_inf",     "Mauryan Infantry",              "spear",      6,  "late", [ 0, 0, -5, 0,  0,  0], []),
  ind("guard",           "Mauryan Guard Infantry",        "spear",      8,  "late", [ 5, 0,  5, 0,  5,  0], ["guard"]),
  ind("buckler",         "Sword-and-Buckler Infantry",    "spear",      5,  "mid",  [ 5, 0,-10, 5, -5,  0], []),
  ind("javelins",        "Javelin Skirmishers",           "javelin",    4,  "mid",  [ 0, 0,  0, 0, -5,  0], []),
  ind("chariots",        "Indian Chariots",               "chariot",    5,  "mid",  [ 0,10,  0,-5,  0,-10], ["chariot"]),
  ind("cavalry",         "Indian Cavalry",                "medium_cav", 4,  "mid",  [-5, 0, -5, 0,-10, -5], []),
  ind("noble_cav",       "Kshatriya Noble Cavalry",       "heavy_cav",  6,  "mid",  [-5, 0,-10, 0,-10,-10], []),
  ind("kamboja",         "Kamboja Cavalry",               "medium_cav", 7,  "mid",  [ 0, 5,  0, 5,  0,  5], ["allied"]),

  // ===== Gauls / Celts =====
  gal("levy_warband",    "Levy Warband",                  "warband",    3,  "mid",  [-10,0, -5, 0,-10, -5], ["levy"]),
  gal("warband",         "Warband",                       "warband",    5,  "mid",  [ 0, 0,  0, 0,  0,  0], []),
  gal("boii",            "Boii Warband",                  "warband",    6,  "late", [ 5, 0,  0, 0,  0,  5], []),
  gal("gaesatae",        "Gaesatae",                      "warband",    8,  "late", [10, 0,-10, 5,  0, 15], ["elite"]),
  gal("nobles",          "Noble Retinue (Soldurii)",      "elite_inf",  10, "mid",  [ 0,-5,  0, 0,-10,  5], ["elite"]),
  gal("celtiberians",    "Celtiberian Mercenaries",       "sword",      8,  "late", [ 5, 0,  5, 0,  5,  0], ["mercenary"]),
  gal("galatians",       "Galatian Warband",              "warband",    5,  "late", [ 0, 0,  0, 0,  0,  0], []),
  gal("spearmen",        "Gallic Spearmen",               "spear",      5,  "mid",  [ 0, 0,-10, 5,-10,  5], []),
  gal("swordsmen",       "Veteran Swordsmen",             "spear",      7,  "late", [10, 0, -5, 5, -5, 10], ["veteran"]),
  gal("noble_cav",       "Gallic Noble Cavalry",          "heavy_cav",  8,  "mid",  [ 0, 0, -5, 0, -5,  0], []),
  gal("light_cav",       "Gallic Light Cavalry",          "light_cav",  5,  "mid",  [ 5,-10, 0, 0,  0,  5], []),
  gal("chariots",        "Gallic Chariots",               "chariot",    5,  "early",[ 0, 5,  0, 0,  0, -5], ["chariot"]),
  gal("javelinmen",      "Gallic Javelinmen",             "javelin",    4,  "mid",  [ 0,-5,  0, 0, -5,  0], []),
  gal("slingers",        "Gallic Slingers",               "slinger",    3,  "mid",  [ 0,-5,  0, 0,-10,  0], []),
  gal("archers",         "Gallic Archers",                "archer",     3,  "mid",  [ 0,-10, 0, 0,-10,  0], []),
];

// ---------- Generals ----------
// G(id, name, culture, period, command, tactics, logistics, charisma, style, note)
const G = (id, name, culture, period, command, tactics, logistics, charisma, style, note) =>
  ({ id, name, culture, period, stats: { command, tactics, logistics, charisma }, style, note });

export const GENERALS = [
  // Macedon & Successors
  G("philip2",     "Philip II",                 "mac", "mid",  85, 80, 85, 80, "attrition",   "Built the army; Chaeronea 338"),
  G("alexander",   "Alexander III",             "mac", "mid",  90, 90, 75, 100,"hammer",      "Granicus, Issus, Gaugamela, Hydaspes"),
  G("parmenion",   "Parmenion",                 "mac", "mid",  80, 70, 85, 60, "defensive",   "Held the left at Gaugamela"),
  G("antigonus1",  "Antigonus Monophthalmus",   "mac", "late", 85, 80, 75, 70, "hammer",      "Paraetacene, Gabiene; fell at Ipsus 301"),
  G("eumenes",     "Eumenes of Cardia",         "mac", "late", 75, 90, 70, 55, "envelopment", "Outmaneuvered Antigonus; betrayed by his own Argyraspides"),
  G("seleucus1",   "Seleucus I Nicator",        "mac", "late", 80, 75, 85, 70, "defensive",   "Ipsus 301 with 400 elephants"),
  G("ptolemy1",    "Ptolemy I Soter",           "mac", "late", 75, 70, 85, 75, "defensive",   "Gaza 312"),
  G("demetrius",   "Demetrius Poliorcetes",     "mac", "late", 70, 75, 55, 80, "hammer",      "Salamis 306; brilliant and erratic"),
  G("lysimachus",  "Lysimachus",                "mac", "late", 70, 65, 75, 55, "attrition",   "Thrace; Ipsus; fell at Corupedium 281"),
  G("craterus",    "Craterus",                  "mac", "mid",  75, 70, 70, 80, "hammer",      "Alexander's infantry commander"),
  G("pyrrhus",     "Pyrrhus of Epirus",         "mac", "late", 85, 90, 50, 85, "hammer",      "Heraclea, Asculum, Beneventum; Hellenistic king of Epirus"),
  G("antigonus3",  "Antigonus III Doson",       "mac", "late", 75, 75, 75, 65, "defensive",   "Sellasia 222"),
  G("philip5",     "Philip V",                  "mac", "late", 70, 65, 70, 60, "hammer",      "Social War 220–217; First Macedonian War"),
  G("antiochus3",  "Antiochus III the Great",   "mac", "late", 75, 65, 85, 75, "hammer",      "Raphia 217; anabasis; pre-200 commands only"),

  // Greek city-states
  G("xenophon",    "Xenophon",                  "grk", "early",65, 80, 85, 75, "skirmish",    "Led the Ten Thousand home, 401–399"),
  G("agesilaus",   "Agesilaus II",              "grk", "early",75, 70, 70, 75, "attrition",   "Coronea 394; Asia campaigns"),
  G("iphicrates",  "Iphicrates",                "grk", "early",70, 85, 65, 65, "skirmish",    "Lechaeum 390; peltast reforms"),
  G("chabrias",    "Chabrias",                  "grk", "early",70, 75, 65, 65, "defensive",   "Naxos 376; kneeling-hoplite tactic"),
  G("epaminondas", "Epaminondas",               "grk", "early",85, 100,65, 85, "envelopment", "Leuctra 371, Mantinea 362; oblique order"),
  G("pelopidas",   "Pelopidas",                 "grk", "early",70, 75, 55, 85, "hammer",      "Sacred Band; Tegyra 375"),
  G("dionysius1",  "Dionysius I of Syracuse",   "grk", "early",70, 65, 80, 60, "attrition",   "Sicilian wars vs. Carthage"),
  G("timoleon",    "Timoleon",                  "grk", "mid",  70, 80, 60, 80, "hammer",      "Crimissus 339"),
  G("agathocles",  "Agathocles",                "grk", "late", 70, 75, 65, 65, "hammer",      "Invaded Africa 310"),
  G("agis3",       "Agis III",                  "grk", "mid",  60, 55, 55, 70, "hammer",      "Megalopolis 331"),
  G("cleomenes3",  "Cleomenes III",             "grk", "late", 70, 70, 60, 75, "hammer",      "Spartan reformer; Sellasia 222"),
  G("philopoemen", "Philopoemen",               "grk", "late", 80, 85, 65, 75, "envelopment", "Sellasia 222 (cavalry), Mantinea 207"),

  // Achaemenid Persia
  G("artaxerxes2", "Artaxerxes II",             "per", "early",55, 45, 85, 55, "defensive",   "Cunaxa 401"),
  G("pharnabazus", "Pharnabazus",               "per", "early",65, 65, 75, 60, "skirmish",    "Satrap; harassed Agesilaus"),
  G("memnon",      "Memnon of Rhodes",          "per", "mid",  75, 85, 75, 65, "attrition",   "Advocated scorched earth vs. Alexander"),
  G("darius3",     "Darius III",                "per", "mid",  55, 45, 80, 50, "defensive",   "Issus, Gaugamela"),
  G("mazaeus",     "Mazaeus",                   "per", "mid",  70, 70, 70, 55, "hammer",      "Nearly broke Parmenion's wing at Gaugamela"),
  G("bessus",      "Bessus",                    "per", "mid",  60, 55, 65, 40, "skirmish",    "Bactrian satrap; regicide"),
  G("ariobarzanes","Ariobarzanes",              "per", "mid",  60, 65, 60, 60, "defensive",   "Persian Gates 330"),

  // Carthage
  G("himilco",     "Himilco",                   "car", "early",65, 60, 70, 55, "attrition",   "Sicily 406–396"),
  G("hamilcar",    "Hamilcar Barca",            "car", "late", 80, 85, 80, 80, "skirmish",    "Sicily guerrilla; Mercenary War; Spain"),
  G("xanthippus",  "Xanthippus",                "car", "late", 75, 85, 60, 65, "hammer",      "Spartan mercenary; Bagradas 255"),
  G("hasdrubal_f", "Hasdrubal the Fair",        "car", "late", 60, 55, 85, 70, "defensive",   "Built Carthaginian Spain"),
  G("hannibal",    "Hannibal Barca",            "car", "late", 95, 100,90, 90, "envelopment", "Trebia, Trasimene, Cannae"),
  G("hasdrubal_b", "Hasdrubal Barca",           "car", "late", 70, 65, 75, 65, "hammer",      "Spain; Metaurus 207"),
  G("mago",        "Mago Barca",                "car", "late", 70, 70, 65, 60, "envelopment", "Sprang the Trebia ambush"),
  G("hasdrubal_g", "Hasdrubal Gisco",           "car", "late", 60, 55, 70, 50, "defensive",   "Ilipa 206; Great Plains 203"),
  G("maharbal",    "Maharbal",                  "car", "late", 65, 75, 55, 70, "hammer",      "Cavalry commander; 'you know how to win, Hannibal'"),

  // Rome (commanded in the field before 200 BC)
  G("camillus",    "Marcus Furius Camillus",    "rom", "early",80, 75, 75, 85, "attrition",   "Veii 396; Allia aftermath"),
  G("papirius",    "Papirius Cursor",           "rom", "mid",  75, 70, 75, 70, "hammer",      "Second Samnite War"),
  G("rullianus",   "Fabius Maximus Rullianus",  "rom", "mid",  75, 70, 70, 70, "hammer",      "Sentinum 295"),
  G("dentatus",    "Manius Curius Dentatus",    "rom", "mid",  75, 70, 70, 75, "defensive",   "Beneventum 275 vs. Pyrrhus"),
  G("regulus",     "Marcus Atilius Regulus",    "rom", "late", 60, 45, 60, 65, "hammer",      "Bagradas 255 — lost to Xanthippus"),
  G("flaminius",   "Gaius Flaminius",           "rom", "late", 55, 40, 60, 65, "hammer",      "Trasimene 217"),
  G("fabius",      "Fabius Maximus Cunctator",  "rom", "late", 75, 80, 85, 65, "attrition",   "The Delayer"),
  G("paullus",     "Lucius Aemilius Paullus",   "rom", "late", 65, 60, 65, 70, "defensive",   "Fell at Cannae 216"),
  G("marcellus",   "Marcus Claudius Marcellus", "rom", "late", 80, 75, 70, 85, "hammer",      "Clastidium 222; Syracuse; the Sword of Rome"),
  G("nero",        "Gaius Claudius Nero",       "rom", "late", 75, 85, 75, 70, "envelopment", "Metaurus 207 forced march"),
  G("scipio_sr",   "Publius Cornelius Scipio",  "rom", "late", 60, 60, 65, 65, "defensive",   "Ticinus 218; Spain"),
  G("scipio",      "Scipio Africanus",          "rom", "late", 85, 90, 80, 80, "hammer",      "Ilipa 206, Great Plains 203, Zama 202"),

  // Warring States China
  G("wuqi",        "Wu Qi",                     "chn", "early",85, 85, 80, 80, "attrition",   "Wei's Wuzu; 76 battles undefeated (tradition)"),
  G("sunbin",      "Sun Bin",                   "chn", "mid",  70, 100,70, 65, "envelopment", "Guiling 354, Maling 342"),
  G("pangjuan",    "Pang Juan",                 "chn", "mid",  70, 60, 65, 60, "hammer",      "Fell at Maling"),
  G("wuling",      "King Wuling of Zhao",       "chn", "mid",  75, 70, 75, 75, "skirmish",    "Cavalry reforms 307"),
  G("yueyi",       "Yue Yi",                    "chn", "mid",  80, 80, 75, 70, "hammer",      "Took 70 Qi cities for Yan, 284"),
  G("tiandan",     "Tian Dan",                  "chn", "mid",  65, 90, 60, 80, "envelopment", "Fire-oxen at Jimo 279"),
  G("baiqi",       "Bai Qi",                    "chn", "late", 95, 95, 85, 70, "envelopment", "Yique, Changping 260"),
  G("lianpo",      "Lian Po",                   "chn", "late", 80, 70, 85, 75, "defensive",   "Held Changping until replaced"),
  G("limu",        "Li Mu",                     "chn", "late", 85, 90, 80, 75, "skirmish",    "Crushed the Xiongnu; Fei 233"),
  G("wangjian",    "Wang Jian",                 "chn", "late", 90, 85, 90, 75, "attrition",   "Conquered Zhao and Chu for Qin"),
  G("mengtian",    "Meng Tian",                 "chn", "late", 80, 70, 90, 65, "defensive",   "Ordos 215; the Wall"),
  G("xiangyu",     "Xiang Yu",                  "chn", "late", 85, 80, 50, 95, "hammer",      "Julu 207; broke the cauldrons"),
  G("hanxin",      "Han Xin",                   "chn", "late", 90, 95, 85, 70, "envelopment", "Jingxing 204; Gaixia 202"),

  // Steppe
  G("ateas",       "Ateas",                     "stp", "mid",  70, 65, 65, 75, "skirmish",    "Scythian king; fell to Philip II 339"),
  G("spitamenes",  "Spitamenes",                "stp", "mid",  70, 85, 60, 70, "skirmish",    "Sogdian revolt; wiped a Macedonian column at Polytimetus 329"),
  G("arsaces1",    "Arsaces I",                 "stp", "late", 70, 70, 70, 80, "skirmish",    "Parni chief; founded Parthia 247"),

  // India
  G("porus",       "Porus",                     "ind", "mid",  75, 65, 65, 90, "defensive",   "Hydaspes 326"),
  G("chandragupta","Chandragupta Maurya",       "ind", "late", 85, 80, 90, 85, "attrition",   "Overthrew the Nandas; beat Seleucus 305"),
  G("bindusara",   "Bindusara",                 "ind", "late", 65, 60, 80, 60, "defensive",   "Expanded the Mauryan south"),
  G("ashoka",      "Ashoka",                    "ind", "late", 70, 65, 90, 75, "attrition",   "Kalinga 261 — before the remorse"),

  // Gauls / Celts
  G("brennus1",    "Brennus (Senones)",         "gal", "early",65, 60, 45, 85, "hammer",      "Allia and the sack of Rome 390"),
  G("britomaris",  "Britomaris",                "gal", "mid",  60, 55, 45, 70, "hammer",      "Senones vs. Rome 283"),
  G("brennus2",    "Brennus (Galatian)",        "gal", "late", 70, 60, 50, 80, "hammer",      "Invaded Greece; Thermopylae, Delphi 279"),
  G("bolgios",     "Bolgios",                   "gal", "late", 65, 60, 45, 70, "hammer",      "Killed Ptolemy Keraunos 279"),
  G("aneroestes",  "Aneroëstes",                "gal", "late", 65, 55, 50, 75, "hammer",      "Telamon 225"),
  G("concolitanus","Concolitanus",              "gal", "late", 60, 55, 50, 70, "hammer",      "Telamon 225"),
  G("viridomarus", "Viridomarus",               "gal", "late", 65, 60, 50, 80, "hammer",      "Insubres; killed by Marcellus at Clastidium 222"),
];

// ---------- Cultures ----------
export const CULTURES = {
  mac: { name: "Macedon & Successors", trait: "Combined Arms",
    level1: [{ phase: "flank", mult: 1.15 }],
    level2: [{ phase: "flank", mult: 1.25 }, { rule: "pikes_ignore_shaken" }] },
  grk: { name: "Greek City-States", trait: "Hoplite Cohesion",
    level1: [{ stat: "discipline", mult: 1.10, scope: "culture" }],
    level2: [{ stat: "discipline", mult: 1.15, scope: "culture" }, { moraleThreshold: 1.10 }] },
  per: { name: "Achaemenid Persia", trait: "Weight of Numbers",
    level1: [{ eliteSlots: 1 }],
    level2: [{ eliteSlots: 1 }, { phase: "grind", mult: 1.10 }] },
  car: { name: "Carthage", trait: "Mercenary Army",
    level1: [{ stat: "all", mult: 1.05, scope: "other_cultures" }],
    level2: [{ stat: "all", mult: 1.08, scope: "other_cultures" }, { generalStat: "tactics", mult: 1.2, phase: "flank" }] },
  rom: { name: "Rome", trait: "Manipular Reserve",
    level1: [{ moraleThreshold: 1.10 }],
    level2: [{ moraleThreshold: 1.10 }, { rule: "never_shaken_by_charge" }] },
  chn: { name: "Warring States China", trait: "Crossbow Volleys",
    level1: [{ phase: "skirmish", mult: 1.20 }],
    level2: [{ phase: "skirmish", mult: 1.30 }, { phaseWeight: "skirmish", value: 0.65 }] },
  stp: { name: "Steppe Nomads", trait: "Refuse Battle",
    level1: [{ phase: "skirmish", mult: 1.25 }],
    level2: [{ phase: "skirmish", mult: 1.25 }, { rule: "half_morale_damage_from_lost_grind" }] },
  ind: { name: "India (Nanda / Maurya)", trait: "Elephant Line",
    level1: [{ phase: "charge", mult: 1.15 }],
    level2: [{ phase: "charge", mult: 1.25 }, { rule: "rampage_chance_halved" }] },
  gal: { name: "Gauls & Celts", trait: "Furor",
    level1: [{ phase: "charge", mult: 1.20 }],
    level2: [{ phase: "charge", mult: 1.35 }, { moraleThreshold: 0.90 }] },
};

// ---------- Rules ----------
export const RULES = {
  dataVersion: 1,
  grades: { S: [13, 15], A: [10, 12], B: [7, 9], C: [5, 6], D: [3, 4], F: [1, 2] },
  draftRarity: { S: 0.05, A: 0.15, B: 0.30, C: 0.30, D: 0.15, F: 0.05 },
  slots: ["line", "line", "shock", "cavalry", "cavalry", "ranged", "ranged", "flex"],
  cardsPerRow: 4, onClassCardsPerRow: 3, rerolls: 2, homeCultureTilt: 0.30, generalPool: 3,
  eliteCap: { base: 2, logisticsThreshold: 80, withLogistics: 3 },
  traitThresholds: [4, 6], generalCountsAsUnit: true,
  // slotPenalties[unitClass][slotClass] = multiplier on all stats; null = not allowed. "ranged" slot accepts ranged+skirmish.
  slotPenalties: {
    line:     { line: 1.0,  shock: 0.90, cavalry: null, ranged: 0.55 },
    shock:    { line: 0.90, shock: 1.0,  cavalry: null, ranged: 0.60 },
    cavalry:  { line: 0.70, shock: 0.75, cavalry: 1.0,  ranged: 0.80 }, // light_cav/horse_archer in ranged slot: 0.95
    ranged:   { line: 0.60, shock: 0.60, cavalry: null, ranged: 1.0 },
    skirmish: { line: 0.60, shock: 0.60, cavalry: null, ranged: 1.0 },
    special:  { line: 0.75, shock: 0.85, cavalry: null, ranged: null },
  },
  lightCavInRangedSlot: 0.95,
  wreckedThreshold: 0.60, // at or below this multiplier the unit also starts the battle shaken
  plans: {
    aggressive:  { skirmish: 0.9, charge: 1.2,  grind: 1.0,  flank: 1.0,  moraleThreshold: 0.95 },
    defensive:   { skirmish: 1.0, charge: 0.8,  grind: 1.15, flank: 0.85, moraleThreshold: 1.10 },
    envelopment: { skirmish: 1.0, charge: 0.95, grind: 0.9,  flank: 1.3,  moraleThreshold: 1.0 },
    skirmish:    { skirmish: 1.3, charge: 0.8,  grind: 0.85, flank: 1.1,  moraleThreshold: 1.0 },
  },
  styleToPlan: { hammer: "aggressive", envelopment: "envelopment", attrition: "defensive", skirmish: "skirmish", defensive: "defensive" },
  styleMatchBonus: 1.08,
  // terrain applied by unit class / subtype, asymmetric — never as a flat phase multiplier
  terrain: {
    plains: { cavalry: 1.05, chariot: 1.05 },
    hills:  { cavalry: 0.80, chariot: 0.70, elephant: 0.85, ranged: 1.10, skirmish: 1.10 },
    river:  { chargeAttacker: 0.70, pike: 0.85 },
    forest: { cavalry: 0.70, chariot: 0.60, pike: 0.75, elephant: 0.80, skirmish: 1.15, warband: 1.10 },
  },
  phaseWeights: { skirmish: 0.50, charge: 0.50, grind: 0.40, flank: 0.60 }, // batch-tuned 2026-09-16: skirmish weight sets the early-rout rate (~15%); see docs/BALANCE.md
  noiseSD: 0.15,
  lanchesterExponent: 1.3,
  grindBodyWeight: { line: 1.0, shock: 1.0, special: 0.5, cavalry: 0.0, ranged: 0.0, skirmish: 0.0 },
  shakenMult: 0.90,
  shakenEdge: 0.25,               // losing the charge by more than this edge makes you shaken
  chargeSteadinessSide: "own",    // "own": each side's charge score = its impact + 0.3 × its own wall's steadiness; "enemy": v0.1 reading
  chargeSteadinessCoef: 0.30,
  events: { chancePerBattle: 0.08, list: [
    { id: "general_falls",   name: "The general falls",          phase: "charge", effect: "loser of charge: charisma contribution removed; morale threshold −15%", weight: 1, params: { thresholdMult: 0.85 } },
    { id: "rampage",         name: "Elephants rampage",          phase: "charge", effect: "side that fields elephants and loses the charge: takes charge weight × elephants' share of its impact × damageMult as extra morale damage", weight: 2, requires: "elephant", params: { damageMult: 1.0 } },
    { id: "downpour",        name: "Downpour",                   phase: "skirmish", effect: "skirmish phase morale damage ×0.3 (scaling both scores would cancel)", weight: 1, params: { damageMult: 0.3 } },
    { id: "pursuit_lost",    name: "Cavalry pursues off-field",  phase: "flank", effect: "winner of charge: cavalry excluded from flank phase", weight: 1 },
    { id: "flank_collapse",  name: "Flank collapses early",      phase: "flank", effect: "loser of flank takes flank damage ×2 (Cannae)", weight: 1, params: { damageMult: 2.0 } },
    { id: "reinforcements",  name: "Reinforcements arrive",      phase: "grind", effect: "campaign only: side with higher logistics gets grind ×1.2", weight: 1, campaignOnly: true, params: { grindMult: 1.2 } },
  ]},
  casualties: { loserBase: 0.12, loserMargin: 0.35, pursuit: 0.15, loserMax: 0.80, winnerBase: 0.04, winnerCloseness: 0.12 },
  matchups: {
    pike:         { heavy_cav: 1.3, medium_cav: 1.25, light_cav: 1.3, cataphract: 1.2, chariot: 1.3, elephant: 1.1, javelin: 0.8, archer: 0.8, slinger: 0.8, crossbow: 0.8, horse_archer: 0.75, legion: 0.9 },
    hoplite:      { heavy_cav: 1.15, medium_cav: 1.15, light_cav: 1.15, chariot: 1.15, warband: 1.1 },
    spear:        { heavy_cav: 1.15, medium_cav: 1.15, light_cav: 1.15, chariot: 1.15, elephant: 1.05 },
    halberd:      { heavy_cav: 1.2, medium_cav: 1.2, chariot: 1.25, warband: 1.05 },
    legion:       { warband: 1.15, sword: 1.05, pike: 1.1, hoplite: 1.05, elephant: 1.1 },
    light_inf:    { javelin: 1.1, slinger: 1.1, archer: 1.1 },
    elite_inf:    { warband: 1.1, spear: 1.05, hoplite: 1.05 },
    sword:        { pike: 1.05, archer: 1.15, slinger: 1.15, javelin: 1.05 },
    heavy_cav:    { light_cav: 1.25, medium_cav: 1.15, archer: 1.4, slinger: 1.4, crossbow: 1.3, javelin: 1.2, horse_archer: 0.9, pike: 0.7, hoplite: 0.8, spear: 0.8, halberd: 0.75, elephant: 0.6 },
    cataphract:   { light_cav: 1.3, medium_cav: 1.2, heavy_cav: 1.1, archer: 1.4, slinger: 1.4, crossbow: 1.2, horse_archer: 1.0, pike: 0.75, hoplite: 0.85, spear: 0.85, elephant: 0.65 },
    medium_cav:   { light_cav: 1.1, archer: 1.3, slinger: 1.3, javelin: 1.1, heavy_cav: 0.85, pike: 0.7, hoplite: 0.8, spear: 0.8, elephant: 0.6 },
    light_cav:    { archer: 1.3, slinger: 1.3, javelin: 1.1, heavy_cav: 0.8, cataphract: 0.7, elephant: 0.6 },
    horse_archer: { line: 1.3, pike: 1.35, hoplite: 1.3, legion: 1.2, heavy_cav: 0.85, cataphract: 0.9, light_cav: 1.0, elephant: 1.15 },
    elephant:     { heavy_cav: 1.4, medium_cav: 1.4, light_cav: 1.4, cataphract: 1.3, horse_archer: 1.2, javelin: 0.7, slinger: 0.7, archer: 0.8, pike: 0.9, legion: 0.85 },
    chariot:      { archer: 1.3, slinger: 1.3, crossbow: 1.2, javelin: 1.1, warband: 1.1, pike: 0.6, hoplite: 0.75, spear: 0.75, halberd: 0.7, legion: 0.8 },
    warband:      { archer: 1.2, slinger: 1.2, hoplite: 1.05, pike: 0.85, legion: 0.9, elite_inf: 0.9 },
    javelin:      { elephant: 1.3, chariot: 1.2, pike: 1.15, cataphract: 1.05 },
    slinger:      { elephant: 1.25, chariot: 1.15, pike: 1.1, hoplite: 1.05 },
    archer:       { pike: 1.15, elephant: 1.15, warband: 1.1, light_cav: 0.9 },
    crossbow:     { pike: 1.2, elephant: 1.2, cataphract: 1.15, heavy_cav: 1.1, warband: 1.15 },
  },
};

// ---------- Validation + write ----------
function validate() {
  const ids = new Set();
  for (const u of UNITS) { if (ids.has(u.id)) throw new Error("dup unit id " + u.id); ids.add(u.id); }
  const gids = new Set();
  for (const g of GENERALS) { if (gids.has(g.id)) throw new Error("dup general id " + g.id); gids.add(g.id); if (!CULTURES[g.culture]) throw new Error("bad culture " + g.culture); }
  const summary = {};
  for (const c of Object.keys(CULTURES)) {
    const us = UNITS.filter(u => u.culture === c);
    const byClass = {};
    for (const u of us) byClass[u.class] = (byClass[u.class] || 0) + 1;
    const byGrade = {};
    for (const u of us) byGrade[u.grade] = (byGrade[u.grade] || 0) + 1;
    summary[c] = { units: us.length, generals: GENERALS.filter(g => g.culture === c).length, byClass, byGrade };
  }
  return summary;
}

const DATA = new URL("../data", import.meta.url).pathname;
mkdirSync(DATA, { recursive: true });
writeFileSync(DATA + "/units.json", JSON.stringify(UNITS, null, 2));
writeFileSync(DATA + "/generals.json", JSON.stringify(GENERALS, null, 2));
writeFileSync(DATA + "/cultures.json", JSON.stringify(CULTURES, null, 2));
writeFileSync(DATA + "/rules.json", JSON.stringify(RULES, null, 2));
const s = validate();
console.log(`units: ${UNITS.length}, generals: ${GENERALS.length}`);
for (const [c, v] of Object.entries(s)) console.log(c.padEnd(4), `units ${v.units}  generals ${String(v.generals).padStart(2)}  classes ${JSON.stringify(v.byClass)}  grades ${JSON.stringify(v.byGrade)}`);
