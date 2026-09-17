// Usage: npm run battle -- [--seed N] [--terrain plains] [--drafter greedy] [--runA <runString> --runB <runString>]
import { loadData } from "../node/loadData.js";
import { replayDraft, toRunString } from "../draft.js";
import { resolveBattle } from "../resolve.js";
import { DRAFTERS, type DrafterName } from "../batch/drafters.js";
import { mulberry32 } from "../rng.js";
import type { Army, TerrainName } from "../types.js";

const args = new Map<string, string>();
for (let i = 2; i < process.argv.length; i += 2) args.set(process.argv[i].replace(/^--/, ""), process.argv[i + 1]);

const data = loadData();
const seed = Number(args.get("seed") ?? 42);
const terrain = (args.get("terrain") ?? "plains") as TerrainName;
const drafter = DRAFTERS[(args.get("drafter") ?? "greedy") as DrafterName];
const rng = mulberry32(seed);

let A: Army, B: Army;
if (args.has("runA") && args.has("runB")) {
  A = replayDraft(data, args.get("runA")!).army!;
  B = replayDraft(data, args.get("runB")!).army!;
} else {
  A = drafter(data, rng.fork(), rng.fork());
  B = drafter(data, rng.fork(), rng.fork());
}
const r = resolveBattle(data, A, B, terrain, rng.fork());

const show = (side: "A" | "B") => {
  const p = r.armies[side];
  console.log(`\n[${side}] ${p.general.name} (${p.general.culture}, ${p.plan}) cost ${p.totalCost}  threshold ${p.moraleThreshold.toFixed(2)}`);
  for (const u of p.units) console.log(`   ${u.slot.padEnd(7)} ${u.unit.name.padEnd(34)} ${u.unit.grade} ${String(u.unit.cost).padStart(2)}  ${u.front ? `front=${u.front}` : `role=${u.role}`}${u.penalty < 1 ? ` ×${u.penalty}` : ""}${u.wrecked ? " WRECKED" : ""}`);
};
show("A"); show("B");
console.log("\n" + r.recap.join("\n"));
if (r.rounds) {
  const FN: Record<string, string> = { L: "left", C: "center", R: "right" };
  console.log("\nFronts (threshold = cohesion):");
  for (const side of ["A", "B"] as const) for (const f of r.fronts![side]) {
    const names = f.unitIds.map((id) => data.unitById.get(id)!.name).join(", ") || "(empty)";
    console.log(`  [${side}] ${FN[f.front].padEnd(6)} thr ${f.threshold.toFixed(2)}  ${names}`);
  }
  console.log("\nContests (edge capped; dmg = morale damage to that front):");
  for (const rd of r.rounds) {
    for (const c of rd.contests) {
      const label = c.stage === "press" || c.stage === "rollup" ? `${c.stage} ${rd.round}` : c.stage;
      console.log(`  ${label.padEnd(9)} A:${FN[c.frontA].padEnd(6)} ${c.scoreA.toFixed(0).padStart(5)}  vs  B:${FN[c.frontB].padEnd(6)} ${c.scoreB.toFixed(0).padStart(5)}  edge ${c.edge.toFixed(2)}  → ${c.winner}  dmg A ${c.damageA.toFixed(2)} B ${c.damageB.toFixed(2)}${c.note ? "  [" + c.note + "]" : ""}`);
    }
    if (rd.events.length) console.log(`  ${"".padEnd(9)} ${rd.events.join("; ")}`);
    console.log(`  ${"".padEnd(9)} army morale A ${rd.moraleA.toFixed(2)}  B ${rd.moraleB.toFixed(2)}`);
  }
} else {
  console.log("\nPhase log:");
  for (const p of r.phaseLog) console.log(`  ${p.phase.padEnd(9)} A ${p.scoreA.toFixed(0).padStart(5)}  B ${p.scoreB.toFixed(0).padStart(5)}  edge ${p.edge.toFixed(2)}  dmg A ${p.damageA.toFixed(2)} B ${p.damageB.toFixed(2)}  morale A ${p.moraleA.toFixed(2)} B ${p.moraleB.toFixed(2)}${p.eventApplied ? "  [" + p.eventApplied + "]" : ""}`);
}
console.log(`Event: ${r.event ? r.event.name + (r.event.applied ? "" : " (no effect)") : "none"}`);
