"use client";

import type { Unit } from "@warlord/engine";
import { GradeChip } from "./GradeChip";
import { StatGrid } from "./StatGrid";
import { classTint } from "@/lib/text";
import type { Consequence } from "@/lib/draftRules";

const TONE: Record<Consequence["tone"], string> = { brass: "var(--brass)", bone: "var(--bone)", faint: "var(--faint)", bad: "var(--bad)" };

export function UnitCard({ unit, selected, dimmed, consequence, onClick, landed }: { unit: Unit; selected: boolean; dimmed: boolean; consequence: Consequence; onClick: () => void; landed?: boolean }) {
  const tint = classTint(unit.class);
  const disabled = consequence.disabled && !selected;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      className="absolute inset-0 flex flex-col justify-between rounded-lg border px-3.5 py-3 text-left"
      style={{
        background: selected ? "var(--panel-sel)" : "var(--panel)",
        borderColor: selected ? "var(--accent)" : "var(--rule-2)",
        opacity: disabled ? 0.6 : dimmed ? 0.42 : 1,
        animation: landed ? "wdland 260ms ease-out 1, wdflash 700ms ease-out 1" : undefined,
      }}
    >
      <div className="flex items-start gap-[9px]">
        <GradeChip grade={unit.grade} />
        <span className="min-w-0 grow text-[15px] leading-tight font-medium text-bone">{unit.name}</span>
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] text-ground" style={{ borderColor: selected ? "var(--brass)" : "#3d382f", background: selected ? "var(--brass)" : "transparent" }}>
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
      <div className="font-mono text-[9px] tracking-[0.1em]" style={{ color: TONE[consequence.tone] }}>
        {consequence.text}
      </div>
    </button>
  );
}
