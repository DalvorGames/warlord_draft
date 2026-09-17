// Classical World 400-200 BC — battle resolver v0.1
// Run: node sim.mjs [seed]

// ---------- Seed data ----------
const U = (id, name, culture, cls, subtype, tier, period, s, cost) =>
  ({ id, name, culture, class: cls, subtype, tier, period, cost,
     stats: { melee: s[0], ranged: s[1], armor: s[2], mobility: s[3], discipline: s[4], shock: s[5] } });

export const UNITS = [
  // Macedon
  U("mac_phalangite", "Macedonian Phalangites", "macedon", "line", "pike", 2, "mid", [70, 0, 60, 35, 80, 45], 8),
  U("mac_hypaspist", "Hypaspists", "macedon", "shock", "spear", 3, "mid", [80, 10, 65, 55, 85, 65], 11),
  U("mac_companion", "Companion Cavalry", "macedon", "cavalry", "heavy_cav", 3, "mid", [80, 0, 65, 75, 80, 95], 13),
  // Greek
  U("grk_hoplite", "Hoplites", "greek", "line", "hoplite", 1, "early", [65, 0, 65, 35, 75, 40], 6),
  U("grk_thessalian", "Thessalian Cavalry", "greek", "cavalry", "heavy_cav", 2, "mid", [65, 0, 50, 80, 65, 75], 9),
  U("grk_cretan", "Cretan Archers", "greek", "ranged", "archer", 2, "mid", [30, 80, 20, 60, 60, 10], 6),
  U("grk_agrianian", "Agrianian Javelinmen", "greek", "skirmish", "javelin", 2, "mid", [45, 65, 20, 85, 65, 25], 5),
  // Carthage
  U("car_libyan", "Libyan Spearmen", "carthage", "line", "spear", 2, "late", [70, 0, 65, 40, 75, 45], 8),
  U("car_sacred", "Sacred Band", "carthage", "shock", "hoplite", 3, "mid", [80, 0, 75, 35, 85, 55], 11),
  U("car_numidian", "Numidian Cavalry", "carthage", "cavalry", "light_cav", 2, "late", [40, 60, 15, 95, 55, 30], 6),
  U("car_iberian_cav", "Iberian Heavy Cavalry", "carthage", "cavalry", "heavy_cav", 2, "late", [65, 0, 50, 75, 60, 70], 9),
  U("car_balearic", "Balearic Slingers", "carthage", "ranged", "slinger", 1, "late", [25, 70, 10, 65, 45, 5], 4),
  U("car_elephant", "War Elephants", "carthage", "special", "elephant", 3, "late", [75, 0, 70, 55, 40, 90], 12),
  // Gaul
  U("gaul_warband", "Gallic Warband", "gaul", "shock", "warband", 1, "mid", [70, 0, 35, 50, 40, 80], 5),
  // Persia
  U("per_immortal", "Immortals", "persia", "line", "spear", 3, "early", [65, 40, 60, 40, 70, 40], 10),
  U("per_kardakes", "Kardakes", "persia", "line", "hoplite", 1, "mid", [55, 0, 50, 40, 55, 35], 4),
  U("per_chariot", "Scythed Chariots", "persia", "special", "chariot", 2, "mid", [50, 0, 40, 80, 30, 85], 7),
  // Steppe
  U("stp_horse_archer", "Scythian Horse Archers", "steppe", "cavalry", "horse_archer", 2, "mid", [40, 80, 20, 95, 55, 30], 8),
  // Rome
  U("rom_hastati", "Hastati / Principes", "rome", "line", "legion", 2, "late", [75, 20, 60, 50, 80, 55], 9),
  U("rom_triarii", "Triarii", "rome", "line", "spear", 2, "late", [70, 0, 70, 35, 90, 40], 8),
];

export const GENERALS = [
  { id: "alexander", name: "Alexander III", culture: "macedon", period: "mid",
    stats: { command: 90, tactics: 90, logistics: 75, charisma: 100 }, style: "hammer" },
  { id: "hannibal", name: "Hannibal Barca", culture: "carthage", period: "late",
    stats: { command: 95, tactics: 100, logistics: 90, charisma: 90 }, style: "envelopment" },
  { id: "darius3", name: "Darius III", culture: "persia", period: "mid",
    stats: { command: 55, tactics: 45, logistics: 80, charisma: 50 }, style: "defensive" },
  { id: "scipio", name: "Scipio Africanus", culture: "rome", period: "late",
    stats: { command: 85, tactics: 90, logistics: 80, charisma: 80 }, style: "hammer" },
];

export const CULTURES = {
  macedon:  { name: "Macedon",  trait: { name: "Combined Arms", threshold: 3, phase: "flank", mult: 1.15 } },
  greek:    { name: "Greeks",   trait: { name: "Hoplite Cohesion", threshold: 3, stat: "discipline", mult: 1.10 } },
  carthage: { name: "Carthage", trait: { name: "Mercenary Levies", threshold: 3, phase: "skirmish", mult: 1.15 } },
  persia:   { name: "Persia",   trait: { name: "Weight of Numbers", threshold: 3, phase: "grind", mult: 1.10 } },
  rome:     { name: "Rome",     trait: { name: "Manipular Reserve", threshold: 3, moraleThreshold: 1.10 } },
  steppe:   { name: "Steppe",   trait: { name: "Refuse Battle", threshold: 3, phase: "skirmish", mult: 1.25 } },
  gaul:     { name: "Gauls",    trait: { name: "Furor", threshold: 3, phase: "charge", mult: 1.20 } },
};

// Battle plans: multipliers per phase
export const PLANS = {
  aggressive:  { skirmish: 0.9, charge: 1.2, grind: 1.0, flank: 1.0, moraleThreshold: 0.95 },
  defensive:   { skirmish: 1.0, charge: 0.8, grind: 1.15, flank: 0.85, moraleThreshold: 1.10 },
  envelopment: { skirmish: 1.0, charge: 0.95, grind: 0.9, flank: 1.3, moraleThreshold: 1.0 },
  skirmish:    { skirmish: 1.3, charge: 0.8, grind: 0.85, flank: 1.1, moraleThreshold: 1.0 },
};
const STYLE_TO_PLAN = { hammer: "aggressive", envelopment: "envelopment", attrition: "defensive", skirmish: "skirmish", defensive: "defensive" };

export const TERRAIN = {
  plains: { skirmish: 1.0, charge: 1.0, grind: 1.0, flank: 1.1 },
  hills:  { skirmish: 1.1, charge: 0.85, grind: 1.0, flank: 0.8 },
  river:  { skirmish: 1.0, charge: 0.7, grind: 1.05, flank: 0.9 },
  forest: { skirmish: 1.15, charge: 0.75, grind: 0.95, flank: 0.7 },
};

// Soft-counter matchup table: attacker subtype -> defender class/subtype -> multiplier
const MATCHUP = {
  pike:         { heavy_cav: 1.3, light_cav: 1.3, chariot: 1.3, elephant: 1.1, javelin: 0.8, archer: 0.8, slinger: 0.8, horse_archer: 0.75 },
  hoplite:      { heavy_cav: 1.15, light_cav: 1.15, chariot: 1.15 },
  spear:        { heavy_cav: 1.15, light_cav: 1.15, chariot: 1.15, elephant: 1.05 },
  legion:       { warband: 1.15, pike: 1.1 },
  heavy_cav:    { light_cav: 1.25, archer: 1.4, slinger: 1.4, javelin: 1.2, horse_archer: 0.9, pike: 0.7, hoplite: 0.8, spear: 0.8, elephant: 0.6 },
  light_cav:    { archer: 1.3, slinger: 1.3, javelin: 1.1, heavy_cav: 0.8, elephant: 0.6 },
  horse_archer: { line: 1.3, pike: 1.35, heavy_cav: 0.85 },
  elephant:     { heavy_cav: 1.4, light_cav: 1.4, horse_archer: 1.2, javelin: 0.7, slinger: 0.7, archer: 0.8, pike: 0.9 },
  chariot:      { archer: 1.3, slinger: 1.3, javelin: 1.1, pike: 0.6, hoplite: 0.75, spear: 0.75 },
  warband:      { archer: 1.2, slinger: 1.2, pike: 0.85, legion: 0.9 },
  javelin:      { elephant: 1.3, chariot: 1.2, pike: 1.15 },
  slinger:      { elephant: 1.25, chariot: 1.15, pike: 1.1 },
  archer:       { pike: 1.15, elephant: 1.15, warband: 1.1 },
};
function matchupMult(attacker, defenders) {
  // average the attacker's edge over each defending unit
  const table = MATCHUP[attacker.subtype] || {};
  let total = 0;
  for (const d of defenders) total += table[d.subtype] ?? table[d.class] ?? 1.0;
  return defenders.length ? total / defenders.length : 1.0;
}

// ---------- Seeded RNG ----------
function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function gaussianNoise(rng, sd = 0.15) {
  const u = 1 - rng(), v = rng();
  return 1 + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

// ---------- Army prep ----------
function prepArmy(army) {
  const units = army.units.map(u => ({ ...u, stats: { ...u.stats } }));
  const general = army.general;
  const plan = { ...PLANS[army.plan] };
  const active = [];
  // Culture traits
  const counts = {};
  for (const u of units) counts[u.culture] = (counts[u.culture] || 0) + 1;
  for (const [cid, n] of Object.entries(counts)) {
    const t = CULTURES[cid]?.trait;
    if (t && n >= t.threshold) {
      active.push(t.name);
      if (t.stat) for (const u of units) if (u.culture === cid) u.stats[t.stat] *= t.mult;
      if (t.phase) plan[t.phase] *= t.mult;
      if (t.moraleThreshold) plan.moraleThreshold *= t.moraleThreshold;
    }
  }
  // Combined arms: anvil + hammer + screen
  const has = c => units.some(u => u.class === c);
  const combinedArms = has("line") && has("cavalry") && (has("ranged") || has("skirmish"));
  if (combinedArms) { plan.flank *= 1.1; plan.grind *= 1.05; active.push("Combined Arms Bonus"); }
  // General style matches plan
  if (STYLE_TO_PLAN[general.style] === army.plan) {
    for (const p of ["skirmish", "charge", "grind", "flank"]) plan[p] *= 1.08;
    active.push(`${general.name}'s ${general.style} doctrine`);
  }
  // Command: scales everything slightly; tactics feeds flank; charisma feeds morale pool
  const cmd = 0.85 + general.stats.command / 100 * 0.3; // 0.85..1.15
  const avgDisc = units.reduce((s, u) => s + u.stats.discipline, 0) / units.length;
  const moraleThreshold = (0.55 + avgDisc / 100 * 0.35 + general.stats.charisma / 100 * 0.2) * plan.moraleThreshold;
  return { units, general, plan, cmd, moraleThreshold, active, morale: 0, shaken: 1.0 };
}

const byClass = (a, ...cls) => a.units.filter(u => cls.includes(u.class));
const avg = (arr, f) => arr.length ? arr.reduce((s, u) => s + f(u), 0) / arr.length : 0;

// ---------- Phases ----------
function phaseSkirmish(a, b, terrain, rng) {
  const score = (x, y) => {
    const shooters = byClass(x, "ranged", "skirmish", "cavalry").filter(u => u.stats.ranged > 30);
    const targets = byClass(y, "line", "shock", "special");
    const raw = shooters.reduce((s, u) => s + (u.stats.ranged * 0.7 + u.stats.mobility * 0.3) * matchupMult(u, targets), 0);
    const cover = avg(targets, u => u.stats.armor) / 100 * 0.5; // armor halves missile effect at 100
    return raw * (1 - cover) * x.plan.skirmish * terrain.skirmish * x.cmd * gaussianNoise(rng);
  };
  return [score(a, b), score(b, a)];
}
function phaseCharge(a, b, terrain, rng) {
  const score = (x, y) => {
    const chargers = byClass(x, "shock", "cavalry", "special").filter(u => u.stats.shock >= 50);
    const wall = byClass(y, "line", "shock");
    const impact = chargers.reduce((s, u) => s + u.stats.shock * matchupMult(u, wall), 0);
    const steadiness = wall.reduce((s, u) => s + u.stats.discipline * 0.6 + u.stats.armor * 0.4, 0);
    return (impact + 0.3 * steadiness) * x.plan.charge * terrain.charge * x.cmd * x.shaken * gaussianNoise(rng);
  };
  return [score(a, b), score(b, a)];
}
function phaseGrind(a, b, terrain, rng) {
  const score = (x, y) => {
    const fighters = byClass(x, "line", "shock", "special");
    const enemy = byClass(y, "line", "shock", "special");
    const quality = fighters.reduce((s, u) => s + (u.stats.melee * 0.5 + u.stats.armor * 0.3 + u.stats.discipline * 0.2) * matchupMult(u, enemy), 0) / Math.max(1, fighters.length);
    // Lanchester: fighting power ∝ quality × N^2 (softened to N^1.5 for a 3-6 unit range)
    return quality * Math.pow(fighters.length, 1.5) * x.plan.grind * terrain.grind * x.cmd * x.shaken * gaussianNoise(rng);
  };
  return [score(a, b), score(b, a)];
}
function phaseFlank(a, b, terrain, rng) {
  const score = (x, y) => {
    const cav = byClass(x, "cavalry");
    const enemyCav = byClass(y, "cavalry");
    const power = cav.reduce((s, u) => s + (u.stats.mobility * 0.5 + u.stats.melee * 0.3 + u.stats.shock * 0.2) * matchupMult(u, enemyCav.length ? enemyCav : byClass(y, "line")), 0);
    const tactics = 0.7 + x.general.stats.tactics / 100 * 0.6; // 0.7..1.3
    return (power + 40) * tactics * x.plan.flank * terrain.flank * x.cmd * x.shaken * gaussianNoise(rng);
  };
  return [score(a, b), score(b, a)];
}

const PHASES = [
  { name: "Skirmish", fn: phaseSkirmish, weight: 0.20 },
  { name: "Charge",   fn: phaseCharge,   weight: 0.35 },
  { name: "Grind",    fn: phaseGrind,    weight: 0.45 },
  { name: "Flank",    fn: phaseFlank,    weight: 0.35 },
];

// ---------- Resolver ----------
export function resolveBattle(armyA, armyB, terrainName = "plains", seed = 1) {
  const rng = mulberry32(seed);
  const terrain = TERRAIN[terrainName];
  const A = prepArmy(armyA), B = prepArmy(armyB);
  const log = [], recap = [];
  let brokeIn = null, winner = null;

  recap.push(`${A.general.name} (${armyA.plan}) vs ${B.general.name} (${armyB.plan}) on ${terrainName}.`);
  if (A.active.length) recap.push(`${A.general.name} brings: ${A.active.join(", ")}.`);
  if (B.active.length) recap.push(`${B.general.name} brings: ${B.active.join(", ")}.`);

  for (const ph of PHASES) {
    const [sA, sB] = ph.fn(A, B, terrain, rng);
    const top = Math.max(sA, sB), edge = Math.abs(sA - sB) / top; // 0..1
    const loser = sA >= sB ? B : A, won = sA >= sB ? A : B;
    const dmg = ph.weight * edge * 2;
    loser.morale += dmg;
    won.morale += dmg * 0.25;
    if (ph.name === "Charge" && edge > 0.25) loser.shaken = 0.9;
    const note = narrate(ph.name, won, loser, edge);
    recap.push(note);
    log.push({ phase: ph.name, scoreA: +sA.toFixed(0), scoreB: +sB.toFixed(0), moraleA: +A.morale.toFixed(2), moraleB: +B.morale.toFixed(2), note });
    if (A.morale >= A.moraleThreshold || B.morale >= B.moraleThreshold) {
      brokeIn = ph.name;
      winner = A.morale >= A.moraleThreshold ? "B" : "A";
      break;
    }
  }
  const fracA = A.morale / A.moraleThreshold, fracB = B.morale / B.moraleThreshold;
  if (!winner) { winner = fracA > fracB ? "B" : "A"; brokeIn = "Break"; }
  const W = winner === "A" ? A : B, L = winner === "A" ? B : A;
  const margin = Math.min(1, Math.abs(fracA - fracB));
  const pursuit = avg(byClass(W, "cavalry"), u => u.stats.mobility) / 100;
  const lossL = Math.min(0.8, 0.12 + 0.35 * margin + 0.15 * pursuit);
  const lossW = Math.max(0.02, 0.04 + 0.12 * (1 - margin));
  recap.push(brokeIn === "Break"
    ? `Both lines hold to the end, but ${L.general.name}'s army breaks first. ${W.general.name} wins a ${margin > 0.3 ? "decisive" : "narrow"} victory.`
    : `${L.general.name}'s army routs during the ${brokeIn.toLowerCase()}. ${W.general.name} wins a crushing victory.`);
  recap.push(`Casualties — ${W.general.name}: ${(lossW * 100).toFixed(0)}%, ${L.general.name}: ${(lossL * 100).toFixed(0)}%.`);
  return { seed, winner, brokeInPhase: brokeIn, phaseLog: log,
           moraleFraction: { A: +fracA.toFixed(2), B: +fracB.toFixed(2) },
           casualties: { A: +(winner === "A" ? lossW : lossL).toFixed(2), B: +(winner === "B" ? lossW : lossL).toFixed(2) },
           recap };
}

function narrate(phase, won, lost, edge) {
  const size = edge < 0.1 ? "narrowly" : edge < 0.3 ? "clearly" : "decisively";
  const pick = (army, cls) => { const u = byClass(army, ...cls); return u.length ? u.sort((a, b) => b.cost - a.cost)[0].name : null; };
  switch (phase) {
    case "Skirmish": return `${won.general.name}'s ${pick(won, ["ranged", "skirmish"]) || "skirmishers"} ${size} win the missile exchange.`;
    case "Charge":   return `${won.general.name}'s ${pick(won, ["cavalry", "shock", "special"]) || "assault"} ${size} win the charge; ${lost.general.name}'s line ${edge > 0.25 ? "wavers" : "holds"}.`;
    case "Grind":    return `In the press of the lines, ${won.general.name}'s ${pick(won, ["line", "shock"]) || "infantry"} ${size} get the better of the grind.`;
    case "Flank":    return `${won.general.name}'s ${pick(won, ["cavalry"]) || "reserves"} ${size} turn the flank.`;
  }
}

// ---------- Sample battle ----------
const byId = id => UNITS.find(u => u.id === id);
const gen = id => GENERALS.find(g => g.id === id);

export const ALEXANDER_ARMY = {
  general: gen("alexander"), plan: "aggressive",
  units: ["mac_phalangite", "mac_phalangite", "mac_hypaspist", "mac_companion", "grk_thessalian", "grk_cretan", "grk_agrianian", "grk_hoplite"].map(byId),
};
export const HANNIBAL_ARMY = {
  general: gen("hannibal"), plan: "envelopment",
  units: ["car_libyan", "car_libyan", "car_sacred", "car_numidian", "car_iberian_cav", "car_balearic", "gaul_warband", "car_elephant"].map(byId),
};

if (import.meta.url === `file://${process.argv[1]}`) {
  const seed = Number(process.argv[2] ?? 42);
  const r = resolveBattle(ALEXANDER_ARMY, HANNIBAL_ARMY, "plains", seed);
  console.log(r.recap.join("\n"));
  console.log("\nPhase log:");
  for (const p of r.phaseLog) console.log(`  ${p.phase.padEnd(9)} A ${String(p.scoreA).padStart(5)}  B ${String(p.scoreB).padStart(5)}   morale A ${p.moraleA}  B ${p.moraleB}`);
  console.log(`Morale fraction at end: A ${r.moraleFraction.A}  B ${r.moraleFraction.B}  (1.0 = broken)`);
}
