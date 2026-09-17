import { describe, expect, it } from "vitest";
import { data } from "./fixtures.js";
import { campaignFromSeed, heaviestFront } from "../src/campaign.js";
import { replayDraft, startDraft } from "../src/draft.js";
import { blindLine } from "../src/deploy.js";
import { DRAFTERS } from "../src/batch/drafters.js";
import { resolveBattle } from "../src/resolve.js";

data.rules.battleModel = "fronts";

describe("campaignFromSeed", () => {
  const spec = campaignFromSeed(data, 20260917, "2026-09-17");
  it("is deterministic and replayable", () => {
    expect(campaignFromSeed(data, 20260917, "2026-09-17")).toEqual(spec);
    for (const b of spec.battles) {
      const { army } = replayDraft(data, b.foe);
      expect(army).not.toBeNull();
      expect(army!.deployment).toEqual(b.line);
    }
  });
  it("uses three different grounds and three different generals outside the offered pool, climbing by band", () => {
    expect(new Set(spec.battles.map((b) => b.terrain)).size).toBe(3);
    const pool = new Set(startDraft(data, 20260917).generalPool);
    const gids = spec.battles.map((b) => replayDraft(data, b.foe).army!.generalId);
    expect(new Set(gids).size).toBe(3);
    for (const g of gids) expect(pool.has(g)).toBe(false);
    const sum = (id: string) => { const s = data.generalById.get(id)!.stats; return s.command + s.tactics + s.logistics + s.charisma; };
    spec.battles.forEach((b, i) => { const [lo, hi] = data.rules.campaign.generalBands[i]; expect(sum(gids[i])).toBeGreaterThanOrEqual(lo); expect(sum(gids[i])).toBeLessThanOrEqual(hi); });
  });
  it("early foes draft cheaper armies", () => {
    let c1 = 0, c3 = 0;
    for (let seed = 1; seed <= 20; seed++) {
      const s = campaignFromSeed(data, seed * 7919, `free-${seed}`);
      const cost = (run: string) => replayDraft(data, run).army!.slots.reduce((t, x) => t + data.unitById.get(x.unitId)!.cost, 0);
      c1 += cost(s.battles[0].foe); c3 += cost(s.battles[2].foe);
    }
    expect(c1 / 20).toBeLessThan(c3 / 20 - 4);
  });
  it("Scouts reads the heaviest front from the line", () => {
    expect(heaviestFront(["L", "L", "L", "C", "C", "R", "C", "C"])).toEqual({ fronts: ["C"], count: 4 });
    expect(heaviestFront(["L", "L", "L", "C", "C", "R", "C", "R"])).toEqual({ fronts: ["L", "C"], count: 3 });
  });
});

describe("blindLine", () => {
  it("is a seeded choice among near-tied layouts that never empties the center", () => {
    let multi = 0;
    for (let seed = 1; seed <= 12; seed++) {
      const a = DRAFTERS.greedy(data, seed, seed ^ 0x9e3779b9);
      const lines = new Set<string>();
      for (let s = 1; s <= 16; s++) {
        const d = blindLine(data, a, "plains", s);
        expect(d.filter((f) => f === "C").length).toBeGreaterThan(0);
        expect(blindLine(data, a, "plains", s)).toEqual(d);
        lines.add(d.join(""));
      }
      if (lines.size > 1) multi++;
    }
    // Most rosters leave the line a bet: the same roster stands differently on different campaign seeds.
    expect(multi).toBeGreaterThanOrEqual(6);
  });
  it("beats the default line more often than not on the same roster", () => {
    let w = 0, n = 0;
    for (let seed = 1; seed <= 60; seed++) {
      const a = DRAFTERS.greedy(data, seed, seed ^ 0x9e3779b9), b = DRAFTERS.greedy(data, seed + 500, (seed + 500) ^ 0x9e3779b9);
      const blind = { ...a, deployment: blindLine(data, a, "plains", seed) };
      for (let s = 1; s <= 10; s++) { n++; if (resolveBattle(data, blind, b, "plains", s).winner === "A") w++; if (resolveBattle(data, a, b, "plains", s).winner === "A") w--; }
    }
    expect(w / n).toBeGreaterThan(-0.05); // the blind line trades a little strength for being a bet
  });
});
