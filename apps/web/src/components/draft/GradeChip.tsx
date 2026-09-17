import type { Grade } from "@warlord/engine";
import { gradeStyle } from "@/lib/text";

export function GradeChip({ grade, small }: { grade: Grade; small?: boolean }) {
  const s = gradeStyle(grade);
  return (
    <span className={`shrink-0 rounded-sm border font-mono font-semibold ${small ? "px-1 text-[9px]" : "px-[7px] py-0.5 text-xs"}`} style={{ background: s.bg, color: s.text, borderColor: s.edge }}>
      {grade}
    </span>
  );
}
