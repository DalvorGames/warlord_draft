import { describe, expect, it } from "vitest";
import { data } from "./fixtures.js";
import { DRAFTERS } from "../src/batch/drafters.js";
import { resolveBattle } from "../src/resolve.js";
import { firstLegalCard, flipSides } from "../src/duel.js";
import { narrateBeats } from "../src/beats.js";
import { pickCard, pickGeneral, startDraft, summarize } from "../src/draft.js";

data.rules.battleModel = "fronts";

describe("flipSides", () => {
  it("is an involution and keeps the guest's story consistent", () => {
    for (const seed of [3, 44, 1147]) {
      const a = DRAFTERS.greedy(data, seed, seed ^ 0x9e3779b9), b = DRAFTERS.greedy(data, seed + 7, (seed + 7) ^ 0x9e3779b9);
      const r = resolveBattle(data, a, b, "hills", seed);
      const f = flipSides(r);
      expect(f.winner).toBe(r.winner === "A" ? "B" : "A");
      expect(f.casualties.A).toBe(r.casualties.B);
      expect(f.fronts!.A).toEqual(r.fronts!.B);
      expect(flipSides(f)).toEqual(r);
      // Narrating the flipped result as A reads the same as narrating the original as B.
      const asGuest = narrateBeats(r, "B"), flipped = narrateBeats(f, "A");
      expect(flipped.map((x) => x.narration)).toEqual(asGuest.map((x) => x.narration));
      expect(flipped.map((x) => x.keys)).toEqual(asGuest.map((x) => x.keys));
    }
  });
});

describe("firstLegalCard", () => {
  it("takes the first legal card, swapping an earlier elite when the cap blocks every card", () => {
    let s = pickGeneral(data, startDraft(data, 11, { rerolls: 2 }), 0);
    const cap = summarize(data, s).eliteCap;
    const elite = (id: string) => ["A", "S"].includes(data.unitById.get(id)!.grade);
    // Hand the first `cap` rows an elite card each and take it, then give row 7 four elite cards so nothing in it is legal.
    const elites = data.units.filter((u) => elite(u.id));
    const mk = (id: string) => ({ unitId: id, onClass: true, penalty: 1, wrecked: false });
    s = { ...s, rows: s.rows.map((r, i) => (i < cap ? { ...r, cards: [mk(elites[i].id), ...r.cards.slice(1)] } : i === 7 ? { ...r, cards: elites.slice(4, 8).map((u) => mk(u.id)) } : r)) };
    for (let ri = 0; ri < cap; ri++) s = pickCard(data, s, ri, 0);
    expect(() => pickCard(data, s, 7, 0)).toThrow(/elite cap/);
    const { state, card } = firstLegalCard(data, s, 7);
    expect(card).toBe(0);
    expect(state.rows[7].pick).toBe(0);
    expect(summarize(data, state).eliteUsed).toBe(cap);
    // A plain row just takes its first legal card.
    const plain = firstLegalCard(data, pickGeneral(data, startDraft(data, 12, { rerolls: 2 }), 0), 0);
    expect(plain.state.rows[0].pick).toBe(plain.card);
  });
});
