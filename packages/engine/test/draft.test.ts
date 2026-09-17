import { describe, expect, it } from "vitest";
import { data } from "./fixtures.js";
import { pickCard, pickGeneral, rerollRow, replayDraft, setDeployment, setPlan, slotPenalty, startDraft, summarize, toArmy, toRunString, validateDraft, isOnClass } from "../src/draft.js";
import type { Front } from "../src/types.js";
import { resolveBattle } from "../src/resolve.js";
import { DRAFTERS } from "../src/batch/drafters.js";

describe("draft board", () => {
  const s0 = startDraft(data, 2026);
  const s1 = pickGeneral(data, s0, 0);

  it("offers 3 distinct generals", () => {
    expect(s0.generalPool.length).toBe(3);
    expect(new Set(s0.generalPool).size).toBe(3);
  });

  it("deals 8 rows of 4 legal cards with no duplicates in a row, cultures drawn per card", () => {
    expect(s1.rows.length).toBe(8);
    const cultures = new Set<string>();
    s1.rows.forEach((row, i) => {
      expect(row.slot).toBe(data.rules.slots[i]);
      expect(row.cards.length).toBe(4);
      expect(new Set(row.cards.map((c) => c.unitId)).size).toBe(row.cards.length);
      for (const c of row.cards) {
        const u = data.unitById.get(c.unitId)!;
        cultures.add(u.culture);
        expect(slotPenalty(data, u, row.slot)).toBe(c.penalty);
        expect(c.onClass).toBe(isOnClass(u, row.slot));
      }
      if (row.slot !== "flex") expect(row.cards.filter((c) => c.onClass).length).toBeGreaterThanOrEqual(3);
    });
    // Mixed-culture rows: a board draws from more than two cultures.
    expect(cultures.size).toBeGreaterThan(2);
  });

  it("flex rows spread across classes rather than flooding with line and cavalry", () => {
    const classes = new Map<string, number>();
    for (let seed = 1; seed <= 150; seed++) {
      const st = pickGeneral(data, startDraft(data, seed), 0);
      for (const row of st.rows) if (row.slot === "flex") for (const c of row.cards) { const k = data.unitById.get(c.unitId)!.class; classes.set(k, (classes.get(k) ?? 0) + 1); }
    }
    const total = [...classes.values()].reduce((a, b) => a + b, 0);
    for (const k of ["line", "shock", "cavalry", "ranged", "skirmish", "special"]) expect((classes.get(k) ?? 0) / total).toBeGreaterThan(0.06);
  });

  it("enforces the elite cap on pick", () => {
    // Find a general with logistics < 80 so the cap is 2, then try to take 3 elites from a board that has them.
    let found = 0;
    for (let seed = 1; seed < 400 && !found; seed++) {
      const st = startDraft(data, seed);
      for (let g = 0; g < 3; g++) {
        const gen = data.generalById.get(st.generalPool[g])!;
        if (gen.stats.logistics >= data.rules.eliteCap.logisticsThreshold) continue;
        let s = pickGeneral(data, st, g);
        const elites: [number, number][] = [];
        s.rows.forEach((r, ri) => r.cards.forEach((c, ci) => {
          const u = data.unitById.get(c.unitId)!;
          if ((u.grade === "A" || u.grade === "S") && !elites.some((e) => e[0] === ri)) elites.push([ri, ci]);
        }));
        if (elites.length < 3) continue;
        s = pickCard(data, s, ...elites[0]);
        s = pickCard(data, s, ...elites[1]);
        expect(summarize(data, s).eliteUsed).toBe(2);
        expect(() => pickCard(data, s, ...elites[2])).toThrow(/elite cap/);
        found++;
        break;
      }
    }
    expect(found).toBe(1);
  });

  it("rerolls only unpicked rows and consumes rerolls", () => {
    const s2 = pickCard(data, s1, 0, 0);
    expect(() => rerollRow(data, s2, 0)).toThrow();
    const s3 = rerollRow(data, s2, 1);
    expect(s3.rerollsLeft).toBe(data.rules.rerolls - 1);
    expect(s3.rerollLog).toEqual([1]);
    const s4 = rerollRow(data, rerollRow(data, s3, 2), 3);
    expect(s4.rerollsLeft).toBe(0);
    expect(() => rerollRow(data, s4, 4)).toThrow(/no rerolls/);
  });

  it("run string replays the exact same army and battle", () => {
    let s = pickGeneral(data, startDraft(data, 777), 1);
    s = rerollRow(data, s, 5);
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 4; c++) { try { s = pickCard(data, s, r, c); break; } catch { /* try next card */ } }
    }
    s = setPlan(s, "envelopment");
    s = setDeployment(s, "LCCRCLRC".split("") as Front[]);
    expect(validateDraft(data, s)).toEqual([]);
    const run = toRunString(s);
    expect(run).toMatch(/^v=3&d=777&g=1&p=/);
    expect(run).toMatch(/&dep=LCCRCLRC$/);
    const { army } = replayDraft(data, run);
    expect(army).toEqual(toArmy(data, s));
    const opp = DRAFTERS.greedy(data, 99, 100);
    const r1 = resolveBattle(data, army!, opp, "river", 4242);
    const r2 = resolveBattle(data, replayDraft(data, run).army!, opp, "river", 4242);
    expect(r1.phaseLog).toEqual(r2.phaseLog);
    expect(r1.winner).toBe(r2.winner);
  });

  it("both drafters produce valid armies over many seeds", () => {
    for (let seed = 1; seed <= 200; seed++) {
      for (const d of Object.values(DRAFTERS)) {
        const a = d(data, seed, seed * 7);
        expect(a.slots.length).toBe(8);
      }
    }
  });
});
