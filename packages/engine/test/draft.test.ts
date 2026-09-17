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

  it("deals 8 typed rows of 4 legal cards with no duplicates in a row", () => {
    expect(s1.rows.length).toBe(8);
    s1.rows.forEach((row, i) => {
      expect(row.slot).toBe(data.rules.slots[i]);
      // A culture with fewer eligible units than cards (Carthage has 3 cavalry) deals what exists.
      const eligible = data.units.filter((u) => u.culture === row.culture && slotPenalty(data, u, row.slot) !== null).length;
      expect(row.cards.length).toBe(Math.min(4, eligible));
      expect(new Set(row.cards.map((c) => c.unitId)).size).toBe(row.cards.length);
      for (const c of row.cards) {
        const u = data.unitById.get(c.unitId)!;
        expect(u.culture).toBe(row.culture);
        expect(slotPenalty(data, u, row.slot)).toBe(c.penalty);
        expect(c.onClass).toBe(isOnClass(u, row.slot));
      }
      const onClass = row.cards.filter((c) => c.onClass).length;
      const onClassEligible = data.units.filter((u) => u.culture === row.culture && isOnClass(u, row.slot)).length;
      expect(onClass).toBeGreaterThanOrEqual(Math.min(3, onClassEligible));
    });
  });

  it("enforces the elite cap on pick", () => {
    // Find a general with logistics < 80 so the cap is 2, then try to take 3 elites from a board that has them.
    let found = 0;
    for (let seed = 1; seed < 400 && !found; seed++) {
      const st = startDraft(data, seed);
      for (let g = 0; g < 3; g++) {
        const gen = data.generalById.get(st.generalPool[g])!;
        if (gen.stats.logistics >= 80) continue;
        let s = pickGeneral(data, st, g);
        const elites: [number, number][] = [];
        s.rows.forEach((r, ri) => r.cards.forEach((c, ci) => {
          const u = data.unitById.get(c.unitId)!;
          if ((u.grade === "A" || u.grade === "S") && u.culture !== "per" && !elites.some((e) => e[0] === ri)) elites.push([ri, ci]);
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
    expect(s3.rerollsLeft).toBe(1);
    expect(s3.rerollLog).toEqual([1]);
    const s4 = rerollRow(data, s3, 2);
    expect(() => rerollRow(data, s4, 3)).toThrow(/no rerolls/);
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
    expect(run).toMatch(/^v=2&d=777&g=1&p=/);
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
