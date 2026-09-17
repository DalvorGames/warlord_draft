// The battle as the player sees it: one beat per stage, narrated in the second person, from the records
// the resolver already produces (docs/ui-handoff/UI-HANDOFF.md §6). Pure; no numbers in the prose except
// cohesion fractions.

import type { BattleResult } from "./resolve.js";
import type { ContestRecord, RoundRecord, TraitEvent } from "./resolveFronts.js";
import type { Front, GameData, Side, TerrainName } from "./types.js";

export type BeatKind = "skirmish" | "contact" | "press" | "result";

export interface Beat {
  kind: BeatKind;
  /** Press round number; 0 otherwise. */
  round: number;
  /** Stage label for the UI: SKIRMISH, CONTACT, PRESS 3, RESULT. */
  label: string;
  /** The narration line, one or two sentences. */
  narration: string;
  /** One clause for the chronicle and the share card. */
  short: string;
  /** Contest records of this beat, roll-ups first, from the player's point of view (A = you). */
  contests: ContestRecord[];
  /** Raw events of the round (`A:L breaks`, `B routs`, …). */
  events: string[];
  moraleYou: number;
  moraleHim: number;
  /** Fronts that broke in this beat, by side. */
  broke: { you: Front[]; him: Front[] };
  /** True when either army routs in this beat. */
  routed: boolean;
  /** Traits that acted in this beat, from the player's point of view (side "A" = you). */
  traits: TraitEvent[];
  /** Key callouts: a trait, an event or a break, one line each (v3 §2 "Key beat"). */
  keys: KeyCallout[];
}

export interface KeyCallout {
  kind: "trait" | "event" | "break";
  /** `HAMMER AND ANVIL · HIS`, `DOWNPOUR`, `YOUR LEFT BROKE`. */
  label: string;
  text: string;
  /** Whose trait or front. */
  side: "you" | "him";
  trait?: string;
}

const FRONT: Record<Front, string> = { L: "left", C: "center", R: "right" };
const OPP: Record<Front, Front> = { L: "R", C: "C", R: "L" };
const FIFTHS = ["nothing", "a fifth", "two fifths", "three fifths", "four fifths", "all"];

function swap(c: ContestRecord): ContestRecord {
  return { ...c, frontA: c.frontB, frontB: c.frontA, scoreA: c.scoreB, scoreB: c.scoreA, winner: c.winner === "A" ? "B" : "A", damageA: c.damageB, damageB: c.damageA, topA: c.topB, topB: c.topA };
}
function swapEvent(ev: string): string {
  return ev.replace(/^([AB])/, (s) => (s === "A" ? "B" : "A"));
}

function unitName(c: ContestRecord, side: "A" | "B"): string {
  const t = side === "A" ? c.topA : c.topB;
  return t[0]?.name ?? (side === "A" ? "your troops" : "his troops");
}
function low(s: string): string {
  return s.charAt(0).toLowerCase() + s.slice(1);
}
function list(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

/** Parse `A:L breaks` style events into (side, front, what). */
function parseEvents(events: string[]): { side: Side; front: Front | null; what: string }[] {
  return events.map((ev) => {
    const m = ev.match(/^([AB])(?::([LCR]))? (.*)$/);
    return m ? { side: m[1] as Side, front: (m[2] as Front) ?? null, what: m[3] } : { side: "A", front: null, what: ev };
  });
}

/** Narrate a resolved fronts battle from `you`'s side. */
export function narrateBeats(r: BattleResult, you: Side = "A"): Beat[] {
  if (!r.rounds || !r.fronts) return [];
  const flip = you === "B";
  const flipSide = (x: Side): Side => (x === "A" ? "B" : "A");
  const rounds: RoundRecord[] = r.rounds.map((rd) =>
    flip ? { ...rd, contests: rd.contests.map(swap), events: rd.events.map(swapEvent), traits: (rd.traits ?? []).map((t) => ({ ...t, side: flipSide(t.side), frontSide: flipSide(t.frontSide) })), moraleA: rd.moraleB, moraleB: rd.moraleA } : { ...rd, traits: rd.traits ?? [] },
  );
  const terrain = r.terrain;
  const yourFronts = flip ? r.fronts.B : r.fronts.A;
  const hisFronts = flip ? r.fronts.A : r.fronts.B;
  const count = (side: "you" | "him", f: Front) => (side === "you" ? yourFronts : hisFronts).find((x) => x.front === f)!.unitIds.length;
  const youWon = r.winner === you;

  // Running front damage so a beat can say how close a front is to done.
  const dmg = { you: { L: 0, C: 0, R: 0 } as Record<Front, number>, him: { L: 0, C: 0, R: 0 } as Record<Front, number> };
  const thr = {
    you: Object.fromEntries(yourFronts.map((f) => [f.front, f.threshold])) as Record<Front, number>,
    him: Object.fromEntries(hisFronts.map((f) => [f.front, f.threshold])) as Record<Front, number>,
  };
  const broken = { you: new Set<Front>(), him: new Set<Front>() };
  const frac = (side: "you" | "him", f: Front) => (thr[side][f] > 0 ? Math.min(1, dmg[side][f] / thr[side][f]) : 0);

  const beats: Beat[] = [];
  let hisWingsGoneAt: string | null = null;
  let decisive: string | null = null;

  const applyRound = (rd: RoundRecord) => {
    for (const c of rd.contests) {
      dmg.you[c.frontA] += c.damageA;
      dmg.him[c.frontB] += c.damageB;
    }
    const brk = { you: [] as Front[], him: [] as Front[] };
    for (const e of parseEvents(rd.events)) {
      if (e.what === "breaks" && e.front) {
        const side = e.side === "A" ? "you" : "him";
        broken[side].add(e.front);
        brk[side].push(e.front);
      }
      if (e.what.startsWith("is empty") && e.front) {
        const side = e.side === "A" ? "you" : "him";
        broken[side].add(e.front);
        brk[side].push(e.front);
      }
    }
    return brk;
  };
  const routedIn = (rd: RoundRecord) => rd.events.some((ev) => ev.endsWith("routs"));

  // ----- Skirmish -----
  {
    const rd = rounds[0];
    const brk = applyRound(rd);
    const sk = rd.contests.filter((c) => c.stage === "skirmish");
    const wings = sk.filter((c) => c.frontA !== "C");
    const center = sk.find((c) => c.frontA === "C");
    let text: string;
    let short: string;
    if (!sk.length) {
      text = "Neither army brought anything to shoot with. The lines simply close.";
      short = "No missile exchange.";
    } else {
      const parts: string[] = [];
      const yourBest = [...wings].sort((a, b) => b.scoreA - a.scoreA)[0];
      if (yourBest && yourBest.scoreA > 0) {
        const silent = wings.filter((c) => c.scoreB === 0);
        const where = silent.length === wings.length && wings.length > 1 ? "both his wings and find nothing shooting back" : `his ${FRONT[OPP[yourBest.frontA]]}${yourBest.scoreB === 0 ? " and find nothing shooting back" : ""}`;
        parts.push(`Your ${unitName(yourBest, "A")} open on ${where}.`);
      } else {
        const hisBest = [...wings].sort((a, b) => b.scoreB - a.scoreB)[0];
        if (hisBest && hisBest.scoreB > 0) parts.push(`His ${unitName(hisBest, "B")} open on your ${FRONT[hisBest.frontA]}, and you have nothing to answer with.`);
      }
      if (center) {
        if (center.scoreB > center.scoreA) {
          parts.push(center.scoreA === 0 ? `In the center it runs the other way: his ${unitName(center, "B")} pour it into a line you brought no bows to.` : `In the center his ${unitName(center, "B")} have the better of the exchange.`);
        } else if (center.scoreA > 0) {
          parts.push(center.scoreB === 0 ? `In the center your ${unitName(center, "A")} shoot into a line that cannot shoot back.` : `In the center your ${unitName(center, "A")} answer.`);
        }
      }
      text = parts.join(" ");
      const best = [...sk].sort((a, b) => b.edge - a.edge)[0];
      short = best.edge < 0.1 ? "The missile exchange is even." : best.winner === "A" ? `Your ${(unitName(best, "A"))} win the exchange on the ${FRONT[best.frontA]}.` : `His ${(unitName(best, "B"))} win the exchange on the ${FRONT[best.frontB]}.`;
    }
    beats.push({ kind: "skirmish", round: 0, label: "SKIRMISH", narration: text, short, contests: sk, events: rd.events, moraleYou: rd.moraleA, moraleHim: rd.moraleB, broke: brk, routed: routedIn(rd), traits: rd.traits, keys: keysFor(rd, brk, terrain) });
  }

  // ----- Contact -----
  const ctIdx = rounds.findIndex((rd, i) => i > 0 && rd.round === 0);
  if (ctIdx > 0) {
    const rd = rounds[ctIdx];
    const brk = applyRound(rd);
    const ct = rd.contests.filter((c) => c.stage === "contact");
    const bits: string[] = [];
    for (const f of ["L", "R"] as Front[]) {
      const c = ct.find((x) => x.frontA === f);
      if (c) bits.push(`${c.winner === "A" ? "your" : "his"} ${(unitName(c, c.winner))} ${c.edge < 0.1 ? "hold" : c.edge > 0.3 ? "carry" : "win"} the ${FRONT[f]}`);
      else if (brk.him.includes(OPP[f])) bits.push(`his ${FRONT[OPP[f]]} is empty and gives way`);
      else if (brk.you.includes(f)) bits.push(`your ${FRONT[f]} is empty and gives way at once`);
    }
    const cc = ct.find((x) => x.frontA === "C");
    if (cc) bits.push(cc.edge < 0.1 ? "the centers come out almost even" : `in the center ${cc.winner === "A" ? "your" : "his"} ${(unitName(cc, cc.winner))} have it by ${cc.edge > 0.3 ? "a lot" : "a little"}`);
    else if (brk.him.includes("C")) bits.push("his center is empty and gives way");
    else if (brk.you.includes("C")) bits.push("your center is empty and gives way");
    const shaken: string[] = [];
    for (const f of yourFronts) if (f.shaken) shaken.push(`your ${FRONT[f.front]}`);
    for (const f of hisFronts) if (f.shaken) shaken.push(`his ${FRONT[f.front]}`);
    const notes = ct.filter((c) => c.note?.includes("rampage")).map((c) => `${c.winner === "A" ? "His" : "Your"} elephants panic and trample their own ${FRONT[c.winner === "A" ? c.frontB : c.frontA]}.`);
    let text = `The lines meet${bits.length ? ": " + list(bits) : ""}. ${shaken.length ? `${list(shaken).replace(/^./, (s) => s.toUpperCase())} ${shaken.length > 1 ? "are" : "is"} shaken.` : "Nobody is shaken."}`;
    if (notes.length) text += " " + notes.join(" ");
    const won = ct.filter((c) => c.winner === "A" && c.edge >= 0.1).length, lost = ct.filter((c) => c.winner === "B" && c.edge >= 0.1).length;
    const short = ct.length === 0 ? "No contact." : won === ct.length ? `You won ${ct.length === 3 ? "all three" : ct.length === 2 ? "both" : "the only"} clash${ct.length > 1 ? "es" : ""}${shaken.some((s) => s.startsWith("his")) ? "" : ", none by enough to shake him"}.` : lost === ct.length ? "He won every clash." : won > lost ? "You had the better of contact." : lost > won ? "He had the better of contact." : "Contact came out even.";
    beats.push({ kind: "contact", round: 0, label: "CLASH", narration: text, short, contests: ct, events: rd.events, moraleYou: rd.moraleA, moraleHim: rd.moraleB, broke: brk, routed: routedIn(rd), traits: rd.traits, keys: keysFor(rd, brk, terrain) });
  }

  // ----- Press rounds -----
  for (const rd of rounds.filter((x) => x.round >= 1)) {
    const brk = applyRound(rd);
    const rollups = rd.contests.filter((c) => c.stage === "rollup");
    const press = rd.contests.filter((c) => c.stage === "press");
    const sentences: string[] = [];

    // Roll-ups first: they set up the round.
    for (const c of rollups) {
      const mine = c.note!.startsWith(you);
      if (mine) sentences.push(c.edge > 0 ? `Your ${(unitName(c, "A"))} wheel into his ${FRONT[c.frontB]} and land.` : `Your ${(unitName(c, "A"))} wheel into his ${FRONT[c.frontB]} and are held, but he is marked flanked.`);
      else sentences.push(c.edge > 0 ? `His ${(unitName(c, "B"))} wheel into your ${FRONT[c.frontA]} and land.` : `His ${(unitName(c, "B"))} wheel into your ${FRONT[c.frontA]} and are held.`);
    }
    // Lead with the biggest edge.
    const lead = [...press].sort((a, b) => b.edge - a.edge)[0];
    if (lead) {
      if (lead.frontA === "C") {
        const n = count("you", "C"), m = count("him", "C");
        if (lead.edge < 0.08) sentences.push("In the center the lines grind and neither gives.");
        else if (lead.winner === "A") sentences.push(n > m ? `${cap(num(n))} against ${num(m)} in the center starts to tell, and his ${(unitName(lead, "B"))} give ground.` : `In the center your ${(unitName(lead, "A"))} push his ${(unitName(lead, "B"))} back.`);
        else sentences.push(m > n ? `${cap(num(m))} against ${num(n)} in the center starts to tell, and your ${(unitName(lead, "A"))} give ground.` : `In the center his ${(unitName(lead, "B"))} push your ${(unitName(lead, "A"))} back.`);
      } else {
        const wingsWon = press.filter((c) => c.frontA !== "C" && c.winner === "A").length;
        const wingsFought = press.filter((c) => c.frontA !== "C").length;
        if (wingsFought > 1 && wingsWon === wingsFought) sentences.push(`Out on the wings your ${(unitName(lead, "A"))} are winning${lead.edge < 0.2 ? ", slowly" : ""}.`);
        else if (wingsFought > 1 && wingsWon === 0) sentences.push(`Out on the wings his ${(unitName(lead, "B"))} are winning${lead.edge < 0.2 ? ", slowly" : ""}.`);
        else sentences.push(lead.winner === "A" ? `On the ${FRONT[lead.frontA]} your ${(unitName(lead, "A"))} have the better of his ${(unitName(lead, "B"))}.` : `On the ${FRONT[lead.frontA]} his ${(unitName(lead, "B"))} have the better of your ${(unitName(lead, "A"))}.`);
      }
    }
    // Breaks.
    const hisWings = brk.him.filter((f) => f !== "C");
    if (hisWings.length === 2) {
      sentences.push(`Both his wings go in the same round, and your wings are free.`);
      hisWingsGoneAt ??= `press ${rd.round}`;
    } else if (hisWings.length === 1) {
      sentences.push(`His ${FRONT[hisWings[0]]} goes, and your ${FRONT[OPP[hisWings[0]]]} is free.`);
      if (broken.him.has("L") && broken.him.has("R")) hisWingsGoneAt ??= `press ${rd.round}`;
    }
    if (brk.him.includes("C")) sentences.push(rollups.some((c) => c.note!.startsWith(you)) ? `Carrying ${list(["L", "R"].filter((f) => broken.him.has(f as Front)).map((f) => `a broken ${FRONT[f as Front]}`))}${rollups.length ? " and the flank marks" : ""}, his center folds.` : "His center folds.");
    const yourWings = brk.you.filter((f) => f !== "C");
    if (yourWings.length === 2) sentences.push("Both your wings go in the same round, and his are free.");
    else if (yourWings.length === 1) sentences.push(`Your ${FRONT[yourWings[0]]} goes, and his ${FRONT[OPP[yourWings[0]]]} is free.`);
    if (brk.you.includes("C")) sentences.push("Your center folds.");
    // Rout or closing line.
    if (rd.events.includes("B routs")) sentences.push("His army routs.");
    else if (rd.events.includes("A routs")) sentences.push("Your army routs.");
    else if (!brk.him.length && !brk.you.length) {
      // Close with the front nearest its threshold.
      const cands: { side: "you" | "him"; f: Front; v: number }[] = [];
      for (const f of ["L", "C", "R"] as Front[]) {
        if (!broken.him.has(f) && count("him", f)) cands.push({ side: "him", f, v: frac("him", f) });
        if (!broken.you.has(f) && count("you", f)) cands.push({ side: "you", f, v: frac("you", f) });
      }
      const near = cands.sort((a, b) => b.v - a.v)[0];
      if (near && near.v >= 0.7) sentences.push(near.side === "him" ? `His ${FRONT[near.f]} is close to done.` : `Your ${FRONT[near.f]} is close to done.`);
    } else if (!broken.you.has("C") && count("you", "C")) {
      const fifths = Math.max(0, Math.min(5, Math.round((1 - frac("you", "C")) * 5)));
      sentences.push(`Your center is at ${FIFTHS[fifths]} of its cohesion, and holding.`);
    }
    const narration = sentences.join(" ");
    let short: string;
    if (rd.events.includes("B routs")) { short = rollups.length ? "Your wings wheeled inward, and his center folded." : hisWings.length === 2 ? "Both his wings broke and the army routed." : "His army routed."; decisive = short; }
    else if (rd.events.includes("A routs")) { short = brk.you.includes("C") ? "Your center folded and the army went with it." : "Your army routed."; decisive = short; }
    else if (hisWings.length === 2) { short = "Both his wings broke in the same round."; decisive = short; }
    else if (brk.him.length) { short = `His ${list(brk.him.map((f) => FRONT[f]))} broke.`; decisive ??= short; }
    else if (brk.you.length) { short = `Your ${list(brk.you.map((f) => FRONT[f]))} broke.`; decisive ??= short; }
    else if (rollups.length) short = rollups.some((c) => c.note!.startsWith(you)) ? "Your free wing wheeled into his center." : "His free wing wheeled into your center.";
    else if (lead) short = lead.edge < 0.08 ? "The lines ground on, even." : `${lead.winner === "A" ? "You" : "He"} gained on the ${FRONT[lead.frontA]}.`;
    else short = "Nothing moved.";
    beats.push({ kind: "press", round: rd.round, label: `PRESS ${rd.round}`, narration, short, contests: [...rollups, ...press], events: rd.events, moraleYou: rd.moraleA, moraleHim: rd.moraleB, broke: brk, routed: routedIn(rd), traits: rd.traits, keys: keysFor(rd, brk, terrain) });
  }

  // ----- Result -----
  const last = rounds[rounds.length - 1];
  const hisCenterBroke = broken.him.has("C"), yourCenterBroke = broken.you.has("C");
  const routed = r.brokeInPhase !== "break";
  let headline: string;
  if (youWon) {
    if (routed && hisCenterBroke && broken.him.has("L") && broken.him.has("R")) headline = "Both wings came back in, and his center had nothing left to turn to.";
    else if (routed && hisCenterBroke) headline = "His center gave way and took the army with it.";
    else if (routed) headline = "His wings went, and the rest would not stand.";
    else headline = yourCenterBroke ? "Your center broke, but the wings won the day." : "Neither line broke. His had less left in it.";
  } else {
    if (routed && yourCenterBroke && broken.you.has("L") && broken.you.has("R")) headline = "His wings came in on your center, and it had nothing left.";
    else if (routed && yourCenterBroke) headline = "Your center gave way, and the army went with it.";
    else if (routed) headline = "Your wings went, and the line would not stand alone.";
    else headline = hisCenterBroke ? "His center broke, but his wings won the day." : "Neither line broke. Yours had less left in it.";
  }
  const endedAt = r.brokeInPhase === "break" ? "the reckoning" : r.brokeInPhase;
  const short = youWon ? `${routed ? "Routed him at" : "Won on"} ${endedAt}.` : `${routed ? "Routed at" : "Lost on"} ${endedAt}.`;
  beats.push({ kind: "result", round: 0, label: "RESULT", narration: headline, short, contests: [], events: [], moraleYou: last.moraleA, moraleHim: last.moraleB, broke: { you: [], him: [] }, routed, traits: [], keys: [] });
  void hisWingsGoneAt; void decisive;
  return beats;
}

/** The share card's decisive clause: the beat that settled it. */
export function decisiveClause(beats: Beat[]): string {
  const press = beats.filter((b) => b.kind === "press");
  const withBreak = press.filter((b) => b.broke.him.length || b.broke.you.length);
  const b = withBreak[0] ?? press[press.length - 1] ?? beats[0];
  if (!b) return "";
  const clause = low(b.short.replace(/\.$/, ""));
  return b.kind === "press" ? `${clause} by ${b.label.toLowerCase()}` : clause;
}

const NUMS = ["none", "one", "two", "three", "four", "five", "six", "seven", "eight"];
function num(n: number): string {
  return NUMS[n] ?? String(n);
}
function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}


// ---------- key callouts (v3 §6) ----------

const FRONT_CAP: Record<Front, string> = { L: "Left", C: "Center", R: "Right" };
const TRAIT_WORD: Record<string, string> = {
  deep_ranks: "Deep ranks", steady: "Steady", hammer_and_anvil: "Hammer and anvil", numbers: "Numbers", mercenary_captain: "Mercenary captain",
  volley: "Volley", harass: "Harass", terror: "Terror", furor: "Furor", furor_spent: "Furor", envelopment: "Envelopment", oblique_order: "Oblique order",
  delayer: "Delayer", rally: "Rally", master_of_ground: "Master of ground", scouts: "Scouts",
};
export const traitWord = (id: string) => TRAIT_WORD[id] ?? id;

/** The sentence for a trait acting, in the second person. */
export function traitSentence(t: TraitEvent, terrain: TerrainName): string {
  const mine = t.side === "A";
  const own = mine ? "your" : "his";
  const Own = mine ? "Your" : "His";
  const f = t.front ? FRONT[t.front] : "line";
  const units = list(t.units.slice(0, 2));
  const ownFront = t.frontSide === "A" ? "Your" : "His";
  switch (t.trait) {
    case "deep_ranks": return `Fresh ranks step up in the ${f}: ${own} line recovers a little.`;
    case "steady": return `${Own} ${f} takes it and stands. Steady.`;
    case "hammer_and_anvil": return `${Own} ${f} wheels in. Hammer and anvil: ${units} turn into the center, and ${list((t.targets ?? []).slice(0, 2)) || "the line"} take them on the flank.`;
    case "numbers": return `Weight of numbers tells in the ${f}: ${num(t.n ?? 0)} against ${num(t.m ?? 0)}.`;
    case "mercenary_captain": return `${cap(units)} fight the harder for their pay.`;
    case "volley": return `${cap(units)} pour it into the line: Volley.`;
    case "harass": return `On the wings ${units} shoot and shoot again: Harass.`;
    case "terror": return `${ownFront} ${f} is shaken sooner than it should be. Terror.`;
    case "furor": return `${cap(units) || (mine ? "Your line" : "His line")} hit like a wave: Furor.`;
    case "furor_spent": return `The fury is spent; ${units || (mine ? "your men" : "his men")} press weaker.`;
    case "envelopment": return `${Own} ${f} presses harder. Envelopment.`;
    case "oblique_order": return `The loaded ${f} hits harder at the clash. Oblique order.`;
    case "delayer": return `${Own} ${f} should have gone. Delayer: nothing breaks before the second round.`;
    case "rally": return `${Own} ${f} breaks, and holds. Rally: one more stage, shaken.`;
    case "master_of_ground": return `${cap(terrain)} costs ${units} half what it should. Master of ground.`;
    default: return `${traitWord(t.trait)}.`;
  }
}

function keysFor(rd: RoundRecord, brk: { you: Front[]; him: Front[] }, terrain: TerrainName): KeyCallout[] {
  const keys: KeyCallout[] = [];
  for (const t of rd.traits ?? []) {
    const side = t.side === "A" ? "you" : "him";
    keys.push({ kind: "trait", label: `${traitWord(t.trait).toUpperCase()} · ${side === "you" ? "YOURS" : "HIS"}`, text: traitSentence(t, terrain), side, trait: t.trait });
  }
  for (const c of rd.contests) {
    if (c.note === "downpour" && !keys.some((k) => k.label === "DOWNPOUR")) keys.push({ kind: "event", label: "DOWNPOUR", text: "A downpour: the arrows fall short.", side: "you" });
    if (c.note === "flank collapses") {
      const loserYou = c.winner === "B";
      keys.push({ kind: "event", label: "FLANK COLLAPSE", text: `${loserYou ? "Your" : "His"} ${FRONT[loserYou ? c.frontA : c.frontB]} gives way at the first shock, as at Cannae.`, side: loserYou ? "you" : "him" });
    }
  }
  for (const e of parseEvents(rd.events)) {
    if (e.what.startsWith("pursues") && e.front) {
      const you = e.side === "A";
      keys.push({ kind: "event", label: "PURSUIT", text: `${you ? "Your" : "His"} ${FRONT[e.front]} rides down the broken and leaves the field. The wing is free but empty.`, side: you ? "you" : "him" });
    }
  }
  for (const f of brk.you) keys.push({ kind: "break", label: `YOUR ${FRONT_CAP[f].toUpperCase()} BROKE`, text: f === "C" ? "The center goes, and the line has nothing to turn to." : `His ${FRONT[OPP[f]]} is free.`, side: "you" });
  for (const f of brk.him) keys.push({ kind: "break", label: `HIS ${FRONT_CAP[f].toUpperCase()} BROKE`, text: f === "C" ? "His center folds." : `Your ${FRONT[OPP[f]]} is free.`, side: "him" });
  if (rd.events.includes("A routs")) keys.push({ kind: "break", label: "YOUR ARMY ROUTS", text: "The line will not stand.", side: "you" });
  if (rd.events.includes("B routs")) keys.push({ kind: "break", label: "HIS ARMY ROUTS", text: "His line will not stand.", side: "him" });
  return keys;
}

// ---------- strength, the turning point and the reveal (v3 §4.5, §6) ----------

export type StrengthWord = "FIRM" | "STEADY" | "BRITTLE" | "ROUTED";
/** Strength as shown: 1 − morale / routLevel, worded. Display only; the engine value is untouched. */
export function strength(morale: number, routLevel: number): { value: number; word: StrengthWord } {
  const value = Math.max(0, Math.min(1, 1 - morale / routLevel));
  const word: StrengthWord = value >= 0.67 ? "FIRM" : value >= 0.34 ? "STEADY" : value > 0 ? "BRITTLE" : "ROUTED";
  return { value, word };
}

const ROUND_WORD = ["", "one", "two", "three", "four", "five"];

/**
 * The turning point of a loss: the last beat with a break or a wheel-in on the player's side, in one or two
 * sentences, past tense, the unit named, and the trait that acted if one did.
 */
export function turningPoint(beats: Beat[]): { text: string; beat: Beat | null; trait: string | null } {
  const cands = beats.filter((b) => b.kind !== "result" && (b.broke.you.length || b.contests.some((c) => c.stage === "rollup" && !c.note?.startsWith("A"))));
  const b = cands[cands.length - 1] ?? null;
  if (!b) {
    const last = beats[beats.length - 1];
    return { text: `Neither line broke. Yours had less left in it: the line took the most and never recovered.`, beat: last, trait: null };
  }
  const when = b.kind === "press" ? `in round ${ROUND_WORD[b.round] ?? b.round}` : b.kind === "contact" ? "at the clash" : "in the skirmish";
  const parts: string[] = [];
  if (b.broke.you.length) parts.push(`Your ${list(b.broke.you.map((f) => FRONT[f]))} broke ${when}.`);
  const wheel = b.contests.find((c) => c.stage === "rollup" && !c.note?.startsWith("A"));
  if (wheel) parts.push(`His ${unitName(wheel, "B")} wheeled into your ${FRONT[wheel.frontA]}, and the line had nothing left.`);
  else if (b.routed && b.events.includes("A routs")) parts.push("The army went with it.");
  else if (b.broke.you.includes("C")) parts.push("The center was the line; without it the wings were alone.");
  const his = b.keys.find((k) => k.kind === "trait" && k.side === "him");
  return { text: parts.join(" "), beat: b, trait: his?.trait ?? null };
}

/** One sentence on why the reveal teaches what it does (never what to do instead). */
export function whyLine(data: GameData, r: BattleResult, beats: Beat[], you: Side = "A"): string {
  const him: Side = you === "A" ? "B" : "A";
  const mine = r.fronts![you], his = r.fronts![him];
  const units = (ids: string[]) => ids.map((id) => data.unitById.get(id)!);
  const opp: Record<Front, Front> = OPP;
  const youWon = r.winner === you;
  const brokeYou = mine.filter((f) => f.broken && f.unitIds.length);
  const brokeHim = his.filter((f) => f.broken && f.unitIds.length);
  const focus = youWon ? brokeHim[0] ?? null : brokeYou[0] ?? null;
  if (!youWon && focus) {
    const own = units(focus.unitIds), theirs = units(his.find((f) => f.front === opp[focus.front])!.unitIds);
    const shooters = own.filter((u) => u.class === "ranged" || u.class === "skirmish" || u.stats.ranged >= 50).length;
    const holders = own.filter((u) => u.class === "line" || u.class === "shock").length;
    const horse = theirs.filter((u) => u.class === "cavalry" && u.stats.shock >= 60).length;
    if (focus.front !== "C" && shooters >= Math.ceil(own.length / 2) && !holders) return `${cap(num(shooters))} shooter${shooters > 1 ? "s" : ""} on your ${FRONT[focus.front]} met ${theirs.length ? list(theirs.slice(0, 2).map((u) => u.name.replace(/\s*\(.*\)/, ""))) : "his line"}. A wing that shoots and cannot hold is a wing he can carry.`;
    if (own.length < theirs.length) return `${cap(num(own.length))} against ${num(theirs.length)} on your ${FRONT[focus.front]}: it was never going to hold.`;
    if (horse && holders === 0) return `${cap(num(horse))} heavy horse against a ${FRONT[focus.front]} with nothing to hold them.`;
    if (focus.front === "C") return "The center is where the line lives. When it goes, the wings are alone.";
    return `Your ${FRONT[focus.front]} was the thinnest place in the line, and he found it.`;
  }
  if (youWon && focus) {
    const own = units(mine.find((f) => f.front === opp[focus.front])!.unitIds), theirs = units(focus.unitIds);
    if (own.length > theirs.length) return `${cap(num(own.length))} against ${num(theirs.length)} on his ${FRONT[focus.front]}: weight where it counted.`;
    return `His ${FRONT[focus.front]} was the thinnest place in his line, and you found it.`;
  }
  const shape = (fs: typeof mine) => fs.map((f) => f.unitIds.length).join(" · ");
  return youWon ? `Neither line broke. His shape was ${shape(his)} against your ${shape(mine)}; yours had more left.` : `Neither line broke. His shape was ${shape(his)} against your ${shape(mine)}; his had more left.`;
}
