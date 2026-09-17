"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { Screen } from "@/components/Screen";
import { TabBar } from "@/components/TabBar";
import { TraitChip } from "@/components/ui/TraitChip";
import { useCampaign } from "@/lib/campaign/CampaignProvider";
import { campaignFromSeed } from "@/lib/campaign/spec";
import { dailyKey, seedFromKey } from "@/lib/daily";
import { tierShort } from "@/lib/deployText";
import { cultureColor, cultureShort, TERRAIN_WORD, traitDef } from "@/lib/text";

const STAGE_LABEL: Record<string, string> = { general: "your general", draft: "the draft", deploy: "setting the line", battle: "the report", between: "between battles", result: "the result" };

function routeFor(stage: string, row: number, battle: number): string {
  switch (stage) {
    case "general": return "/general";
    case "draft": return `/draft/${row + 1}`;
    case "deploy": return `/deploy/${battle + 1}`;
    case "battle": return `/battle/${battle + 1}`;
    case "between": return `/between/${battle + 1}`;
    default: return "/result";
  }
}
const longDate = (d: Date) => d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

export default function TodayPage() {
  const router = useRouter();
  const { engine, hydrated, stale, save, history, start, abandon } = useCampaign();
  const [today, setToday] = useState<{ key: string; seed: number; label: string } | null>(null);
  useEffect(() => {
    const key = dailyKey();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- client-only date, once after mount
    setToday({ key, seed: seedFromKey(key), label: longDate(new Date()) });
  }, []);
  const preview = useMemo(() => (engine && today ? campaignFromSeed(engine, today.seed, today.key) : null), [engine, today]);
  const foes = useMemo(() => {
    if (!engine || !preview) return [];
    return preview.battles.map((b) => {
      const foe = engine.replayDraft(b.foe).army!;
      const g = engine.data.generalById.get(foe.generalId)!;
      return { name: g.name, culture: g.culture, traits: g.traits, terrain: b.terrain, tier: b.tier };
    });
  }, [engine, preview]);

  const inProgress = hydrated && save && save.stage !== "result" && !save.finishedAt ? save : null;
  const dailyDone = today ? history.find((h) => h.id === today.key) : undefined;
  const lastFive = history.slice(0, 5);
  const streak = (() => { let n = 0; for (const h of history) { if (h.won === 3) n++; else break; } return n; })();

  const begin = (kind: "daily" | "free") => {
    if (!engine || !today) return;
    if (kind === "daily") start("daily", today.seed, today.key);
    else {
      const s = Math.floor(Math.random() * 2147483647);
      start("free", s, `free-${s}`);
    }
    router.push("/general");
  };
  const rerolls = engine?.data.rules.rerolls ?? 3;

  return (
    <Screen>
      <AppHeader />
      <main className="flex grow flex-col gap-5 px-5 pb-5">
        <div className="flex flex-col gap-1 pt-2">
          <span className="label text-faint">TODAY&apos;S MUSTER</span>
          <h1 className="display m-0 text-[30px] leading-[1.1]">{today?.label ?? " "}</h1>
        </div>
        <section className="flex flex-col gap-4 rounded-lg border border-rule bg-panel px-4 pt-4 pb-4">
          <div className="flex items-center gap-4">
            <div className="flex gap-2">
              {[0, 1, 2].map((k) => (
                <div key={k} className="h-[46px] w-[32px] rounded-[3px] border border-rule-btn bg-sunk">
                  <div className="m-[3px] h-[38px] rounded-[2px] border border-raised" />
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-0.5 text-[15px]">
              <span className="text-bone">Three generals are waiting.</span>
              <span className="text-dim">They turn over when you start. Take one.</span>
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="label text-faint">THE THREE BATTLES</span>
            <span className="label text-dim">THEY CLIMB</span>
          </div>
          <div className="flex flex-col">
            {foes.length ? foes.map((f, i) => {
              const cc = cultureColor(f.culture);
              return (
                <div key={i} className="flex flex-col gap-2 border-t border-rule py-3 first:border-t-0 first:pt-0">
                  <div className="flex items-baseline gap-3">
                    <span className="font-mono text-[13px] text-faint">{i + 1}</span>
                    <span className="min-w-0 grow truncate text-[17px] text-bone">
                      {f.name} <span style={{ color: cc.bright }}>of {cultureShort(engine!, f.culture)}</span>
                    </span>
                    <span className="label shrink-0 text-dim">{TERRAIN_WORD[f.terrain]}</span>
                  </div>
                  <div className="flex items-center gap-3 pl-6">
                    <div className="flex min-w-0 grow flex-wrap gap-1.5">
                      {f.traits.length ? f.traits.map((t) => <TraitChip key={t} rule={traitDef(engine!, t).kind === "rule"}>{traitDef(engine!, t).name}</TraitChip>) : <span className="text-xs text-faint">No traits</span>}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="flex items-end gap-px" aria-hidden="true">
                        {[0, 1, 2].map((k) => <span key={k} className="w-1.5 rounded-[1px]" style={{ height: 5 + k * 3, background: k <= f.tier ? "var(--bone)" : "var(--rule-btn)" }} />)}
                      </span>
                      <span className="text-xs text-dim">{tierShort(f.tier)}</span>
                    </div>
                  </div>
                </div>
              );
            }) : (
              <div className="py-2 text-[13px] text-dim">{engine ? "Turning over today's board…" : "Turning over today's board…"}</div>
            )}
          </div>
          <span className="label text-faint">{rerolls} REROLLS, ONE FREE FOR EVERYONE · ABOUT 6 MIN</span>
          {stale && !inProgress && <div className="text-xs leading-snug text-dim">Yesterday&apos;s run could not be read. Start today&apos;s.</div>}
          {inProgress ? (
            <>
              <Link href={routeFor(inProgress.stage, inProgress.row, inProgress.battleIndex)} className="box-border flex min-h-12 w-full items-center justify-center rounded-[3px] bg-bone px-4 py-4 text-[17px] font-semibold text-ink no-underline">
                Resume — {inProgress.stage === "draft" ? `row ${inProgress.row + 1} of 8` : inProgress.stage === "general" ? "your general" : `battle ${inProgress.battleIndex + 1}, ${STAGE_LABEL[inProgress.stage]}`}
              </Link>
              {inProgress.kind === "free" && (
                <button type="button" onClick={abandon} className="border-0 bg-transparent text-xs text-faint underline">
                  Abandon this free campaign
                </button>
              )}
            </>
          ) : dailyDone ? (
            <>
              <div className="flex flex-col gap-1 rounded-[3px] border border-rule bg-sunk px-4 py-3">
                <span className="label text-faint">TODAY</span>
                <span className="display text-[22px] leading-tight">{dailyDone.headline}</span>
                <span className="text-xs text-dim">{dailyDone.general} · {dailyDone.won} of 3 · {(dailyDone.lossPct * 100).toFixed(0)}% lost</span>
              </div>
              <button type="button" disabled={!engine || !today} onClick={() => begin("free")} className="box-border flex min-h-11 w-full items-center justify-center rounded-[3px] border border-rule-btn bg-transparent px-4 py-3 text-[15px] text-bone disabled:opacity-60">
                Play a free run
              </button>
            </>
          ) : (
            <>
              <button type="button" disabled={!engine || !today} onClick={() => begin("daily")} className="box-border flex min-h-12 w-full items-center justify-center rounded-[3px] bg-bone px-4 py-4 text-[17px] font-semibold text-ink disabled:opacity-60">
                Draft today&apos;s army
              </button>
              <span className="text-center text-[13px] text-dim">Four screens, about six minutes.</span>
            </>
          )}
        </section>

        <div className="flex flex-col gap-2.5">
          <div className="flex items-baseline justify-between">
            <span className="label text-faint">THE LAST FIVE</span>
            <span className="label text-bone">STREAK {streak}</span>
          </div>
          <div className="flex gap-2">
            {lastFive.length ? lastFive.map((h) => {
              const w = h.won === 3;
              return (
                <div key={h.finishedAt} className="flex min-h-[64px] grow basis-0 flex-col items-center justify-center gap-1 rounded-[4px] border border-rule bg-panel px-1 py-2">
                  <span className="font-mono text-[20px] font-semibold" style={{ color: w ? "var(--bone)" : "var(--dim)" }}>{w ? "W" : "L"}</span>
                  <span className="font-mono text-[11px] tracking-[0.1em] text-faint">{h.shape ?? `${h.won}·${h.played}`}</span>
                </div>
              );
            }) : <div className="text-[13px] text-dim">Nothing yet. Your first campaign lands here.</div>}
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="label text-faint">THE LADDER</span>
          <span className="text-[13px] leading-snug text-dim">Ranked by battles won, then by losses. Standings open when today&apos;s board closes and everyone&apos;s runs can be compared.</span>
        </div>
      </main>
      <TabBar />
    </Screen>
  );
}
