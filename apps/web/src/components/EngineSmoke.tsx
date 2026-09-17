"use client";

import { useEffect, useState } from "react";
import { useEngine } from "@/lib/engine/EngineProvider";

/** M0 acceptance: once the engine is loaded, resolve one battle and log it to the console. */
export function EngineSmoke({ seed }: { seed: number }) {
  const engine = useEngine();
  const [line, setLine] = useState<string>("Loading the engine…");
  useEffect(() => {
    if (!engine) return;
    const a = engine.aiDraft(seed, "greedy");
    const b = engine.aiDraft(seed ^ 0x5bd1e995, "greedy");
    const terrain = "plains";
    const armyA = { ...a, deployment: engine.aiDeploy(a, b, terrain) };
    const armyB = { ...b, deployment: engine.aiDeploy(b, a, terrain) };
    const result = engine.resolve(armyA, armyB, terrain, seed);
    console.log("[warlord] engine data v%d, %d units", engine.dataVersion, engine.data.units.length);
    console.log("[warlord] smoke battle", { seed, terrain, winner: result.winner, brokeIn: result.brokeInPhase, recap: result.recap });
    setLine(`Engine v${engine.dataVersion} · ${engine.data.units.length} units · smoke battle ${result.winner === "A" ? "won" : "lost"} at ${result.brokeInPhase}`);
  }, [engine, seed]);
  return <div className="font-mono text-[10px] text-faint-2">{line}</div>;
}
