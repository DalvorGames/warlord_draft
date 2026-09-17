/** A slot reel (v2 §5.1): a sunk well with a payline; loops, then brakes onto the real card. */
export type ReelPhase = 0 | 1 | 2; // looping · braking · settled

export interface ReelLine {
  grade: string;
  name: string;
  hot?: boolean;
}

export function Reel({ phase, lines, stop, speedMs, delayMs, line }: { phase: ReelPhase; lines: ReelLine[]; stop: ReelLine[]; speedMs: number; delayMs: number; line: string }) {
  const strip = [...lines, ...lines];
  const row = (n: ReelLine, i: number) => (
    <div key={i} className="box-border flex h-[30px] items-center gap-2.5 px-4">
      <span className="w-3 font-mono text-[11px]" style={{ color: n.hot ? line : "#5c5749" }}>
        {n.grade}
      </span>
      <span className="overflow-hidden text-sm text-ellipsis whitespace-nowrap" style={{ color: n.hot ? "var(--bone)" : "var(--faint-2)" }}>
        {n.name}
      </span>
    </div>
  );
  return (
    <div className="absolute inset-0 overflow-hidden rounded-lg border border-raised bg-sunk">
      <div className="absolute inset-x-0 top-1/2 -mt-[17px] h-[34px]" style={{ background: "rgba(255,255,255,0.04)", borderTop: `1px solid ${line}`, borderBottom: `1px solid ${line}` }} />
      {phase === 0 && (
        <div className="absolute inset-x-0 top-1/2 -mt-[15px]" style={{ animation: `wdreel ${speedMs}ms linear infinite`, animationDelay: `${delayMs}ms` }}>
          {strip.map(row)}
        </div>
      )}
      {phase === 1 && (
        <div className="absolute inset-x-0 top-1/2 -mt-[15px]" style={{ animation: "wdstop 480ms cubic-bezier(0.1, 0.8, 0.2, 1) 1 forwards" }}>
          {stop.map(row)}
        </div>
      )}
      <div className="pointer-events-none absolute inset-0" style={{ background: "linear-gradient(#16140f 0%, rgba(0,0,0,0) 28%, rgba(0,0,0,0) 72%, #16140f 100%)" }} />
    </div>
  );
}
