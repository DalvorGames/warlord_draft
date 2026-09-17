import type { Unit } from "@warlord/engine";
import { classTint, gradeStyle, shortUnitName } from "@/lib/text";

export function UnitChip({ unit, held, onClick, large }: { unit: Unit; held: boolean; onClick: () => void; large?: boolean }) {
  const g = gradeStyle(unit.grade);
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={held}
      className={`box-border flex items-center gap-1.5 rounded-sm border ${large ? "min-h-10 px-[9px] py-2" : "min-h-9 px-2 py-[7px]"}`}
      style={{ background: held ? "var(--panel-sel)" : "var(--panel-2)", borderColor: held ? "var(--accent)" : "#3a362e" }}
    >
      <span className="font-mono text-[10px] font-semibold" style={{ color: unit.grade === "S" ? "var(--brass)" : unit.grade === "A" || unit.grade === "B" ? g.bg : "var(--faint)" }}>
        {unit.grade}
      </span>
      <span className="text-xs text-bone">{shortUnitName(unit)}</span>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: classTint(unit.class).color }} />
    </button>
  );
}
