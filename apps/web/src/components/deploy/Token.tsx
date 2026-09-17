import type { Unit } from "@warlord/engine";
import { classTint, shortUnitName } from "@/lib/text";

/** A unit token on the pitch: a 40px rounded square with the grade, the short name under it, a class dot. */
export function Token({ unit, held, onClick }: { unit: Unit; held: boolean; onClick: () => void }) {
  const g = unit.grade;
  const bg = g === "S" ? "var(--bone)" : g === "A" ? "var(--grade-a)" : "var(--raised)";
  const text = g === "S" || g === "A" ? "var(--ink)" : "var(--bone)";
  const edge = held ? "var(--rust)" : g === "S" ? "var(--bone)" : "var(--rule-btn)";
  return (
    <button type="button" onClick={onClick} aria-pressed={held} className="flex min-h-11 w-[58px] flex-col items-center gap-[3px] border-0 bg-transparent p-0">
      <div className="box-border flex h-10 w-10 items-center justify-center rounded-lg font-mono text-[15px] font-semibold" style={{ background: bg, color: text, border: `2px solid ${edge}` }}>
        {g}
      </div>
      <span className="max-w-[58px] overflow-hidden text-center text-[9px] leading-[1.15] text-ellipsis whitespace-nowrap text-center" style={{ color: "var(--center)" }}>
        {shortUnitName(unit)}
      </span>
      <span className="h-[5px] w-[5px] rounded-full" style={{ background: classTint(unit.class).color }} />
    </button>
  );
}
