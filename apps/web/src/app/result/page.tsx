"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { decisiveClause, narrateBeats } from "@warlord/engine";
import { Screen } from "@/components/Screen";
import { useCampaign } from "@/lib/campaign/CampaignProvider";
import { endedLabel } from "@/lib/battleView";
import { PLAN_LABEL, cultureColor, cultureName, firstName } from "@/lib/text";

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase()} ${d.getDate()} ${d.toLocaleDateString("en-US", { month: "short" }).toUpperCase()}`;
}

export default function ResultPage() {
  const router = useRouter();
  const { engine, hydrated, save, army, battles, score, abandon, setStage } = useCampaign();
  const [copied, setCopied] = useState<string | null>(null);
  const fought = useMemo(() => battles.filter((b) => b.result), [battles]);
  const beatsBy = useMemo(() => fought.map((b) => narrateBeats(b.result!)), [fought]);

  useEffect(() => {
    if (!engine) return;
    if (hydrated && !save) router.replace("/");
    else if (save && !score.over) router.replace(`/deploy/${save.battleIndex + 1}`);
    else if (save && save.stage !== "result") setStage("result");
  }, [engine, hydrated, save, score.over, router, setStage]);

  if (!engine || !save || !army || !fought.length) return <Screen />;
  const general = engine.data.generalById.get(army.generalId)!;
  const mine = cultureColor(general.culture);
  const last = fought[fought.length - 1];
  const lastBeats = beatsBy[beatsBy.length - 1];
  const conquered = score.conquered;
  const hisLost = fought.reduce((t, b) => t + b.result!.casualties.B, 0);
  const marks = battles.map((b) => (b.result ? (b.result.winner === "A" ? "W" : "L") : "—"));
  const shareLines = [
    `Warlord Draft · ${fmtDate(save.finishedAt ?? save.startedAt).slice(4)} · ${save.spec.seed}`,
    `me   ${general.name.padEnd(14)} ${marks.join(" ")}`,
    `him  ${battles.map((b) => firstName(b.foeGeneral)).join(" ")}`,
    decisiveClause(lastBeats),
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
      /* cancelled or blocked */
    }
  };

  return (
    <Screen>
      <header className="flex h-[52px] shrink-0 items-center justify-between pr-2.5 pl-1.5">
        <Link href="/" aria-label="Close" className="flex h-11 w-11 items-center justify-center text-xl text-dim no-underline">
          ×
        </Link>
        <span className="font-mono text-[11px] tracking-[0.16em] text-dim">
          {fmtDate(save.finishedAt ?? save.startedAt)} · {save.spec.seed}
        </span>
        <Link href={`/battle/${last.index + 1}`} className="flex h-11 min-w-11 items-center justify-center px-2 text-[13px] text-faint-2 no-underline">
          Replay
        </Link>
      </header>
      <main className="flex grow flex-col gap-3 px-[18px] pb-4">
        <div className="flex flex-col gap-1.5">
          <span className="font-mono text-[10px] tracking-[0.18em]" style={{ color: conquered ? mine.bright : "var(--bad)" }}>
            {conquered ? "THE PROVINCE IS YOURS" : `THE CAMPAIGN ENDS AT BATTLE ${score.played}`}
          </span>
          <h1 className="display m-0 text-[28px] leading-[1.14]">{lastBeats[lastBeats.length - 1]?.narration}</h1>
          <p className="m-0 text-[13px] text-dim">
            {general.name} of {cultureName(engine, general.culture)}, on {battles.map((b) => b.spec.terrain).join(", then ")}.
          </p>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {[
            { k: "BATTLES", v: `${score.won}/3`, color: conquered ? mine.bright : "var(--bone)" },
            { k: "YOU LOST", v: `${(score.lossPct * 100).toFixed(0)}%`, color: mine.bright },
            { k: "HE LOST", v: `${(hisLost * 100).toFixed(0)}%`, color: "var(--dim)" },
            { k: "ENDED", v: endedLabel(last.result!.brokeInPhase), color: "var(--bone)" },
          ].map((o) => (
            <div key={o.k} className="flex flex-col gap-[3px] rounded-[3px] border border-rule bg-panel px-2 py-2">
              <span className="font-mono text-[8px] tracking-[0.08em] text-faint-2">{o.k}</span>
              <span className="font-mono text-[15px]" style={{ color: o.color }}>
                {o.v}
              </span>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-2 rounded-[4px] border border-rule bg-panel px-4 py-3">
          <span className="font-mono text-[9px] tracking-[0.16em] text-faint">THE THREE BATTLES</span>
          {fought.map((b, k) => {
            const bts = beatsBy[k];
            const won = b.result!.winner === "A";
            const his = cultureColor(b.foeCulture);
            const shape = (dep: readonly (string | null)[] | null | undefined) => ["L", "C", "R"].map((f) => dep?.filter((x) => x === f).length ?? 0).join(" | ");
            return (
              <div key={k} className="flex flex-col gap-1 border-t border-raised pt-2">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="min-w-0 truncate font-mono text-[9px] tracking-[0.1em]" style={{ color: his.bright }}>
                    {b.index + 1} · {b.foeGeneral.toUpperCase()} · {b.spec.terrain.toUpperCase()} · {PLAN_LABEL[b.play.plan!]}
                  </span>
                  <span className="shrink-0 font-mono text-[9px]" style={{ color: won ? mine.bright : "var(--bad)" }}>
                    {won ? "WON" : "LOST"} {endedLabel(b.result!.brokeInPhase)}
                  </span>
                </div>
                <span className="text-[13px] leading-snug text-dim">{bts[bts.length - 1]?.narration}</span>
                <span className="font-mono text-[10px] text-faint-2">
                  you {shape(b.play.deployment)} · him {(["L", "C", "R"] as const).map((f) => b.result!.fronts!.B.find((x) => x.front === f)!.unitIds.length).join(" | ")}
                </span>
              </div>
            );
          })}
        </div>
        <div className="flex flex-col gap-1.5 rounded-[4px] border border-dashed border-rule-btn bg-sunk px-4 py-3">
          <div className="flex items-baseline justify-between">
            <span className="font-mono text-[9px] tracking-[0.16em] text-faint">WHAT GETS SHARED</span>
            <span className="font-mono text-[8px] text-faint-2">NO SPOILERS</span>
          </div>
          <div className="flex flex-col gap-0.5 font-mono text-[11px] leading-normal">
            {shareLines.map((l, k) => (
              <span key={k} className="whitespace-pre" style={{ color: k === 1 ? mine.bright : k === 2 ? "var(--dim)" : k === 0 ? "var(--bone)" : "var(--dim)" }}>
                {l}
              </span>
            ))}
          </div>
        </div>
      </main>
      <div className="flex shrink-0 flex-col gap-2 border-t border-raised bg-sunk px-[18px] pt-3 pb-[calc(14px+env(safe-area-inset-bottom,14px))]">
        <div className="flex gap-[9px]">
          <button type="button" onClick={() => copy(shareText, "share")} className="box-border min-h-12 grow rounded-[3px] border border-bone bg-bone px-4 py-[15px] text-base font-semibold text-ink">
            {copied === "share" ? "Copied" : save.kind === "daily" ? "Share today’s result" : "Share the result"}
          </button>
          <button type="button" aria-label="Copy the run string" onClick={() => copy(runText, "run")} className="box-border min-h-12 w-14 rounded-[3px] border border-rule-btn bg-transparent font-mono text-[11px] text-bone">
            {copied === "run" ? "OK" : "RUN"}
          </button>
        </div>
        <div className="flex gap-2">
          <Link href="/" className="flex min-h-9 grow items-center justify-center py-2 text-sm text-dim no-underline">
            Back to today
          </Link>
          {save.kind === "free" && (
            <button type="button" onClick={() => { abandon(); router.push("/"); }} className="min-h-9 grow bg-transparent py-2 text-sm text-dim">
              New free run
            </button>
          )}
        </div>
      </div>
    </Screen>
  );
}
