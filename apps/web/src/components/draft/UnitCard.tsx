"use client";

import type { Unit } from "@warlord/engine";
import { GradeChip } from "./GradeChip";
import { StatGrid } from "./StatGrid";
import { classTint } from "@/lib/text";
import type { Consequence } from "@/lib/draftRules";

export function UnitCard({ unit, selected, dimmed, consequence, onClick, landed, edge }: { unit: Unit; selected: boolean; dimmed: boolean; consequence: Consequence; onClick: () => void; landed?: boolean; edge: string }) {
  const tint = classTint(unit.class);
  const disabled = consequence.disabled && !selected;
  const tone = consequence.tone === "bad" ? "var(--rust)" : consequence.tone === "culture" ? edge : consequence.tone === "bone" ? "var(--bone)" : "var(--faint)";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      className="absolute inset-0 flex flex-col justify-between rounded-lg border py-3 pr-3 pl-3.5 text-left"
      style={{
        background: selected ? "#33261a" : "var(--panel)",
        borderColor: selected ? "var(--rust)" : "var(--rule)",
        borderLeft: `3px solid ${edge}`,
        opacity: disabled ? 0.6 : dimmed ? 0.45 : 1,
        animation: landed ? "wdland 240ms ease-out 1, wdflash 600ms ease-out 1" : undefined,
      }}
    >
      <div className="flex items-start gap-[9px]">
        <GradeChip grade={unit.grade} />
        <span className="min-w-0 grow text-[15px] leading-tight font-medium text-bone">{unit.name}</span>
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] text-ink" style={{ borderColor: selected ? "var(--bone)" : "var(--rule-btn)", background: selected ? "var(--bone)" : "transparent" }}>
          {selected ? "✓" : ""}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="rounded-sm border px-1.5 py-0.5 font-mono text-[9px] tracking-[0.1em] uppercase" style={{ color: tint.color, borderColor: tint.edge }}>
          {unit.class}
        </span>
        <span className="min-w-0 grow overflow-hidden font-mono text-[10px] text-ellipsis whitespace-nowrap text-faint">
          {unit.subtype.replace(/_/g, " ")} · {tint.legend}
        </span>
      </div>
      <StatGrid stats={unit.stats} />
      <div className="font-mono text-[9px] tracking-[0.1em]" style={{ color: tone }}>
        {consequence.text}
      </div>
    </button>
  );
}
