// Pretend to be a browser client: parse the JSON, build the engine from dist/, draft, deploy, fight, replay.
import { readFileSync } from "node:fs";
import { createEngine } from "../dist/api.js";
const read = (f) => JSON.parse(readFileSync(new URL(`../data/${f}`, import.meta.url), "utf8"));
const engine = createEngine({ units: read("units.json"), generals: read("generals.json"), cultures: read("cultures.json"), rules: read("rules.json") });

let s = engine.startDraft(20260916);
s = engine.pickGeneral(s, 0);
for (let r = 0; r < 8; r++) for (let c = 0; c < 4; c++) { try { s = engine.pickCard(s, r, c); break; } catch {} }
s = engine.setPlan(s, "envelopment");
const enemy = engine.aiDraft(7);
const me = engine.toArmy(s);
s = engine.setDeployment(s, engine.aiDeploy(me, enemy, "plains"));
enemy.deployment = engine.aiDeploy(enemy, engine.toArmy(s), "plains");
const run = engine.toRunString(s);
const r1 = engine.resolve(engine.toArmy(s), enemy, "plains", 99);
const r2 = engine.resolve(engine.replayDraft(run).army, enemy, "plains", 99);
if (JSON.stringify(r1.rounds) !== JSON.stringify(r2.rounds)) throw new Error("replay mismatch");
console.log("run:", run);
console.log(r1.recap.join("\n"));
console.log("smoke ok: dist/ has no node imports, replay matches");
