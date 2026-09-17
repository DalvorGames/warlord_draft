import { describe, expect, it } from "vitest";
import { army, data } from "./fixtures.js";
import { resolveBattle } from "../src/resolve.js";
import { defaultDeployment } from "../src/deploy.js";
import type { Army, Front } from "../src/types.js";

data.rules.battleModel = "fronts";

const G = "xanthippus";
const mac = army("alexander", "aggressive", ["mac_pezhetairoi", "mac_argyraspides", "mac_hypaspists", "mac_companions", "mac_prodromoi", "grk_cretans", "mac_agrianians", "mac_elephants"]);
const car = army("hannibal", "envelopment", ["car_libyans", "car_libyan_vets", "car_sacred_band", "car_numidians", "car_iberian_cav", "car_balearics", "car_caetrati", "car_elephants"]);
const deploy = (a: Army, d: string): Army => ({ ...a, deployment: d.split("") as Front[] });
const wins = (a: Army, b: Army, n = 500, terrain: "plains" | "hills" = "plains") => {
  let w = 0;
  for (let s = 1; s <= n; s++) if (resolveBattle(data, a, b, terrain, s).winner === "A") w++;
  return w / n;
};

describe("three fronts", () => {
  it("default deployment puts infantry in the center and mounted troops on the wings", () => {
    const d = defaultDeployment(data, mac);
    // pezhetairoi, argyraspides, hypaspists, cretans hold the center; companions, prodromoi, agrianians, elephants split the wings
    expect([0, 1, 2, 5].map((i) => d[i])).toEqual(["C", "C", "C", "C"]);
    expect(d.filter((f) => f === "L").length).toBe(2);
    expect(d.filter((f) => f === "R").length).toBe(2);
  });

  it("is deterministic and produces rounds, fronts and a recap", () => {
    const r1 = resolveBattle(data, mac, car, "plains", 9);
    const r2 = resolveBattle(data, mac, car, "plains", 9);
    expect(r1.rounds).toEqual(r2.rounds);
    expect(r1.recap).toEqual(r2.recap);
    expect(r1.rounds!.length).toBeGreaterThanOrEqual(2);
    expect(r1.fronts!.A.length).toBe(3);
    expect(r1.recap.length).toBeGreaterThanOrEqual(6);
  });

  it("varies across seeds", () => {
    const winners = new Set<string>();
    for (let s = 1; s <= 60; s++) winners.add(resolveBattle(data, mac, car, "plains", s).winner);
    expect(winners.size).toBe(2);
  });

  it("an empty center gives way at contact and the army loses badly", () => {
    const noCenter = deploy(mac, "LLLLRRRR");
    const wr = wins(noCenter, car, 300);
    console.log("empty center:", wr);
    expect(wr).toBeLessThan(0.15);
  });

  it("everyone in the center loses to a balanced deployment of the same roster", () => {
    const allCenter = deploy(car, "CCCCCCCC");
    const wr = wins(allCenter, car, 500);
    console.log("all-center vs default, same roster:", wr);
    expect(wr).toBeLessThan(0.4);
  });

  it("the general dies only when the center broke and the battle was lost", () => {
    let fell = 0, brokeAndLost = 0;
    for (let s = 1; s <= 300; s++) {
      const r = resolveBattle(data, mac, car, "plains", s);
      for (const side of ["A", "B"] as const) {
        const lost = r.winner !== side;
        const centerBroke = r.fronts![side][1].broken;
        if (r.generalFell![side]) { fell++; expect(lost && centerBroke).toBe(true); }
        if (lost && centerBroke) brokeAndLost++;
      }
    }
    expect(fell).toBe(brokeAndLost);
  });

  it("a zero-shooter army takes heavy skirmish damage but does not rout on the spot", () => {
    const noShooters = army(G, "aggressive", ["grk_epilektoi", "grk_epilektoi", "grk_sacred_band", "grk_thessalians", "grk_hippeis", "grk_militia", "grk_mercenaries", "grk_syracusan_cav"]);
    const archers = army(G, "defensive", ["rom_principes", "rom_triarii", "rom_extraordinarii", "rom_equites", "rom_socii_cav", "rom_archers", "rom_slingers", "rom_velites"]);
    const r = resolveBattle(data, noShooters, archers, "plains", 3);
    const sk = r.rounds![0].contests.filter((c) => c.stage === "skirmish");
    expect(sk.length).toBeGreaterThan(0);
    for (const c of sk) expect(c.edge).toBeLessThanOrEqual(data.rules.fronts.edgeCap + 1e-9);
    expect(r.rounds![0].events.some((e) => e.endsWith("routs"))).toBe(false);
    const wr = wins(noShooters, archers, 300);
    console.log("no shooters vs archers:", wr);
    expect(wr).toBeGreaterThan(0.05);
  });

  it("terrain is asymmetric: cavalry-heavy wings do worse on hills", () => {
    const cav = army(G, "envelopment", ["per_kardakes", "per_kardakes", "per_apple_bearers", "per_heavy_cav", "per_bactrians", "per_saka", "per_hyrcanians", "per_heavy_cav"]);
    const foot = army(G, "defensive", ["rom_principes", "rom_principes", "rom_extraordinarii", "rom_equites", "rom_socii_cav", "rom_archers", "rom_velites", "rom_triarii"]);
    const plains = wins(cav, foot, 800, "plains"), hills = wins(cav, foot, 800, "hills");
    console.log("cavalry-heavy plains vs hills:", plains, hills);
    expect(plains - hills).toBeGreaterThan(0.03);
  });
});
