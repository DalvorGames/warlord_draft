import { describe, expect, it } from "vitest";
import { loadData } from "../src/node/loadData.js";
import { DRAFTERS } from "../src/batch/drafters.js";
import { deployAgainst } from "../src/deploy.js";
import { resolveBattle } from "../src/resolve.js";
import { deployPreview, cohesionWord, reserveCount } from "../src/preview.js";
import { narrateBeats, decisiveClause } from "../src/beats.js";
import type { Front, TerrainName } from "../src/types.js";

const data = loadData();
const FR: Front[] = ["L", "C", "R"];

function pair(seed: number, terrain: TerrainName) {
  const a = DRAFTERS.greedy(data, seed, seed ^ 0x9e3779b9);
  const b = DRAFTERS.greedy(data, seed + 1, (seed + 1) ^ 0x9e3779b9);
  const A = { ...a, deployment: deployAgainst(data, a, b, terrain) };
  const B = { ...b, deployment: deployAgainst(data, b, a, terrain) };
  return { A, B };
}

describe("deployPreview", () => {
  it("matches the resolver's thresholds on every terrain", () => {
    for (const terrain of ["plains", "hills", "forest", "river"] as TerrainName[]) {
      for (const seed of [1, 1147, 31337]) {
        const { A, B } = pair(seed, terrain);
        const r = resolveBattle(data, A, B, terrain, seed);
        const pv = deployPreview(data, A, terrain);
        for (const f of FR) {
          const rf = r.fronts!.A.find((x) => x.front === f)!;
          expect(pv.fronts[f].threshold).toBeCloseTo(rf.threshold, 10);
          expect(pv.fronts[f].unitIds).toEqual(rf.unitIds);
        }
      }
    }
  });
  it("accepts a partial placement and leaves unplaced units off every front", () => {
    const { A } = pair(1147, "plains");
    const placed = A.deployment!.map((f, i) => (i === 3 ? f : null));
    const pv = deployPreview(data, A, "plains", undefined, placed);
    const total = FR.reduce((t, f) => t + pv.fronts[f].count, 0);
    expect(total).toBe(1);
    expect(pv.fronts[A.deployment![3]].unitIds).toEqual([A.slots[3].unitId]);
    const empty = FR.filter((f) => f !== A.deployment![3]);
    for (const f of empty) expect(pv.fronts[f].threshold).toBe(0);
    // With nothing placed, every front is empty and nothing throws.
    const none = deployPreview(data, A, "plains", undefined, A.slots.map(() => null));
    for (const f of FR) expect(none.fronts[f].count).toBe(0);
    // Fully placed through `placed` matches the deployment path exactly.
    const full = deployPreview(data, A, "plains", undefined, A.deployment!);
    for (const f of FR) expect(full.fronts[f].threshold).toBe(deployPreview(data, A, "plains").fronts[f].threshold);
  });
  it("counts reserves by the frontage rule and names cohesion", () => {
    expect(reserveCount(data, 6, 4)).toBe(0); // ceil(4×1.5)=6 engage
    expect(reserveCount(data, 6, 2)).toBe(3); // ceil(2×1.5)=3 engage
    expect(reserveCount(data, 0, 3)).toBe(0);
    expect(cohesionWord(0)).toBe("NOTHING HERE");
    expect(cohesionWord(0.9)).toBe("BRITTLE");
    expect(cohesionWord(0.95)).toBe("STEADY");
    expect(cohesionWord(1.02)).toBe("FIRM");
  });
});

describe("narrateBeats", () => {
  it("yields one beat per round plus the result, for either side, deterministically", () => {
    for (const seed of [1, 7, 11, 42, 1147]) {
      const { A, B } = pair(seed, "plains");
      const r = resolveBattle(data, A, B, "plains", seed);
      const beats = narrateBeats(r);
      expect(beats.length).toBe(r.rounds!.length + 1);
      expect(beats[0].kind).toBe("skirmish");
      expect(beats[beats.length - 1].kind).toBe("result");
      for (const b of beats) {
        expect(b.narration.length).toBeGreaterThan(10);
        expect(b.short.length).toBeGreaterThan(3);
        expect(b.narration).not.toMatch(/\b0\.\d+/); // no raw numbers in prose
      }
      expect(narrateBeats(r)).toEqual(beats);
      const his = narrateBeats(r, "B");
      expect(his.length).toBe(beats.length);
      expect(his[his.length - 1].narration).not.toBe(beats[beats.length - 1].narration);
      expect(decisiveClause(beats).length).toBeGreaterThan(3);
    }
  });
});
