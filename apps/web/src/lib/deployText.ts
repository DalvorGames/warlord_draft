// Copy the Deploy screen derives from the rules and the enemy roster (handoff §3.4).
import type { Army, Engine, PlanName, TerrainName } from "@warlord/engine";
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
  x("Contact", p.contact);
  x("Steadiness", p.steadiness);
  x("Center", p.center);
  x("Wings", p.wing);
  x("Cohesion", p.moraleThreshold);
  const pct = Math.round((engine.data.rules.styleMatchBonus - 1) * 100);
  return { text: `${bits.join(", ")}. ${matches ? `Matches ${g.name.split(" ")[0]}: +${pct}% everywhere.` : `Off ${g.name.split(" ")[0]}’s style.`}`, matches };
}

/** What this ground does to the stakes of each kind of fight. */
export function terrainNote(engine: Engine, terrain: TerrainName): string {
  const t = engine.data.rules.fronts.terrain[terrain] ?? {};
  const bits: string[] = [];
  const say = (k: string, v: number | undefined, label: string) => {
    if (v === undefined || v === 1) return;
    bits.push(`${label} ${v > 1 ? "count for more" : v <= 0.5 ? "count for half" : "count for less"}`);
    void k;
  };
  say("wing", t.wing, "wing fights");
  say("skirmish", t.skirmish, "the skirmish");
  say("contact", t.contact, "the contact");
  say("center", t.center, "the center press");
  return bits.length ? `${terrain[0].toUpperCase()}${terrain.slice(1)}: ${bits.join(", ")}.` : `${terrain[0].toUpperCase()}${terrain.slice(1)}: nothing is weighted.`;
}

/** The cost of an empty front, from the rules: flat break shock plus the empty-front weight. */
export function emptyFrontNote(engine: Engine, front: "L" | "C" | "R", generalName: string): string {
  const R = engine.data.rules.fronts;
  if (front === "C") return `Empty. ${generalName.split(" ")[0]} would be standing alone: ${(R.centerBreakShock + R.emptyFrontWeight).toFixed(2)} on the spot.`;
  const his = front === "L" ? "right" : "left";
  return `Empty. It gives way at contact: ${(R.wingBreakShock + R.emptyFrontWeight).toFixed(2)} of the army, and his ${his} rolls into your center.`;
}
