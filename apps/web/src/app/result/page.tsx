"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { decisiveClause, narrateBeats } from "@warlord/engine";
import { AppHeader } from "@/components/AppHeader";
import { Screen } from "@/components/Screen";
import { TabBar } from "@/components/TabBar";
import { useCampaign } from "@/lib/campaign/CampaignProvider";
import { endedLabel } from "@/lib/battleView";
import { PLAN_LABEL, firstName } from "@/lib/text";

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} ${d.toLocaleDateString("en-US", { month: "short" })}`;
}

export default function ResultPage() {
  const router = useRouter();
  const { engine, hydrated, save, battles, score, abandon, setStage } = useCampaign();
  const [copied, setCopied] = useState<string | null>(null);
  const fought = useMemo(() => battles.filter((b) => b.result), [battles]);
  const beatsBy = useMemo(() => fought.map((b) => narrateBeats(b.result!)), [fought]);

  useEffect(() => {
    if (!engine) return;
    if (hydrated && !save) router.replace("/");
    else if (save && !score.over) router.replace(`/deploy/${save.battleIndex + 1}`);
    else if (save && save.stage !== "result") setStage("result");
  }, [engine, hydrated, save, score.over, router, setStage]);

  if (!engine || !save || !fought.length) return <Screen />;
  const general = engine.data.generalById.get(save.draft.generalPool[save.draft.generalIndex!])!;
  const last = fought[fought.length - 1];
  const lastBeats = beatsBy[beatsBy.length - 1];
  const conquered = score.conquered;
  const hisLost = fought.reduce((t, b) => t + b.result!.casualties.B, 0);
  const marks = battles.map((b) => (b.result ? (b.result.winner === "A" ? "W" : "L") : "—"));
  const decisive = decisiveClause(lastBeats);
  const shareLines = [
    `Warlord Draft · ${fmtDate(save.finishedAt ?? save.startedAt)} · ${save.spec.seed}`,
    `me   ${general.name.padEnd(14)} ${marks.join(" ")}`,
    `him  ${battles.map((b) => firstName(b.foeGeneral)).join(" ")}`,
    decisive,
    conquered ? `conquered · ${(score.lossPct * 100).toFixed(0)}% lost` : `fell at battle ${score.played} · ${(score.lossPct * 100).toFixed(0)}% lost`,
  ];
  const shareText = shareLines.join("\n");
  const runText = battles
    .filter((b) => b.play.fought)
    .map((b) => engine.toRunString({ ...save.draft, plan: b.play.plan, deployment: b.play.deployment as ("L" | "C" | "R")[] }))
    .join("\n");

  const copy = async (text: string, what: string) => {
    try {
      if (what === "share" && typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ text });
        return;
      }
      await navigator.clipboard.writeText(text);
      setCopied(what);
      setTimeout(() => setCopied(null), 1600);
    } catch {
      /* user cancelled or clipboard blocked */
    }
  };

  return (
    <Screen>
      <AppHeader />
      <main className="flex grow flex-col gap-4 px-[18px] pb-4">
        <div className="flex items-baseline justify-between">
          <span className="font-mono text-[10px] tracking-[0.14em] text-faint-2">
            {save.kind === "daily" ? save.spec.id.toUpperCase() : "FREE CAMPAIGN"} · SEED {save.spec.seed}
          </span>
        </div>
        <div className="flex flex-col gap-2">
          <span className="font-mono text-[10px] tracking-[0.16em]" style={{ color: conquered ? "var(--brass)" : "var(--bad)" }}>
            {conquered ? "THE PROVINCE IS YOURS" : `THE CAMPAIGN ENDS AT BATTLE ${score.played}`}
          </span>
          <h1 className="display m-0 text-[30px] leading-[1.14]">{lastBeats[lastBeats.length - 1]?.narration}</h1>
          <p className="m-0 text-[13px] text-dim">
            {general.name} of {engine.data.cultures[general.culture]?.name}, on {battles.map((b) => b.spec.terrain).join(", then ")}.
          </p>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {[
            { k: "BATTLES", v: `${score.won}/3`, color: conquered ? "var(--brass)" : "var(--bone)" },
            { k: "YOU LOST", v: `${(score.lossPct * 100).toFixed(0)}%`, color: "var(--brass)" },
            { k: "HE LOST", v: `${(hisLost * 100).toFixed(0)}%`, color: "var(--bad)" },
            { k: "ENDED", v: endedLabel(last.result!.brokeInPhase), color: "var(--bone)" },
          ].map((o) => (
            <div key={o.k} className="flex flex-col gap-[3px] rounded-md border border-rule-2 bg-panel px-2 py-2">
              <span className="font-mono text-[8px] tracking-[0.1em] text-faint-2">{o.k}</span>
              <span className="font-mono text-sm" style={{ color: o.color }}>
                {o.v}
              </span>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-2">
          <span className="label text-faint">How it went</span>
          {fought.map((b, k) => {
            const bts = beatsBy[k];
            const won = b.result!.winner === "A";
            return (
              <div key={k} className="flex flex-col gap-1 border-t border-rule-3 pt-2">
                <div className="flex items-baseline justify-between">
                  <span className="font-mono text-[9px] tracking-[0.1em] text-faint-2">
                    BATTLE {b.index + 1} · {b.foeGeneral.toUpperCase()} · {b.spec.terrain.toUpperCase()} · {PLAN_LABEL[b.play.plan!]}
                  </span>
                  <span className="font-mono text-[9px]" style={{ color: won ? "var(--brass)" : "var(--bad)" }}>
                    {won ? "WON" : "LOST"} {endedLabel(b.result!.brokeInPhase)}
                  </span>
                </div>
                <span className="text-[13px] leading-snug text-dim">{bts[bts.length - 1]?.narration}</span>
                <span className="font-mono text-[10px] text-faint-2">
                  you {b.play.deployment?.filter((f) => f === "L").length} | {b.play.deployment?.filter((f) => f === "C").length} | {b.play.deployment?.filter((f) => f === "R").length} · him{" "}
                  {(["L", "C", "R"] as const).map((f) => b.result!.fronts!.B.find((x) => x.front === f)!.unitIds.length).join(" | ")}
                </span>
              </div>
            );
          })}
        </div>
        <div className="flex flex-col gap-2 rounded-lg border border-rule-2 bg-panel px-4 py-3.5">
          <div className="flex items-baseline justify-between">
            <span className="label text-faint">What gets shared</span>
            <span className="font-mono text-[9px] text-faint-2">NO SPOILERS</span>
          </div>
          <pre className="m-0 font-mono text-[12px] leading-relaxed whitespace-pre-wrap">
            {shareLines.map((l, k) => (
              <div key={k} style={{ color: k === 1 ? "var(--brass)" : k === 2 ? "var(--enemy)" : k === 0 ? "var(--bone)" : "var(--dim)" }}>
                {l}
              </div>
            ))}
          </pre>
        </div>
        <div className="flex gap-2.5">
          <button type="button" onClick={() => copy(shareText, "share")} className="flex min-h-11 grow items-center justify-center rounded-md bg-accent-fill px-4 text-[15px] font-semibold text-accent-text">
            {copied === "share" ? "Copied" : save.kind === "daily" ? "Share today’s result" : "Share the result"}
          </button>
          <button type="button" onClick={() => copy(runText, "run")} className="min-h-11 rounded-md border border-rule-btn bg-transparent px-4 font-mono text-xs text-bone">
            {copied === "run" ? "COPIED" : "RUN"}
          </button>
        </div>
        <div className="flex gap-2.5">
          <Link href="/" className="flex min-h-11 grow items-center justify-center rounded-md border border-rule-btn text-sm text-bone no-underline">
            Back to today
          </Link>
          {save.kind === "free" && (
            <button type="button" onClick={() => { abandon(); router.push("/"); }} className="min-h-11 grow rounded-md border border-rule-btn bg-transparent text-sm text-bone">
              New free campaign
            </button>
          )}
        </div>
      </main>
      <TabBar />
    </Screen>
  );
}
