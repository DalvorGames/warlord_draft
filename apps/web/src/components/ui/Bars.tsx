import type { ReactNode } from "react";

/** The scoreboard's strength bar (v3 §2): yours solid from the left, his hatched draining toward the outside. */
export function StrengthBar({ value, word, color, his }: { value: number; word: string; color: string; his?: boolean }) {
  const pct = Math.round(value * 100);
  const inside = value >= 0.45;
  const wordColor = word === "FIRM" ? "var(--bone)" : word === "STEADY" ? "var(--dim)" : "var(--rust)";
  const fill = his ? `repeating-linear-gradient(135deg, ${color} 0 3px, rgba(16,15,12,0.55) 3px 7px)` : color;
  return (
    <div className="relative h-[14px] w-full rounded-sm bg-ground" style={{ direction: his ? "rtl" : "ltr" }}>
      <div className="h-full rounded-sm" style={{ width: `${pct}%`, background: fill, transition: "width 700ms ease" }} />
      <span
        className="absolute top-1/2 -translate-y-1/2 rounded-sm px-1.5 font-mono text-[11px] font-semibold tracking-[0.1em] whitespace-nowrap"
        style={inside
          ? { [his ? "left" : "right"]: `${100 - pct}%`, transform: `translate(${his ? "0" : "0"}, -50%)`, background: "rgba(16,15,12,0.72)", color: "var(--bone)", direction: "ltr", ...(his ? { marginLeft: 4 } : { marginRight: 4 }) }
          : { [his ? "right" : "left"]: `calc(${pct}% + 6px)`, color: wordColor, direction: "ltr" }}
      >
        {word}
      </span>
    </div>
  );
}

/** One contest row (v3 §2): your share solid from the left, his hatched to the right, a tick at 50%. */
export function ContestBar({ yourShare, mine, his }: { yourShare: number; mine: string; his: string }) {
  const pct = Math.round(yourShare * 100);
  return (
    <div className="relative flex h-2 grow overflow-hidden rounded-sm bg-ground">
      <div className="h-full" style={{ width: `${pct}%`, background: mine, transition: "width 700ms ease" }} />
      <div className="h-full grow" style={{ background: `repeating-linear-gradient(135deg, ${his} 0 3px, rgba(16,15,12,0.55) 3px 7px)` }} />
      <div className="absolute top-0 left-1/2 h-full w-0.5 bg-ground" />
    </div>
  );
}

/** A thin stat bar with the label and value (general cards, the unit card). */
export function StatBar({ label, value, color, lit = true, dim, right }: { label: ReactNode; value: number; color: string; lit?: boolean; dim?: boolean; right?: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <div className="flex items-baseline justify-between gap-1">
        <span className="font-mono text-[11px] tracking-[0.14em] uppercase" style={{ color: lit ? "var(--bone)" : "var(--faint)" }}>
          {label}
        </span>
        <span className="font-mono text-[15px] font-semibold" style={{ color: dim || !lit ? "var(--dim)" : "var(--white)" }}>
          {Math.round(value)}
          {right}
        </span>
      </div>
      <div className="h-[3px] rounded-sm" style={{ background: "rgba(16,15,12,0.55)" }}>
        <div className="h-[3px] rounded-sm" style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: lit ? color : "var(--rule-btn)" }} />
      </div>
    </div>
  );
}
