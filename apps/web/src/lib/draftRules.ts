// Rules the draft UI computes itself (v3 §4.1–4.3): consequence lines, loud stats with the delta, the trait tally.
import type { DraftState, Engine, Grade, StatKey, Unit, UnitClass } from "@warlord/engine";
import { cultureShort, cultureTraitId, isElite, traitDef, ROMAN, WING_CLASSES } from "./text";

export type Consequence = { text: string; tone: "culture" | "bone" | "faint" | "bad"; disabled: boolean; note: { title: string; text: string } | null };

const pickedUnits = (engine: Engine, state: DraftState, except?: number): Unit[] => state.rows.filter((r, i) => r.pick !== null && i !== except).map((r) => engine.data.unitById.get(r.cards[r.pick!].unitId)!);
const general = (engine: Engine, state: DraftState) => (state.generalIndex === null ? null : engine.data.generalById.get(state.generalPool[state.generalIndex])!);

/** The consequence line under card `card` of row `row` (v3 §4.1), with the note a tap opens. */
export function consequenceLine(engine: Engine, state: DraftState, row: number, card: number): Consequence {
  const s = engine.summarize(state);
  const r = state.rows[row];
  const unit = engine.data.unitById.get(r.cards[card].unitId)!;
  const rowPickUnit = r.pick === null ? null : engine.data.unitById.get(r.cards[r.pick].unitId)!;
  const [t1, t2] = engine.data.rules.traitThresholds;
  const c = unit.culture;
  const culture = cultureShort(engine, c).toUpperCase();
  const trait = traitDef(engine, cultureTraitId(engine, c));
  const g = general(engine, state);
  const generalLevels = g ? g.traits.filter((t) => t === trait.id).length : 0;
  const base = (s.cultureCounts[c] ?? 0) - (rowPickUnit && rowPickUnit.culture === c ? 1 : 0);
  const baseElite = s.eliteUsed - (rowPickUnit && isElite(rowPickUnit.grade) ? 1 : 0);
  const after = base + 1;
  const elite = isElite(unit.grade as Grade);
  const already = r.pick === card;
  const levelAt = (n: number) => Math.min(3, generalLevels + (n >= t2 ? 2 : n >= t1 ? 1 : 0));
  const word = (n: number) => `${trait.name.toUpperCase()}${levelAt(n) > 1 ? " " + ROMAN[levelAt(n)] : ""}`;
  const note = (title: string, text: string) => ({ title, text });
  if (elite && baseElite >= s.eliteCap && !already) return { text: "ELITE CAP FULL — DROP ONE TO TAKE THIS", tone: "bad", disabled: true, note: note("The elite cap", `You may field ${s.eliteCap} units of grade A or S. Unpick one to take this one.`) };
  if (after === t1) return { text: `${culture} ${t1} → ${word(t1)}`, tone: "culture", disabled: false, note: note(`${trait.name}, one unit away`, `${trait.text} This card wakes it; ${t2} of ${culture.charAt(0) + culture.slice(1).toLowerCase()} lift it a level.`) };
  if (after === t2) return { text: `${culture} ${t2} → ${word(t2)}`, tone: "culture", disabled: false, note: note(`${trait.name} ${ROMAN[levelAt(t2)]}`, `${trait.text} The sixth of a culture lifts its trait a level.`) };
  if (after === t1 - 1) return { text: `${culture} ${after} OF ${t1} · ONE MORE FOR ${trait.name.toUpperCase()}`, tone: "culture", disabled: false, note: note(`${trait.name}, one unit away`, `${trait.text} One more ${culture.charAt(0) + culture.slice(1).toLowerCase()} unit wakes it; six lift it to ${trait.name} II.`) };
  if (elite) return { text: `ELITE ${baseElite + 1} OF ${s.eliteCap} · ${culture} ${after} OF ${after < t1 ? t1 : t2}`, tone: "bone", disabled: false, note: note("An elite", `Grade A and S units are elites; you may field ${s.eliteCap}. ${culture.charAt(0) + culture.slice(1).toLowerCase()} at ${t1} wakes ${trait.name}: ${trait.text}`) };
  return { text: `${culture} ${after} OF ${t1} · ${t1 - after} MORE FOR ${trait.name.toUpperCase()}`, tone: "faint", disabled: false, note: note(trait.name, `${trait.text} ${culture.charAt(0) + culture.slice(1).toLowerCase()} at ${t1} units wakes it; the general counts as one.`) };
}

/** Which two stats a row makes loud (v3 §4.2), and why. A flex row reads the army without its own pick, so the pair holds still while you choose. */
export function loudStats(engine: Engine, state: DraftState, row: number): { keys: [StatKey, StatKey]; hint: string } {
  const slot = state.rows[row].slot;
  if (slot === "line") return { keys: ["melee", "discipline"], hint: "FIGHT and STEADY decide a line row. Tap a stat for what it means." };
  if (slot === "shock") return { keys: ["shock", "melee"], hint: "CHARGE and FIGHT decide a shock row. Tap a stat for what it means." };
  if (slot === "cavalry") return { keys: ["mobility", "melee"], hint: "SPEED and FIGHT decide a cavalry row. Tap a stat for what it means." };
  if (slot === "ranged") return { keys: ["ranged", "mobility"], hint: "SHOOT and SPEED decide a ranged row. Tap a stat for what it means." };
  const picked = pickedUnits(engine, state, row);
  const shooters = picked.filter((u) => u.class === "ranged" || u.stats.ranged >= 50).length;
  const wings = picked.filter((u) => WING_CLASSES.has(u.class) && u.class !== "ranged").length;
  const center = picked.filter((u) => !WING_CLASSES.has(u.class)).length;
  if (!shooters) return { keys: ["ranged", "mobility"], hint: "You have no shooters yet, so SHOOT and SPEED are loud here." };
  if (wings < 2) return { keys: ["mobility", "melee"], hint: "Your wings are thin, so SPEED and FIGHT are loud here." };
  if (center < 3) return { keys: ["melee", "discipline"], hint: "Your center is thin, so FIGHT and STEADY are loud here." };
  return { keys: ["shock", "melee"], hint: "The line is covered, so CHARGE and FIGHT are loud here." };
}

/** Per loud stat: the row's best value, for the tick and the delta caption. */
export function rowBest(engine: Engine, state: DraftState, row: number, key: StatKey): number {
  return Math.max(...state.rows[row].cards.map((c) => engine.data.unitById.get(c.unitId)!.stats[key]));
}

export interface TallyChip { id: string; name: string; level: number; state: "on" | "near" | "off"; caption: string; kind: "scaling" | "rule" }

/** Every trait with a source in this army (v3 §4.3): general copies + culture levels; on, one away, or off. */
export function traitTally(engine: Engine, state: DraftState): TallyChip[] {
  const g = general(engine, state);
  if (!g) return [];
  const s = engine.summarize(state);
  const [t1, t2] = engine.data.rules.traitThresholds;
  const map = new Map<string, { level: number; near: boolean; sources: string[] }>();
  const add = (id: string, level: number, near: boolean, src: string) => {
    const e = map.get(id) ?? { level: 0, near: false, sources: [] };
    e.level += level; e.near = e.near || near; e.sources.push(src); map.set(id, e);
  };
  for (const id of g.traits) add(id, 1, false, g.name.split(" ")[0]);
  const counts = Object.entries(s.cultureCounts).sort((a, b) => b[1] - a[1]);
  for (const [cid, n] of counts) {
    const id = cultureTraitId(engine, cid);
    const level = n >= t2 ? 2 : n >= t1 ? 1 : 0;
    const near = n === t1 - 1 || n === t2 - 1;
    const short = cultureShort(engine, cid);
    add(id, level, near, `${short} ${n} of ${n >= t1 ? t2 : t1}${near ? " · one more unit" : ""}`);
  }
  return [...map.entries()].map(([id, e]) => {
    const def = traitDef(engine, id);
    const level = def.kind === "rule" ? Math.min(1, e.level) : Math.min(3, e.level);
    const state: TallyChip["state"] = level >= 1 ? "on" : e.near ? "near" : "off";
    return { id, name: level > 1 ? `${def.name} ${ROMAN[level]}` : def.name, level, state, caption: e.sources.join(" · "), kind: def.kind };
  }).sort((a, b) => (a.state === b.state ? 0 : a.state === "on" ? -1 : b.state === "on" ? 1 : a.state === "near" ? -1 : 1));
}

/** The board sheet's subtitle: what the army still lacks. */
export function boardGap(engine: Engine, state: DraftState): string {
  const picked = pickedUnits(engine, state);
  const n = picked.length;
  const words = ["None", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight"];
  if (n === 8) return "Eight of eight. The army is raised.";
  const gaps: string[] = [];
  const has = (c: UnitClass) => picked.some((u) => u.class === c);
  if (!has("line") && !has("shock")) gaps.push("the center");
  if (!has("cavalry") && !has("skirmish") && !has("special")) gaps.push("the wings");
  if (!picked.some((u) => u.stats.ranged >= 50)) gaps.push("the shooting");
  const tally = traitTally(engine, state);
  if (!tally.some((t) => t.state === "on" && t.caption.includes(" of "))) gaps.push("the traits");
  return `${words[n]} of eight.${gaps.length ? ` The gap is ${gaps.length > 1 ? gaps.slice(0, -1).join(", ") + " and " + gaps[gaps.length - 1] : gaps[0]}.` : ""}`;
}
