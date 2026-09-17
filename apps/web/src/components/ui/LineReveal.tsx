import type { Army, BattleResult, Engine, Front } from "@warlord/engine";
import { Token } from "./Token";
import { FRONT_WORD, OPP } from "@/lib/battleView";

/** The line reveal (v3 §1.8): three bands, your tokens on the left, VS, his on the right, with state words. */
export function LineReveal({ engine, mine, his, result, size = 36, mineColor, hisColor }: { engine: Engine; mine: Army; his: Army; result: BattleResult | null; size?: number; mineColor: string; hisColor: string }) {
  const units = (a: Army) => a.slots.map((s) => engine.data.unitById.get(s.unitId)!);
  const yu = units(mine), hu = units(his);
  const state = (side: "A" | "B", f: Front) => {
    const fs = result?.fronts?.[side].find((x) => x.front === f);
    return fs?.broken ? "broken" : fs?.shaken ? "shaken" : "normal";
  };
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between font-mono text-[11px] tracking-[0.14em]">
        <span className="flex items-center gap-1.5" style={{ color: mineColor }}>
          <span className="inline-block h-1 w-3 rounded-sm" style={{ background: mineColor }} /> YOURS · FILLED
        </span>
        <span className="flex items-center gap-1.5" style={{ color: hisColor }}>
          <span className="inline-block h-1.5 w-3 rounded-sm border" style={{ borderColor: hisColor }} /> HIS · OUTLINED
        </span>
      </div>
      {(["L", "C", "R"] as Front[]).map((f) => {
        const o = OPP[f];
        const yi = mine.deployment!.map((x, k) => (x === f ? k : -1)).filter((k) => k >= 0);
        const hi = his.deployment!.map((x, k) => (x === o ? k : -1)).filter((k) => k >= 0);
        const yBroke = state("A", f) === "broken", hBroke = state("B", o) === "broken";
        return (
          <div key={f} className="flex flex-col gap-2 rounded-md border border-rule bg-panel px-3 py-2.5">
            <div className="flex items-baseline justify-between font-mono text-[11px] tracking-[0.14em]">
              <span style={{ color: mineColor }}>
                YOUR {FRONT_WORD[f]} {yBroke ? <span className="text-rust">BROKE</span> : <span className="text-dim">{yi.length}</span>}
              </span>
              <span style={{ color: hisColor }}>
                {hBroke ? <span className="text-rust">BROKE </span> : <span className="text-dim">{hi.length} </span>}HIS {FRONT_WORD[o]}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="flex flex-wrap gap-1.5">
                {yi.map((k) => <Token key={k} unit={yu[k]} size={size} state={state("A", f)} />)}
                {!yi.length && <span className="font-mono text-[11px] text-faint">NOBODY</span>}
              </div>
              <div className="flex grow items-center gap-2 px-1">
                <div className="h-px grow bg-rule" />
                <span className="font-mono text-[11px] tracking-[0.14em] text-faint">VS</span>
                <div className="h-px grow bg-rule" />
              </div>
              <div className="flex flex-wrap justify-end gap-1.5">
                {hi.map((k) => <Token key={k} unit={hu[k]} size={size} his state={state("B", o)} />)}
                {!hi.length && <span className="font-mono text-[11px] text-faint">NOBODY</span>}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
