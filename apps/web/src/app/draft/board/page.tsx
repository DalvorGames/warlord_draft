"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Screen } from "@/components/Screen";
import { useCampaign } from "@/lib/campaign/CampaignProvider";
import { nearestThreshold } from "@/lib/draftRules";
import { SLOT_LABEL, cultureShort, gradeStyle, shortUnitName } from "@/lib/text";

export default function BoardSheetPage() {
  const router = useRouter();
  const { engine, hydrated, save } = useCampaign();
  useEffect(() => {
    if (hydrated && !save) router.replace("/");
  }, [hydrated, save, router]);
  if (!engine || !save || save.draft.generalIndex === null) return <Screen />;
  const state = save.draft;
  const current = save.row;
  const s = engine.summarize(state);
  const row = state.rows[current];
  return (
    <Screen className="justify-end bg-[#0c0b09]">
      <div className="flex shrink-0 flex-col gap-2 px-[18px] pt-5 opacity-35">
        <span className="font-mono text-[11px] tracking-[0.16em] text-dim">ROW {current + 1} OF 8</span>
        <span className="display text-[26px] text-faint-2">
          {cultureShort(engine, row.culture)} · {row.slot}
        </span>
      </div>
      <div className="grow" />
      <div className="flex flex-col rounded-t-[14px] border-t border-rule-2 bg-ground shadow-[0_-18px_40px_rgba(0,0,0,0.5)]">
        <div className="flex justify-center pt-2.5 pb-1">
          <div className="h-1 w-[38px] rounded-sm bg-[#3d382f]" />
        </div>
        <div className="flex items-baseline justify-between px-[18px] pt-1.5 pb-3">
          <div className="flex items-baseline gap-3">
            <span className="display text-[26px]">The whole board</span>
            <span className="font-mono text-[10px] text-faint-2">{s.picksMade} OF 8 TAKEN</span>
          </div>
          <Link href={`/draft/${current + 1}`} className="py-2 text-sm text-bone no-underline">
            Close
          </Link>
        </div>
        <div className="flex flex-col px-[18px] pb-4">
          {state.rows.map((r, i) => {
            const stateOf = i === current ? "now" : r.pick !== null ? "done" : "open";
            return (
              <Link key={i} href={`/draft/${i + 1}`} className="flex gap-3 border-t py-[9px] no-underline" style={{ borderColor: stateOf === "now" ? "var(--accent)" : "var(--rule-3)" }}>
                <div className="flex w-[78px] shrink-0 flex-col gap-0.5 pt-0.5">
                  <span className="font-mono text-[10px] tracking-[0.12em]" style={{ color: stateOf === "now" ? "var(--accent)" : stateOf === "done" ? "var(--brass)" : "var(--dim)" }}>
                    {SLOT_LABEL[r.slot]}
                  </span>
                  <span className="text-[10px] leading-tight text-faint-2">{cultureShort(engine, r.culture)}</span>
                </div>
                <div className="grid min-w-0 grow grid-cols-2 gap-[5px]">
                  {r.cards.map((c, j) => {
                    const u = engine.data.unitById.get(c.unitId)!;
                    const taken = r.pick === j;
                    const g = gradeStyle(u.grade);
                    return (
                      <div key={j} className="flex min-w-0 items-center gap-1.5 rounded-sm border px-[7px] py-[5px]" style={{ background: taken ? "var(--panel-sel)" : "transparent", borderColor: taken ? "var(--accent)" : "var(--rule)" }}>
                        <span className="shrink-0 font-mono text-[9px] font-semibold" style={{ color: taken ? "var(--brass)" : u.grade === "C" || u.grade === "D" || u.grade === "F" ? "var(--faint-2)" : g.bg }}>
                          {u.grade}
                        </span>
                        <span className="overflow-hidden text-[11px] text-ellipsis whitespace-nowrap" style={{ color: taken ? "var(--bone)" : "var(--faint)" }}>
                          {shortUnitName(u)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </Link>
            );
          })}
        </div>
        <div className="flex gap-2.5 px-[18px] pb-[calc(14px+env(safe-area-inset-bottom,14px))]">
          <div className="flex grow flex-col justify-center gap-[3px]">
            <span className="font-mono text-[10px] text-faint-2">
              ELITE {s.eliteUsed} / {s.eliteCap} · REROLLS {state.rerollsLeft}
            </span>
            <span className="text-[11px] text-brass">{nearestThreshold(engine, state, current)}</span>
          </div>
          <Link href={`/draft/${current + 1}`} className="box-border min-h-11 shrink-0 rounded-md bg-accent-fill px-5 py-3.5 text-center text-sm font-semibold text-accent-text no-underline">
            Back to row {current + 1}
          </Link>
        </div>
      </div>
    </Screen>
  );
}
