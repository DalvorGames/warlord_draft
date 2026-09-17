"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { Screen } from "@/components/Screen";
import { TabBar } from "@/components/TabBar";
import { useCampaign } from "@/lib/campaign/CampaignProvider";
import { campaignFromSeed } from "@/lib/campaign/spec";
import { dailyKey, seedFromKey } from "@/lib/daily";
import { cultureColor, cultureShort } from "@/lib/text";

const STAGE_LABEL: Record<string, string> = { general: "pick a general", draft: "the draft", deploy: "the field", battle: "the battle", between: "between battles", result: "the result" };

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
const longDate = (d: Date) => d.toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long" });
const dayOf = (iso: string) => new Date(iso).toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();

export default function TodayPage() {
  const router = useRouter();
  const { engine, hydrated, save, history, start, abandon } = useCampaign();
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
      return { name: g.name, culture: g.culture, short: cultureShort(engine, g.culture), terrain: b.terrain };
    });
  }, [engine, preview]);

  const inProgress = hydrated && save && save.stage !== "result" ? save : null;
  const dailyDone = today ? history.find((h) => h.id === today.key) : undefined;
  const lastFive = history.slice(0, 5);

  const begin = (kind: "daily" | "free") => {
    if (!engine || !today) return;
    if (kind === "daily") start("daily", today.seed, today.key);
    else {
      const s = Math.floor(Math.random() * 2147483647);
      start("free", s, `free-${s}`);
    }
    router.push("/general");
  };

  return (
    <Screen>
      <AppHeader />
      <main className="flex grow flex-col gap-4 px-[18px] pb-4">
        <div className="display pt-1 text-center text-[22px] tracking-[0.14em] text-bone">TODAY’S MUSTER</div>
        <section className="flex flex-col items-center gap-3 rounded-lg border border-rule bg-panel px-5 pt-[22px] pb-[18px] text-center" style={{ borderTop: "3px solid var(--rust)" }}>
          <div className="flex items-end gap-1">
            {[34, 52, 34].map((w, k) => (
              <div key={k} className="flex h-[34px] items-center justify-center rounded-[3px] border border-dashed border-rule-btn font-mono text-xs text-faint-2" style={{ width: w }}>
                ?
              </div>
            ))}
          </div>
          <div className="display text-[26px] leading-[1.15]">{today?.label ?? " "}</div>
          {foes.length ? (
            <ul className="m-0 flex w-full list-none flex-col gap-1 p-0 text-left">
              {foes.map((f, i) => (
                <li key={i} className="flex items-baseline gap-2 text-[13px]">
                  <span className="font-mono text-[10px] text-faint-2">{i + 1}</span>
                  <span className="text-bone">{f.name}</span>
                  <span style={{ color: cultureColor(f.culture).bright }}>of {f.short}</span>
                  <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.1em] text-dim">{f.terrain}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-[13px] leading-normal text-dim">Three generals, three grounds, one army.<br />The same for everyone. One attempt.</div>
          )}
          <div className="font-mono text-[10px] tracking-[0.12em] text-faint-2">
            SEED {today ? today.seed : "…"} · {engine?.data.rules.rerolls ?? 2} REROLLS · ABOUT 6 MIN
          </div>
          {inProgress ? (
            <>
              <Link href={routeFor(inProgress.stage, inProgress.row, inProgress.battleIndex)} className="box-border mt-1 flex min-h-11 w-full items-center justify-center rounded-[3px] bg-bone px-4 py-4 text-base font-semibold text-ink no-underline">
                Resume — {inProgress.stage === "draft" ? `row ${inProgress.row + 1} of 8` : inProgress.stage === "general" ? "your general" : `battle ${inProgress.battleIndex + 1}, ${STAGE_LABEL[inProgress.stage]}`}
              </Link>
              {inProgress.kind === "free" && (
                <button type="button" onClick={abandon} className="bg-transparent text-xs text-faint-2 underline">
                  Abandon this free campaign
                </button>
              )}
            </>
          ) : dailyDone ? (
            <div className="box-border mt-1 flex min-h-11 w-full items-center justify-center rounded-[3px] border border-rule px-4 py-[15px] text-[15px] text-dim">Today: {dailyDone.headline}</div>
          ) : (
            <button type="button" disabled={!engine || !today} onClick={() => begin("daily")} className="box-border mt-1 flex min-h-11 w-full items-center justify-center rounded-[3px] bg-bone px-4 py-4 text-base font-semibold text-ink disabled:opacity-60">
              Draft the army
            </button>
          )}
        </section>

        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between">
            <span className="font-mono text-[9px] tracking-[0.16em] text-faint">THE LAST FIVE</span>
          </div>
          <div className="flex gap-[7px]">
            {lastFive.length ? (
              lastFive.map((h) => {
                const w = h.won === 3;
                return (
                  <div key={h.finishedAt} className="flex min-h-11 grow basis-0 flex-col items-center gap-[5px] rounded-[3px] border px-1 pt-[9px] pb-2" style={{ background: w ? "var(--raised)" : "var(--sunk)", borderColor: w ? "var(--rule-btn)" : "var(--raised)" }}>
                    <span className="font-mono text-[8px] tracking-[0.1em] text-faint-2">{dayOf(h.finishedAt)}</span>
                    <span className="display text-[20px] leading-none" style={{ color: w ? "var(--bone)" : "var(--faint-2)" }}>
                      {w ? "W" : "L"}
                    </span>
                    <span className="font-mono text-[8px] text-faint-2">{h.won}·{h.played}</span>
                  </div>
                );
              })
            ) : (
              <div className="text-xs text-faint-2">Nothing yet. Your first campaign lands here.</div>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <button type="button" disabled={!engine || !today || !!inProgress} onClick={() => begin("free")} className="box-border min-h-11 grow basis-0 rounded-[3px] border border-rule bg-transparent px-1.5 py-3 text-[13px] text-center disabled:opacity-40" style={{ color: "var(--center)" }}>
            Free run
          </button>
          <button type="button" disabled className="box-border min-h-11 grow basis-0 rounded-[3px] border border-dashed border-raised bg-transparent px-1.5 py-3 text-[13px] text-faint-2">
            Replay a seed
          </button>
        </div>
      </main>
      <TabBar />
    </Screen>
  );
}
