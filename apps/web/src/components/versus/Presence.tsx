"use client";

import type { Dot } from "@/lib/versus/room";

/** The presence line (v3 §13.3): a dot and NAME · WHERE. */
export function PresenceLine({ name, dot, where }: { name: string; dot: Dot; where: string }) {
  const color = dot === "here" ? "#52C98A" : dot === "done" ? "var(--bone)" : dot === "left" ? "var(--rust)" : "var(--faint)";
  return (
    <div className="flex h-7 items-center gap-2 px-5">
      <span aria-hidden="true" className="inline-block h-2 w-2 rounded-full" style={{ background: color, boxShadow: dot === "here" ? "0 0 0 3px rgba(82,201,138,0.25)" : "none" }} />
      <span className="label" style={{ color: dot === "left" ? "var(--rust)" : "var(--dim)" }}>{name.toUpperCase()} · {where}</span>
    </div>
  );
}

/** The header timer: mono, rust under ten seconds. */
export function Timer({ text, ms }: { text: string; ms: number }) {
  if (!text) return null;
  return <span aria-live="polite" className="pr-1 font-mono text-[14px] font-semibold" style={{ color: ms < 10_000 ? "var(--rust)" : "var(--bone)" }}>{text}</span>;
}
