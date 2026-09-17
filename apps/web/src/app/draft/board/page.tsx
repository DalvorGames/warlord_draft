"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Screen } from "@/components/Screen";
import { Token } from "@/components/ui/Token";
import { TraitChip } from "@/components/ui/TraitChip";
import { useCampaign } from "@/lib/campaign/CampaignProvider";
import { boardGap, traitTally } from "@/lib/draftRules";
import { CLASS_WORD, SLOT_LABEL, SLOT_QUESTION, cultureColor, cultureShort, gradeStyle, shortUnitName } from "@/lib/text";
import { isElite } from "@/lib/text";

export default function BoardSheetPage() {
  const router = useRouter();
  const { engine, hydrated, save } = useCampaign();
  useEffect(() => {
    if (hydrated && !save) router.replace("/");
  }, [hydrated, save, router]);
  if (!engine || !save || save.draft.generalIndex === null) return <Screen />;
  const state = save.draft;
  const current = save.row;
  const row = state.rows[current];
  const tally = traitTally(engine, state);
  const back = `/draft/${current + 1}`;
  return (
    <Screen className="justify-end" style={{ background: "#0a0907" }}>
      <div className="flex shrink-0 flex-col gap-2 px-5 pt-5 opacity-30">
        <span className="label text-dim">ROW {current + 1} OF 8 · {SLOT_LABEL[row.slot]}</span>
        <span className="display text-[26px] text-faint">{SLOT_QUESTION[row.slot]}</span>
      </div>
      <div className="grow" />
      <div className="flex max-h-[88dvh] flex-col rounded-t-[14px] border-t border-rule-btn bg-panel" style={{ boxShadow: "0 -12px 40px rgba(0,0,0,0.55)", animation: "wdsheet 260ms ease-out 1" }}>
        <div className="flex justify-center pt-2.5 pb-1">
          <div className="h-1 w-[38px] rounded-sm bg-rule-btn" />
        </div>
        <div className="flex items-start justify-between gap-3 px-5 pt-1 pb-3">
          <div className="flex flex-col gap-0.5">
            <span className="display text-[28px] leading-tight">Your board</span>
            <span className="text-[13px] text-dim">{boardGap(engine, state)}</span>
          </div>
          <Link href={back} className="shrink-0 py-2 text-[15px] text-bone no-underline">Close</Link>
        </div>
        <div className="min-h-0 overflow-y-auto px-5 pb-[calc(20px+env(safe-area-inset-bottom,16px))]">
          <div className="flex flex-col">
            {state.rows.map((r, i) => {
              const now = i === current;
              const u = r.pick === null ? null : engine.data.unitById.get(r.cards[r.pick].unitId)!;
              const cc = u ? cultureColor(u.culture) : null;
              return (
                <Link key={i} href={`/draft/${i + 1}`} className="-mx-2 flex min-h-[60px] items-center gap-3 rounded-md px-2 py-2 no-underline" style={{ border: `1px solid ${now ? "var(--rust)" : "transparent"}` }}>
                  <span className="w-3 font-mono text-[13px]" style={{ color: now ? "var(--rust)" : "var(--faint)" }}>{i + 1}</span>
                  <span className="w-[74px] font-mono text-[11px] tracking-[0.14em]" style={{ color: now ? "var(--rust)" : "var(--dim)" }}>{SLOT_LABEL[r.slot]}</span>
                  {u ? (
                    <>
                      <Token unit={u} size={44} />
                      <div className="flex min-w-0 grow flex-col gap-0.5">
                        <span className="truncate text-[15px] text-bone">{shortUnitName(u)}</span>
                        <span className="label text-faint">{CLASS_WORD[u.class]} <span style={{ color: cc!.bright }}>{cultureShort(engine, u.culture).toUpperCase()}</span></span>
                      </div>
                      <span className="font-mono text-[13px] font-semibold" style={{ color: isElite(u.grade) ? "var(--bone)" : gradeStyle(u.grade).text }}>{u.grade}</span>
                    </>
                  ) : (
                    <>
                      <span className="h-11 w-11 rounded-md border border-dashed" style={{ borderColor: now ? "var(--rust)" : "var(--rule-btn)" }} />
                      <span className="text-[15px] text-dim">{now ? "This row" : "Not yet"}</span>
                    </>
                  )}
                </Link>
              );
            })}
          </div>
          <div className="mt-4 flex flex-col gap-2.5 border-t border-rule pt-4">
            <div className="flex items-baseline justify-between">
              <span className="label text-faint">TRAIT TALLY</span>
              <span className="label text-dim">THE GENERAL COUNTS AS ONE</span>
            </div>
            {tally.map((t) => (
              <div key={t.id} className="flex items-center justify-between gap-3">
                <TraitChip state={t.state} rule={t.kind === "rule"}>{t.name}</TraitChip>
                <span className="text-right text-[13px]" style={{ color: t.state === "near" ? cultureColor(engine.data.generalById.get(state.generalPool[state.generalIndex!])!.culture).bright : "var(--dim)" }}>{t.caption}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Screen>
  );
}
