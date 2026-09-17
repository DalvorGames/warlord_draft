// Aggregates batch records into the HANDOFF §6 report and the Phase 0 acceptance checks.

import type { GameData, Grade, Side } from "../types.js";
import type { BattleRecord, SideRecord } from "./run.js";

interface Tally { n: number; w: number }
const tally = () => ({ n: 0, w: 0 });
const add = (t: Tally, won: boolean) => { t.n++; if (won) t.w++; };
const wr = (t: Tally) => (t.n ? t.w / t.n : NaN);
const pct = (x: number) => (Number.isNaN(x) ? "  n/a" : (x * 100).toFixed(1).padStart(5));
const ORDER: Grade[] = ["S", "A", "B", "C", "D", "F"];

/** `gradeWr` is the unit's expected win rate: the mean win rate of same-grade units in the same slot kinds it appeared in. */
export interface UnitRow { unitId: string; name: string; culture: string; class: string; grade: Grade; cost: number; n: number; wr: number; gradeWr: number; delta: number; flag: boolean }
export interface Report {
  n: number;
  drafter: string;
  brokeIn: Record<string, number>;
  earlyRoutRate: number;
  routRate: number;
  eventRate: number;
  upset: { n: number; heavierWins: number };
  units: UnitRow[];
  gradeWr: Record<Grade, Tally>;
  generals: { id: string; name: string; culture: string; n: number; wr: number }[];
  traits: { culture: string; name: string; level: number; n: number; wr: number; wrNoTraits: number | null; lift: number | null }[];
  cultures: { culture: string; n: number; wr: number }[];
  plans: { plan: string; n: number; wr: number }[];
  terrain: { terrain: string; cavHeavyN: number; cavHeavyWr: number; otherWr: number }[];
  offSlot: { unitClass: string; slot: string; n: number; wr: number; onClassWr: number }[];
  eliteCount: { elites: number; n: number; wr: number }[];
  wrecked: { n: number; wr: number };
  /** fronts model */
  centerSize?: { size: number; n: number; wr: number }[];
  shooters?: { shooters: number; n: number; wr: number }[];
  generalDeaths?: number;
  centerBreaks?: number;
  acceptance: { name: string; pass: boolean; detail: string }[];
}

export function buildReport(data: GameData, recs: BattleRecord[], drafter: string): Report {
  const unitT = new Map<string, Tally>();
  const unitSlots = new Map<string, Map<string, number>>(); // unitId → slot kind → appearances
  const gradeT: Record<Grade, Tally> = { S: tally(), A: tally(), B: tally(), C: tally(), D: tally(), F: tally() };
  const gradeSlotT = new Map<string, Tally>(); // `${grade}|${slot}` → tally, the per-slot baseline
  const genT = new Map<string, Tally>();
  const traitT = new Map<string, { on: Tally; off: Tally }>();
  const cultureT = new Map<string, Tally>();
  const planT = new Map<string, Tally>();
  const terrainT = new Map<string, { cav: Tally; other: Tally }>();
  const offT = new Map<string, Tally>();
  const onT = new Map<string, Tally>();
  const eliteT = new Map<number, Tally>();
  const wreckedT = tally();
  const centerT = new Map<number, Tally>();
  const shootT = new Map<number, Tally>();
  let generalDeaths = 0, centerBreaks = 0;
  const brokeIn: Record<string, number> = {};
  let events = 0;
  const upset = { n: 0, heavierWins: 0 };

  const sides = (r: BattleRecord): [SideRecord, Side][] => [[r.A, "A"], [r.B, "B"]];
  for (const r of recs) {
    brokeIn[r.brokeInPhase] = (brokeIn[r.brokeInPhase] ?? 0) + 1;
    if (r.event) events++;
    const heavier = r.A.totalCost >= r.B.totalCost * 1.2 ? "A" : r.B.totalCost >= r.A.totalCost * 1.2 ? "B" : null;
    if (heavier) { upset.n++; if (r.winner === heavier) upset.heavierWins++; }
    for (const [s, side] of sides(r)) {
      const won = r.winner === side;
      // units: count on-class appearances only (off-class placements are measured separately below),
      // so a unit's number says how good the unit is, not how often bots misplace it.
      for (const u of s.units) {
        const key = `${u.class}→${u.slot}`;
        if (u.onClass || u.slot === "flex") {
          if (!unitT.has(u.unitId)) unitT.set(u.unitId, tally());
          add(unitT.get(u.unitId)!, won);
          add(gradeT[u.grade as Grade], won);
          const gs = `${u.grade}|${u.slot}`;
          if (!gradeSlotT.has(gs)) gradeSlotT.set(gs, tally());
          add(gradeSlotT.get(gs)!, won);
          if (!unitSlots.has(u.unitId)) unitSlots.set(u.unitId, new Map());
          const us = unitSlots.get(u.unitId)!;
          us.set(u.slot, (us.get(u.slot) ?? 0) + 1);
          if (!onT.has(u.slot)) onT.set(u.slot, tally()); add(onT.get(u.slot)!, won);
        } else { if (!offT.has(key)) offT.set(key, tally()); add(offT.get(key)!, won); }
      }
      if (!genT.has(s.generalId)) genT.set(s.generalId, tally());
      add(genT.get(s.generalId)!, won);
      if (!cultureT.has(s.culture)) cultureT.set(s.culture, tally());
      add(cultureT.get(s.culture)!, won);
      for (const [c, lvl] of Object.entries(s.traits)) {
        const key = `${c}:${lvl}`;
        if (!traitT.has(key)) traitT.set(key, { on: tally(), off: tally() });
        add(traitT.get(key)!.on, won);
        if (r.winnerNoTraits) add(traitT.get(key)!.off, r.winnerNoTraits === side);
      }
      if (!planT.has(s.plan)) planT.set(s.plan, tally());
      add(planT.get(s.plan)!, won);
      if (!terrainT.has(r.terrain)) terrainT.set(r.terrain, { cav: tally(), other: tally() });
      add(s.cavCount >= 3 ? terrainT.get(r.terrain)!.cav : terrainT.get(r.terrain)!.other, won);
      if (!eliteT.has(s.eliteCount)) eliteT.set(s.eliteCount, tally());
      add(eliteT.get(s.eliteCount)!, won);
      if (s.startsShaken) add(wreckedT, won);
      if (s.deployment) {
        if (!centerT.has(s.deployment.C)) centerT.set(s.deployment.C, tally());
        add(centerT.get(s.deployment.C)!, won);
        if (!shootT.has(s.shooters!)) shootT.set(s.shooters!, tally());
        add(shootT.get(s.shooters!)!, won);
        if (s.centerBroke) centerBreaks++;
        if (s.generalFell) generalDeaths++;
      }
    }
  }

  const units: UnitRow[] = data.units.map((u) => {
    const t = unitT.get(u.id) ?? tally();
    // Expected win rate: same-grade units in the same slot kinds, weighted by where this unit appeared.
    let g = NaN;
    if (t.n) {
      let acc = 0;
      for (const [slot, k] of unitSlots.get(u.id)!) acc += k * wr(gradeSlotT.get(`${u.grade}|${slot}`)!);
      g = acc / t.n;
    }
    const w = wr(t);
    const delta = w - g;
    return { unitId: u.id, name: u.name, culture: u.culture, class: u.class, grade: u.grade, cost: u.cost, n: t.n, wr: w, gradeWr: g, delta, flag: t.n >= 100 && Math.abs(delta) > 0.05 };
  }).sort((a, b) => ORDER.indexOf(a.grade) - ORDER.indexOf(b.grade) || b.delta - a.delta);

  const traits = [...traitT.entries()].map(([key, t]) => {
    const [culture, lvl] = key.split(":");
    const off = t.off.n ? wr(t.off) : null;
    return { culture, name: data.cultures[culture].trait, level: Number(lvl), n: t.on.n, wr: wr(t.on), wrNoTraits: off, lift: off === null ? null : wr(t.on) - off };
  }).sort((a, b) => a.culture.localeCompare(b.culture) || a.level - b.level);

  const terrain = [...terrainT.entries()].map(([terrain, t]) => ({ terrain, cavHeavyN: t.cav.n, cavHeavyWr: wr(t.cav), otherWr: wr(t.other) }));
  const offSlot = [...offT.entries()].map(([key, t]) => {
    const [unitClass, slot] = key.split("→");
    return { unitClass, slot, n: t.n, wr: wr(t), onClassWr: wr(onT.get(slot) ?? tally()) };
  }).sort((a, b) => a.slot.localeCompare(b.slot) || a.unitClass.localeCompare(b.unitClass));

  const n = recs.length;
  const early = ((brokeIn.skirmish ?? 0) + (brokeIn.charge ?? 0) + (brokeIn.contact ?? 0)) / n;
  const rout = 1 - (brokeIn.break ?? 0) / n;
  const worstUnit = units.filter((u) => u.n >= 100).reduce((m, u) => Math.max(m, Math.abs(u.delta)), 0);
  const worstTrait = traits.filter((t) => t.lift !== null && t.n >= 100).reduce((m, t) => Math.max(m, Math.abs((t.lift ?? 0) - 0.05)), 0);
  const plains = terrain.find((t) => t.terrain === "plains"), hills = terrain.find((t) => t.terrain === "hills");
  const cavTerrainDelta = plains && hills ? plains.cavHeavyWr - hills.cavHeavyWr : NaN;
  const offLoses = offSlot.filter((o) => o.n >= 100).every((o) => o.wr < o.onClassWr);
  const acceptance = [
    { name: "(a) no unit > 8 pts off expected (same grade, same slot kind)", pass: worstUnit <= 0.08, detail: `worst unit delta ${(worstUnit * 100).toFixed(1)} pts` },
    { name: "(a) trait lift within 8 pts of +5 (L1 target +4..+6)", pass: worstTrait <= 0.08, detail: traits.some((t) => t.lift !== null) ? `worst trait |lift−5| = ${(worstTrait * 100).toFixed(1)} pts` : "run with --trait-toggle to measure" },
    { name: "(b) cavalry-heavy armies ≥ 5 pts better on plains than hills", pass: cavTerrainDelta >= 0.05, detail: `plains − hills = ${(cavTerrainDelta * 100).toFixed(1)} pts` },
    { name: "(c) early routs (skirmish/charge) in 10–25%", pass: early >= 0.10 && early <= 0.25, detail: `${(early * 100).toFixed(1)}% early, ${(rout * 100).toFixed(1)}% rout before the break check` },
    { name: "(d) every off-class placement loses to on-class", pass: offLoses, detail: offSlot.filter((o) => o.n >= 100 && o.wr >= o.onClassWr).map((o) => `${o.unitClass}→${o.slot}`).join(", ") || "all lose" },
    { name: "(§6.5) heavier army (≥20% cost) wins 75–80%", pass: upset.n > 0 && upset.heavierWins / upset.n >= 0.7 && upset.heavierWins / upset.n <= 0.85, detail: upset.n ? `${((upset.heavierWins / upset.n) * 100).toFixed(1)}% over ${upset.n} battles` : "no such battles" },
  ];

  return {
    n, drafter, brokeIn, earlyRoutRate: early, routRate: rout, eventRate: events / n, upset, units, gradeWr: gradeT,
    generals: data.generals.map((g) => ({ id: g.id, name: g.name, culture: g.culture, n: genT.get(g.id)?.n ?? 0, wr: wr(genT.get(g.id) ?? tally()) })).sort((a, b) => b.wr - a.wr),
    traits,
    cultures: [...cultureT.entries()].map(([culture, t]) => ({ culture, n: t.n, wr: wr(t) })).sort((a, b) => b.wr - a.wr),
    plans: [...planT.entries()].map(([plan, t]) => ({ plan, n: t.n, wr: wr(t) })).sort((a, b) => b.wr - a.wr),
    terrain, offSlot,
    eliteCount: [...eliteT.entries()].map(([elites, t]) => ({ elites, n: t.n, wr: wr(t) })).sort((a, b) => a.elites - b.elites),
    wrecked: { n: wreckedT.n, wr: wr(wreckedT) },
    centerSize: centerT.size ? [...centerT.entries()].map(([size, t]) => ({ size, n: t.n, wr: wr(t) })).sort((a, b) => a.size - b.size) : undefined,
    shooters: shootT.size ? [...shootT.entries()].map(([shooters, t]) => ({ shooters, n: t.n, wr: wr(t) })).sort((a, b) => a.shooters - b.shooters) : undefined,
    generalDeaths: centerT.size ? generalDeaths : undefined,
    centerBreaks: centerT.size ? centerBreaks : undefined,
    acceptance,
  };
}

export function formatReport(r: Report, opts: { units?: "flagged" | "all" } = {}): string {
  const L: string[] = [];
  L.push(`# Batch report — ${r.n} battles, drafter=${r.drafter}`);
  L.push("");
  L.push("## Outcome shape");
  const phases = Object.keys(r.brokeIn).sort((a, b) => (b === "break" ? -1 : a === "break" ? 1 : a.localeCompare(b)));
  L.push("brokeIn: " + phases.map((p) => `${p} ${pct((r.brokeIn[p] ?? 0) / r.n)}%`).join(" | "));
  if (r.centerSize) {
    L.push(`center breaks ${pct(r.centerBreaks! / (2 * r.n))}% of armies, general deaths ${pct(r.generalDeaths! / (2 * r.n))}%`);
    L.push("center size: " + r.centerSize.map((c) => `${c.size} → ${pct(c.wr)}% (n=${c.n})`).join(" | "));
    L.push("shooters:    " + r.shooters!.map((c) => `${c.shooters} → ${pct(c.wr)}% (n=${c.n})`).join(" | "));
  }
  L.push(`early routs ${pct(r.earlyRoutRate)}%  routs ${pct(r.routRate)}%  events applied ${pct(r.eventRate)}%  heavier-army wins ${pct(r.upset.heavierWins / r.upset.n)}% (n=${r.upset.n})`);
  L.push("");
  L.push("## Win rate by grade (per unit appearance)");
  L.push(ORDER.map((g) => `${g} ${pct(wr(r.gradeWr[g]))}% (n=${r.gradeWr[g].n})`).join(" | "));
  L.push("");
  L.push("## Elite count / wrecked");
  L.push(r.eliteCount.map((e) => `${e.elites} elites ${pct(e.wr)}% (n=${e.n})`).join(" | ") + ` | wrecked ${pct(r.wrecked.wr)}% (n=${r.wrecked.n})`);
  L.push("");
  L.push("## Plans");
  L.push(r.plans.map((p) => `${p.plan} ${pct(p.wr)}% (n=${p.n})`).join(" | "));
  L.push("");
  L.push("## Terrain: cavalry-heavy (≥3 playing cavalry) vs other");
  for (const t of r.terrain) L.push(`${t.terrain.padEnd(7)} cav-heavy ${pct(t.cavHeavyWr)}% (n=${t.cavHeavyN})  other ${pct(t.otherWr)}%`);
  L.push("");
  L.push("## Culture traits (armies with the trait active)");
  for (const t of r.traits) L.push(`${t.culture} L${t.level} ${t.name.padEnd(18)} wr ${pct(t.wr)}% (n=${t.n})` + (t.lift !== null ? `  no-traits ${pct(t.wrNoTraits!)}%  lift ${(t.lift * 100).toFixed(1).padStart(5)} pts` : ""));
  L.push("");
  L.push("## Home culture (general's culture)");
  L.push(r.cultures.map((c) => `${c.culture} ${pct(c.wr)}%`).join(" | "));
  L.push("");
  L.push("## Off-class placements (unit class → slot) vs on-class in the same slot");
  for (const o of r.offSlot) L.push(`${(o.unitClass + "→" + o.slot).padEnd(18)} wr ${pct(o.wr)}% (n=${o.n})  on-class ${pct(o.onClassWr)}%  ${o.wr < o.onClassWr ? "ok" : "OFF-CLASS WINS"}`);
  L.push("");
  L.push("## Generals (top 8 / bottom 8)");
  const gs = r.generals.filter((g) => g.n > 0);
  for (const g of [...gs.slice(0, 8), ...gs.slice(-8)]) L.push(`${g.name.padEnd(28)} ${g.culture} ${pct(g.wr)}% (n=${g.n})`);
  L.push("");
  const us = opts.units === "all" ? r.units : r.units.filter((u) => u.flag);
  L.push(`## Units ${opts.units === "all" ? "(all)" : "(flagged: > 5 pts off expected, n ≥ 100)"} — delta vs same-grade units in the same slot kind`);
  for (const u of us) L.push(`${u.grade} ${String(u.cost).padStart(2)} ${u.unitId.padEnd(22)} ${u.class.padEnd(8)} wr ${pct(u.wr)}%  grade ${pct(u.gradeWr)}%  delta ${(u.delta * 100).toFixed(1).padStart(6)} (n=${u.n})`);
  L.push("");
  L.push("## Phase 0 acceptance");
  for (const a of r.acceptance) L.push(`${a.pass ? "PASS" : "FAIL"}  ${a.name}: ${a.detail}`);
  return L.join("\n");
}
