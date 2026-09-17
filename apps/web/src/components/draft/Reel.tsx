/** The rolling strip a card shows before it settles (handoff §5.1). */
export function Reel({ lines, speedMs, delayMs }: { lines: { grade: string; name: string }[]; speedMs: number; delayMs: number }) {
  const strip = [...lines, ...lines];
  return (
    <div className="absolute inset-0 overflow-hidden rounded-lg border border-rule bg-[#1a1813]">
      <div style={{ animation: `wdreel ${speedMs}ms linear infinite`, animationDelay: `${delayMs}ms` }}>
        {strip.map((n, i) => (
          <div key={i} className="box-border flex h-[30px] items-center gap-2.5 px-4">
            <span className="w-3 font-mono text-[11px] text-[#5c5749]">{n.grade}</span>
            <span className="overflow-hidden text-sm text-ellipsis whitespace-nowrap text-faint-2">{n.name}</span>
          </div>
        ))}
      </div>
      <div className="pointer-events-none absolute inset-0" style={{ background: "linear-gradient(#1a1813 0%, rgba(26,24,19,0) 30%, rgba(26,24,19,0) 70%, #1a1813 100%)" }} />
    </div>
  );
}
