"use client";

import type { ReactNode } from "react";

export type ChipState = "on" | "near" | "off";

/** A trait word as a chip (v3 §2). Rule traits carry a small diamond and a dotted edge. */
export function TraitChip({ children, state = "on", rule, onClick, active, onDeep }: { children: ReactNode; state?: ChipState; rule?: boolean; onClick?: () => void; active?: boolean; onDeep?: boolean }) {
  const style = {
    on: { background: onDeep ? "rgba(16,15,12,0.35)" : "var(--raised)", borderColor: active ? "var(--bone)" : onDeep ? "rgba(242,236,221,0.35)" : "var(--rule-btn)", color: "var(--bone)" },
    near: { background: "transparent", borderColor: active ? "var(--bone)" : "var(--rule-btn)", color: "var(--dim)" },
    off: { background: "transparent", borderColor: active ? "var(--bone)" : "var(--rule)", color: "var(--faint)" },
  }[state];
  const cls = "inline-flex min-h-[26px] items-center gap-1.5 rounded-[3px] border px-2 py-[3px] text-xs font-medium leading-none";
  const inner = (
    <>
      {rule && <span aria-hidden="true" className="inline-block h-2 w-2 rotate-45" style={{ background: "currentColor", opacity: 0.85 }} />}
      {children}
    </>
  );
  if (!onClick) return <span className={cls} style={{ ...style, borderStyle: rule ? "dotted" : "solid" }}>{inner}</span>;
  return (
    <button type="button" onClick={onClick} aria-expanded={active} className={cls} style={{ ...style, borderStyle: rule ? "dotted" : "solid", minHeight: 30 }}>
      {inner}
    </button>
  );
}
