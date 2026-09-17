import { describe, expect, it } from "vitest";
import { army, data } from "./fixtures.js";
import { activeTraits, defaultPlan, traitLabel } from "../src/traits.js";
import { prepareArmy } from "../src/prepare.js";
import { resolveBattle } from "../src/resolve.js";
import { narrateBeats, strength, turningPoint, whyLine } from "../src/beats.js";
import type { Army, Front } from "../src/types.js";

data.rules.battleModel = "fronts";

const units = (ids: string[]) => ids.map((id) => data.unitById.get(id)!);
const greeks = ["grk_epilektoi", "grk_epilektoi", "grk_sacred_band", "grk_thessalians", "grk_hippeis", "grk_militia", "grk_mercenaries", "grk_syracusan_cav"];
const romans = ["rom_principes", "rom_triarii", "rom_extraordinarii", "rom_equites", "rom_socii_cav", "rom_archers", "rom_slingers", "rom_velites"];
const mixed = ["mac_pezhetairoi", "car_libyans", "per_kardakes", "stp_saka_ha", "ind_elephants", "chn_crossbows", "gal_gaesatae", "rom_velites"];

const wins = (a: Army, b: Army, n = 400, terrain: "plains" | "hills" | "forest" = "plains") => {
  let w = 0;
  for (let s = 1; s <= n; s++) if (resolveBattle(data, a, b, terrain, s).winner === "A") w++;
  return w / n;
};

describe("trait levels", () => {
  it("stacks a general's trait with his culture's, capped at III", () => {
    // Fabius (delayer, steady) with eight Greeks: Steady I (general) + II (six Greeks) → III.
    const fabius = data.generalById.get("fabius")!;
    const t = activeTraits(data, fabius, units(greeks));
    const steady = t.find((x) => x.id === "steady")!;
    expect(steady.level).toBe(3);
    expect(steady.sources.map((s) => s.kind)).toEqual(["general", "culture"]);
    expect(t.find((x) => x.id === "delayer")!.level).toBe(1);
    expect(traitLabel(data, steady)).toBe("Steady III");
    expect(traitLabel(data, { id: "delayer", level: 1 })).toBe("Delayer");
  });
  it("a culture grants its trait at four units, the general counted", () => {
    const flaminius = data.generalById.get("flaminius")!; // Rome, no traits
    const three = activeTraits(data, flaminius, units(["rom_principes", "rom_triarii", "rom_velites", ...mixed.slice(0, 5)]));
    expect(three.find((x) => x.id === "deep_ranks")?.level).toBe(1); // 3 Romans + Flaminius = 4
    const none = activeTraits(data, flaminius, units(mixed));
    expect(none.find((x) => x.id === "deep_ranks")).toBeUndefined(); // 1 Roman + Flaminius = 2
  });
  it("suggests a plan from the traits", () => {
    expect(defaultPlan(data, data.generalById.get("hannibal")!)).toBe("envelopment");
    expect(defaultPlan(data, data.generalById.get("fabius")!)).toBe("defensive");
    expect(defaultPlan(data, data.generalById.get("flaminius")!)).toBe("defensive"); // Rome's own trait: deep ranks
  });
});

describe("trait hooks", () => {
  const base = army("flaminius", "aggressive", mixed);
  const lift = (extra: Army["extraTraits"], n = 600, terrain: "plains" | "hills" | "forest" = "plains") => wins({ ...base, extraTraits: extra }, base, n, terrain) - 0.5;
  it("every scaling trait at level III and every rule trait lifts the win rate of an otherwise identical army", () => {
    const pool = data.rules.traits;
    for (const [id, def] of Object.entries(pool)) {
      if (id === "scouts") continue;
      const entries = def.levels[def.levels.length - 1];
      const terrain = id === "master_of_ground" ? "forest" : "plains";
      const l = lift(entries, 600, terrain);
      expect(l, id).toBeGreaterThan(0.02);
    }
  });
  it("mercenary captain does nothing for an all-home army", () => {
    const rome = army("flaminius", "aggressive", romans);
    const p = prepareArmy(data, { ...rome, extraTraits: [{ stat: "melee", mult: 1.42, scope: "other_cultures" }] }, "plains");
    const q = prepareArmy(data, rome, "plains");
    expect(p.units.map((u) => u.stats.melee)).toEqual(q.units.map((u) => u.stats.melee));
  });
  it("ground leaves STEADY alone", () => {
    const p = prepareArmy(data, army("flaminius", "aggressive", greeks), "forest");
    for (const u of p.units) expect(u.stats.discipline).toBe(u.unit.stats.discipline);
    expect(p.units.find((u) => u.unit.class === "cavalry")!.stats.mobility).toBeLessThan(data.unitById.get("grk_thessalians")!.stats.mobility);
  });
  it("a rallied front fights shaken and the report names the trait", () => {
    let seen = 0;
    for (let s = 1; s <= 200 && !seen; s++) {
      const r = resolveBattle(data, { ...army("alexander", "aggressive", mixed), deployment: "LLLCCRRC".split("") as Front[] }, army("flaminius", "aggressive", romans), "plains", s);
      const rd = r.rounds!.find((x) => x.events.some((e) => e.startsWith("A:") && e.endsWith("rallies")));
      if (!rd) continue;
      seen++;
      expect(rd.traits.some((t) => t.trait === "rally" && t.side === "A")).toBe(true);
      const beats = narrateBeats(r);
      expect(beats.some((b) => b.keys.some((k) => k.trait === "rally" && k.text.includes("Rally")))).toBe(true);
    }
    expect(seen).toBe(1);
  });
});

describe("report words", () => {
  it("strength drains from FIRM to ROUTED", () => {
    expect(strength(0, 0.8).word).toBe("FIRM");
    expect(strength(0.4, 0.8).word).toBe("STEADY");
    expect(strength(0.7, 0.8).word).toBe("BRITTLE");
    expect(strength(0.9, 0.8).word).toBe("ROUTED");
  });
  it("gives every battle a turning point, a why line, and trait callouts when a trait acted", () => {
    let withTrait = 0;
    for (let s = 1; s <= 40; s++) {
      const a = army("epaminondas", "aggressive", greeks), b = army("hannibal", "envelopment", mixed);
      const r = resolveBattle(data, a, b, "hills", s);
      const beats = narrateBeats(r);
      expect(turningPoint(beats).text.length).toBeGreaterThan(10);
      expect(whyLine(data, r, beats).length).toBeGreaterThan(10);
      if (beats.some((bt) => bt.keys.some((k) => k.kind === "trait"))) withTrait++;
    }
    expect(withTrait).toBeGreaterThan(20);
  });
});
