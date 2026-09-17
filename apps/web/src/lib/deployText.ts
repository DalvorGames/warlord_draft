// Copy the Deploy screen derives from the rules and the enemy roster (handoff §3.4).
import type { Army, Engine, PlanName, TerrainName, Unit } from "@warlord/engine";
import { WING_CLASSES } from "./text";

const WORDS = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight"];

/** "He brings six that stand and two that ride. Pack the center and his wings are one unit each." */
export function enemyRead(engine: Engine, foe: Army): string {
  const units = foe.slots.map((s) => engine.data.unitById.get(s.unitId)!);
  const stand = units.filter((u) => !WING_CLASSES.has(u.class)).length;
  const ride = units.filter((u) => u.class === "cavalry").length;
  const skirm = units.filter((u) => u.class === "skirmish" || u.class === "special").length;
  const parts = [`${WORDS[stand]} that stand`];
  if (ride) parts.push(`${WORDS[ride]} that ride`);
  if (skirm) parts.push(`${WORDS[skirm]} that skirmish`);
  const brings = parts.length > 1 ? `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}` : parts[0];
  let advice: string;
  if (stand >= 6) advice = "Pack the center and his wings are one unit each.";
  else if (ride + skirm >= 4) advice = "Half his army rides. Expect strong wings and a thin center.";
  else if (units.every((u) => u.stats.ranged === 0)) advice = "Nothing of his shoots. The skirmish is yours if you brought bows.";
  else advice = "A balanced line. Whoever wins a wing first will decide it.";
  return `He brings ${brings}. ${advice}`;
}

/** Doctrine effect line: "Contact ×1.15, steadiness ×0.90. Off Hannibal's style." */
export function planNote(engine: Engine, plan: PlanName, generalId: string): { text: string; matches: boolean } {
  const p = engine.data.rules.fronts.plans[plan];
  const g = engine.data.generalById.get(generalId)!;
  const matches = engine.data.rules.styleToPlan[g.style] === plan;
  const bits: string[] = [];
  const x = (label: string, v: number) => v !== 1 && bits.push(`${label} ×${v.toFixed(2)}`);
  x("Skirmish", p.skirmish);
  x("Clash", p.contact);
  x("Steadiness", p.steadiness);
  x("Center", p.center);
  x("Wings", p.wing);
  x("Cohesion", p.moraleThreshold);
  const pct = Math.round((engine.data.rules.styleMatchBonus - 1) * 100);
  return { text: `${bits.join(", ")}. ${matches ? `Matches ${g.name.split(" ")[0]}: +${pct}% everywhere.` : `Off ${g.name.split(" ")[0]}’s style.`}`, matches };
}

/** The field's mono line: "FOREST · WINGS ×0.5 · SKIRMISH ×1.2". */
export function terrainLine(engine: Engine, terrain: TerrainName): string {
  const t = engine.data.rules.fronts.terrain[terrain] ?? {};
  const bits: string[] = [];
  if (t.wing !== undefined && t.wing !== 1) bits.push(`WINGS ×${t.wing.toFixed(2).replace(/0$/, "")}`);
  if (t.skirmish !== undefined && t.skirmish !== 1) bits.push(`SKIRMISH ×${t.skirmish.toFixed(2).replace(/0$/, "")}`);
  if (t.contact !== undefined && t.contact !== 1) bits.push(`CLASH ×${t.contact.toFixed(2).replace(/0$/, "")}`);
  if (t.center !== undefined && t.center !== 1) bits.push(`CENTER ×${t.center.toFixed(2).replace(/0$/, "")}`);
  return [terrain.toUpperCase(), ...bits].join(" · ");
}

/** The cost of an empty front, from the rules: flat break shock plus the empty-front weight. */
export function emptyFrontNote(engine: Engine, front: "L" | "C" | "R", generalName: string): string {
  const R = engine.data.rules.fronts;
  if (front === "C") return `Empty. ${generalName.split(" ")[0]} alone: ${(R.centerBreakShock + R.emptyFrontWeight).toFixed(2)}.`;
  return `Empty. Gives way at the clash: ${(R.wingBreakShock + R.emptyFrontWeight).toFixed(2)}.`;
}

/** The inspector sentence (v2 §4.6), from the engine's press weights. */
export function inspectorFit(unit: Unit): { wingScore: number; centerScore: number; text: string } {
  const s = unit.stats;
  const wingScore = Math.round(s.mobility * 0.4 + s.melee * 0.4 + s.shock * 0.2);
  const centerScore = Math.round(s.melee * 0.5 + s.armor * 0.3 + s.discipline * 0.2);
  let text: string;
  if (unit.class === "ranged") text = `Shoots ${s.ranged} in the skirmish, then presses at only ${wingScore} on a wing, ${centerScore} in the center. Keep it where the fight is short.`;
  else if (WING_CLASSES.has(unit.class)) text = `On a wing it presses at ${wingScore} and charges ${s.shock}. In the center it would grind at ${centerScore} and lose its Speed.`;
  else text = `In the center it grinds at ${centerScore} and holds with Steady ${Math.round(s.discipline)}. On a wing it would press at only ${wingScore}.`;
  return { wingScore, centerScore, text };
}
