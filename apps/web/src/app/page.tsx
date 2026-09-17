"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { Screen } from "@/components/Screen";
import { TabBar } from "@/components/TabBar";
import { useCampaign } from "@/lib/campaign/CampaignProvider";
import { campaignFromSeed } from "@/lib/campaign/spec";
import { dailyKey, formatMusterDate, seedFromKey } from "@/lib/daily";
import { useEffect, useMemo, useState } from "react";

const STAGE_LABEL: Record<string, string> = { general: "pick a general", draft: "the draft", deploy: "deploy", battle: "the battle", between: "between battles", result: "the result" };

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

export default function TodayPage() {
  const router = useRouter();
  const { engine, hydrated, save, history, start, abandon } = useCampaign();
  // The date is the player's local date, so it is only known on the client: compute after mount to keep
  // the prerendered HTML and the first client render identical.
  const [today, setToday] = useState<{ key: string; seed: number; label: string } | null>(null);
  useEffect(() => {
    const key = dailyKey();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- client-only date, once after mount
    setToday({ key, seed: seedFromKey(key), label: formatMusterDate() });
  }, []);
  const key = today?.key ?? "";
  const seed = today?.seed ?? 0;
  const preview = useMemo(() => (engine && today ? campaignFromSeed(engine, today.seed, today.key) : null), [engine, today]);
  const foes = useMemo(() => {
    if (!engine || !preview) return [];
    return preview.battles.map((b) => {
      const foe = engine.replayDraft(b.foe).army!;
      const g = engine.data.generalById.get(foe.generalId)!;
      return { name: g.name, culture: engine.data.cultures[g.culture]?.name ?? g.culture, terrain: b.terrain };
    });
  }, [engine, preview]);

  // A finished campaign whose result screen has not been reached yet still resumes (the battle may be unwatched).
  const inProgress = hydrated && save && save.stage !== "result" ? save : null;
  const dailyDone = today ? history.find((h) => h.id === key) : undefined;
  const yesterday = history.find((h) => h.kind === "daily" && h.id !== key) ?? history[0];
  const lastFive = history.slice(0, 5);

  const begin = (kind: "daily" | "free") => {
    if (!engine) return;
    if (kind === "daily") start("daily", seed, key);
    else {
      const s = Math.floor(Math.random() * 2147483647);
      start("free", s, `free-${s}`);
    }
    router.push("/general");
  };

  const facts = [
    { k: "SEED", v: today ? String(seed) : "…" },
    { k: "BATTLES", v: "3" },
    { k: "REROLLS", v: String(engine?.data.rules.rerolls ?? 2) },
  ];

  return (
    <Screen>
      <AppHeader />
      <main className="flex grow flex-col gap-3.5 px-[18px] pt-1 pb-4">
        <section className="flex flex-col gap-3.5 rounded-lg border border-accent bg-panel px-[18px] pt-5 pb-[18px]">
          <div className="flex items-baseline justify-between">
            <span className="label text-accent">Today’s muster</span>
            <span className="font-mono text-[10px] text-faint-2">{today?.label ?? ""}</span>
          </div>
          <h1 className="display m-0 text-[30px]">
            One army. Three generals.
            <br />
            One attempt.
          </h1>
          <ul className="m-0 flex list-none flex-col gap-1 p-0">
            {foes.map((f, i) => (
              <li key={i} className="flex items-baseline gap-2 text-[13px]">
                <span className="font-mono text-[10px] text-faint-2">{i + 1}</span>
                <span className="text-bone">{f.name}</span>
                <span className="text-faint">of {f.culture}</span>
                <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.1em] text-dim">{f.terrain}</span>
              </li>
            ))}
            {!foes.length && <li className="font-mono text-[10px] text-faint-2">Mustering the enemy…</li>}
          </ul>
          <div className="flex gap-2.5">
            {facts.map((f) => (
              <div key={f.k} className="flex flex-1 basis-0 flex-col gap-[3px] rounded-md border border-rule-2 bg-panel-2 px-2.5 py-[9px]">
                <span className="label text-[8px] tracking-[0.1em] text-faint-2">{f.k}</span>
                <span className="font-mono text-[13px] text-bone">{f.v}</span>
              </div>
            ))}
          </div>
          {inProgress ? (
            <>
              <Link href={routeFor(inProgress.stage, inProgress.row, inProgress.battleIndex)} className="flex min-h-11 items-center justify-center rounded-md bg-accent-fill px-4 py-[17px] text-[17px] font-semibold text-accent-text no-underline">
                Resume — {inProgress.stage === "draft" ? `row ${inProgress.row + 1} of 8` : inProgress.stage === "general" ? "your general" : `battle ${inProgress.battleIndex + 1}, ${STAGE_LABEL[inProgress.stage]}`}
              </Link>
              {inProgress.kind === "free" && (
                <button type="button" onClick={abandon} className="bg-transparent text-xs text-faint-2 underline">
                  Abandon this free campaign
                </button>
              )}
            </>
          ) : dailyDone ? (
            <div className="flex min-h-11 items-center justify-center rounded-md border border-rule-2 px-4 py-[15px] text-[15px] text-dim">
              Today: {dailyDone.headline}
            </div>
          ) : (
            <button type="button" disabled={!engine || !today} onClick={() => begin("daily")} className="flex min-h-11 items-center justify-center rounded-md bg-accent-fill px-4 py-[17px] text-[17px] font-semibold text-accent-text disabled:opacity-60">
              Draft today’s army
            </button>
          )}
          <div className="text-center text-xs text-faint-2">Draft once, fight three times. About six minutes.</div>
        </section>

        {yesterday && (
          <section className="flex flex-col gap-3 rounded-lg border border-rule-2 bg-panel px-[18px] py-4">
            <div className="flex items-baseline justify-between">
              <span className="label text-faint">{yesterday.kind === "daily" ? "Last daily" : "Last campaign"}</span>
              <span className="font-mono text-[10px]" style={{ color: yesterday.won === yesterday.played && yesterday.played === 3 ? "var(--brass)" : "var(--bad)" }}>
                {yesterday.won === 3 ? "CONQUERED" : `FELL AT BATTLE ${yesterday.played}`}
              </span>
            </div>
            <p className="display m-0 text-[19px] leading-[1.35]">{yesterday.headline}</p>
            <div className="flex items-center gap-2 border-t border-rule-3 pt-3">
              <span className="label text-[9px] tracking-[0.1em] text-faint-2">Last five</span>
              <div className="flex gap-1">
                {lastFive.map((h) => {
                  const w = h.won === 3;
                  return (
                    <div key={h.finishedAt} className="flex h-[18px] w-[18px] items-center justify-center rounded-sm border font-mono text-[10px]" style={{ background: w ? "var(--panel-sel)" : "transparent", borderColor: w ? "#7a6420" : "#3d382f", color: w ? "var(--brass)" : "var(--faint-2)" }}>
                      {w ? "W" : "L"}
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        <div className="flex gap-2.5">
          <button type="button" disabled={!engine || !!inProgress} onClick={() => begin("free")} className="min-h-11 flex-1 basis-0 rounded-md border border-rule-btn bg-transparent px-2.5 py-[15px] text-sm text-bone disabled:opacity-40">
            Free campaign
          </button>
          <button type="button" disabled className="min-h-11 flex-1 basis-0 rounded-md border border-rule-btn bg-transparent px-2.5 py-[15px] text-sm text-faint-2">
            Replay a run
          </button>
        </div>
      </main>
      <TabBar />
    </Screen>
  );
}
