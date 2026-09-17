"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { decisiveClause, narrateBeats, turningPoint, whyLine, traitWord } from "@warlord/engine";
import { HeaderLink, RunHeader } from "@/components/RunHeader";
import { Screen } from "@/components/Screen";
import { TraitChip } from "@/components/ui/TraitChip";
import { LineReveal } from "@/components/ui/LineReveal";
import { useCampaign } from "@/lib/campaign/CampaignProvider";
import { chronicle, endedLabel } from "@/lib/battleView";
import { TERRAIN_WORD, cultureColor, cultureShort, firstName, traitDef } from "@/lib/text";

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase()} ${d.getDate()} ${d.toLocaleDateString("en-US", { month: "short" }).toUpperCase()}`;
}

export default function ResultPage() {
  const router = useRouter();
  const { engine, hydrated, save, army, general, battles, score, abandon, setStage } = useCampaign();
  const [copied, setCopied] = useState<string | null>(null);
  const [shownBattle, setShownBattle] = useState<number | null>(null);
  const fought = useMemo(() => battles.filter((b) => b.result), [battles]);
  const beatsBy = useMemo(() => fought.map((b) => narrateBeats(b.result!)), [fought]);

  useEffect(() => {
    if (!engine) return;
    if (hydrated && !save) router.replace("/");
    else if (save && !score.over) router.replace(`/deploy/${save.battleIndex + 1}`);
    else if (save && save.stage !== "result") setStage("result");
  }, [engine, hydrated, save, score.over, router, setStage]);

  if (!engine || !save || !army || !general || !fought.length) return <Screen />;
  const mine = cultureColor(general.culture);
  const last = fought[fought.length - 1];
  const lastBeats = beatsBy[beatsBy.length - 1];
  const conquered = score.conquered;
  const hisLost = fought.reduce((t, b) => t + b.result!.casualties.B, 0);
  const tp = conquered ? null : turningPoint(lastBeats);
  const shown = shownBattle ?? last.index;
  const shownB = battles[shown];
  const shape = (dep: readonly (string | null)[] | null | undefined) => ["L", "C", "R"].map((f) => dep?.filter((x) => x === f).length ?? 0).join(" | ");
  const shareLines = [
    `Warlord Draft · ${fmtDate(save.finishedAt ?? save.startedAt).slice(4)} · ${save.spec.seed}`,
    `me   ${shape(last.play.deployment)}   ${general.name}`,
    conquered ? `him  ${battles.map((b) => firstName(b.foeGeneral.name)).join(" · ")}` : `him  ${shape(last.foe.deployment)}   ${last.foeGeneral.name}`,
    conquered ? `conquered · ${(score.lossPct * 100).toFixed(0)}% lost` : `${decisiveClause(lastBeats)}\nfell at battle ${score.played} · ${(score.lossPct * 100).toFixed(0)}% lost`,
  ];
  const shareText = shareLines.join("\n");
  const runText = battles.filter((b) => b.play.fought).map((b) => engine.toRunString({ ...save.draft, plan: b.play.plan, deployment: b.play.deployment as ("L" | "C" | "R")[] })).join("\n");
  const copy = async (text: string, what: string) => {
    try {
      if (what === "share" && typeof navigator !== "undefined" && navigator.share) { await navigator.share({ text }); return; }
      await navigator.clipboard.writeText(text);
      setCopied(what);
      setTimeout(() => setCopied(null), 1600);
    } catch { /* cancelled or blocked */ }
  };
  const tiles = conquered
    ? [{ k: "BATTLES", v: "3 / 3" }, { k: "GROUNDS", v: battles.map((b) => TERRAIN_WORD[b.spec.terrain].charAt(0)).join(" · ") }, { k: "YOU LOST", v: `${(score.lossPct * 100).toFixed(0)}%` }, { k: "THEY LOST", v: `${(hisLost * 100).toFixed(0)}%` }]
    : [{ k: "BATTLES", v: `${score.won} / 3` }, { k: "ENDED", v: endedLabel(last.result!.brokeInPhase) }, { k: "YOU LOST", v: `${(last.result!.casualties.A * 100).toFixed(0)}%` }, { k: "HE LOST", v: `${(last.result!.casualties.B * 100).toFixed(0)}%` }];

  return (
    <Screen>
      <RunHeader close="/" label={`${fmtDate(save.finishedAt ?? save.startedAt)} · ${save.spec.seed}`} right={<HeaderLink href={`/battle/${last.index + 1}`}>Replay</HeaderLink>} />
      <main className="flex grow flex-col gap-5 px-5 pb-4">
        <div className="flex flex-col gap-2">
          <span className="label" style={{ color: conquered ? mine.bright : "var(--rust)" }}>{conquered ? "THE FIELD IS YOURS · THREE OF THREE" : `THE CAMPAIGN ENDS AT BATTLE ${score.played} · THE TURNING POINT`}</span>
          <h1 className="display m-0 text-[30px] leading-[1.14]">{conquered ? `Conquered with ${general.name}.` : tp!.text}</h1>
          {conquered ? (
            <p className="m-0 text-[15px] leading-snug text-dim">Three generals, three grounds, one army. {general.name} of {cultureShort(engine, general.culture)} against {battles.map((b) => firstName(b.foeGeneral.name)).join(", ")}.</p>
          ) : (
            <p className="m-0 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[15px] leading-snug text-dim">
              {tp!.trait && <><TraitChip rule={traitDef(engine, tp!.trait === "furor_spent" ? "furor" : tp!.trait).kind === "rule"}>{traitWord(tp!.trait)}</TraitChip><span>did it.</span></>}
              <span>{general.name} of {cultureShort(engine, general.culture)}, on {last.spec.terrain}, against {last.foeGeneral.name}.</span>
            </p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {tiles.map((o) => (
            <div key={o.k} className="flex flex-col gap-1 rounded-md border border-rule bg-panel px-3.5 py-3">
              <span className="label text-faint">{o.k}</span>
              <span className="font-mono text-[17px] text-bone">{o.v}</span>
            </div>
          ))}
        </div>
        {conquered ? (
          <div className="flex flex-col">
            <span className="label pb-2 text-faint">THE THREE BATTLES</span>
            {fought.map((b, k) => {
              const cc = cultureColor(b.foeGeneral.culture);
              const on = shown === b.index;
              return (
                <button key={k} type="button" onClick={() => setShownBattle(b.index)} aria-pressed={on} className="-mx-2 flex flex-col gap-1 rounded-md border-0 border-t border-rule bg-transparent px-2 py-3 text-left" style={{ background: on ? "var(--panel)" : "transparent" }}>
                  <div className="flex items-baseline gap-3">
                    <span className="font-mono text-[13px] text-faint">{b.index + 1}</span>
                    <span className="min-w-0 grow truncate text-[17px] text-bone">{b.foeGeneral.name} <span style={{ color: cc.bright }}>of {cultureShort(engine, b.foeGeneral.culture)}</span></span>
                    <span className="label text-dim">{TERRAIN_WORD[b.spec.terrain]}</span>
                  </div>
                  <span className="pl-6 text-[15px] leading-snug text-dim">{chronicle(beatsBy[k]).filter((l) => l.key).map((l) => l.text).join(" ") || beatsBy[k][beatsBy[k].length - 1].narration}</span>
                  <span className="label pl-6 text-faint">{(b.result!.casualties.A * 100).toFixed(0)}% LOST</span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col">
            <span className="label pb-2 text-faint">HOW IT WENT</span>
            {chronicle(lastBeats).map((l, k) => (
              <div key={k} className="flex gap-4 border-t border-rule py-2.5">
                <span className="label w-[60px] shrink-0 pt-0.5" style={{ color: l.key ? "var(--bone)" : "var(--faint)" }}>{l.label}</span>
                <span className="text-[15px] leading-snug" style={{ color: l.key ? "var(--bone)" : "var(--dim)" }}>{l.text}</span>
              </div>
            ))}
          </div>
        )}
        {shownB?.result && (
          <div className="flex flex-col gap-2.5">
            <div className="flex items-baseline justify-between">
              <span className="label text-faint">{conquered ? `BATTLE ${shown + 1}, THE LINES` : "THE LINES, REVEALED"}</span>
              {conquered && <span className="label text-dim">TAP A BATTLE ABOVE FOR ITS LINES</span>}
            </div>
            <LineReveal engine={engine} mine={{ ...army, deployment: shownB.play.deployment as ("L" | "C" | "R")[] }} his={shownB.foe} result={shownB.result} size={40} mineColor={mine.bright} hisColor={cultureColor(shownB.foeGeneral.culture).bright} />
            <span className="text-[15px] leading-snug text-dim">{whyLine(engine.data, shownB.result, narrateBeats(shownB.result))}</span>
          </div>
        )}
        <div className="flex flex-col gap-1.5">
          <span className="label text-faint">THE LADDER</span>
          <span className="text-[13px] leading-snug text-dim">Ranked by battles won, then by losses. Standings open when today&apos;s board closes.</span>
        </div>
        <div className="flex flex-col gap-1.5 rounded-md border border-dashed border-rule-btn bg-sunk px-4 py-3">
          <div className="flex items-baseline justify-between">
            <span className="label text-faint">WHAT GETS SHARED</span>
            <span className="label text-faint">NO SPOILERS</span>
          </div>
          <pre className="m-0 font-mono text-[13px] leading-relaxed whitespace-pre-wrap text-dim">{shareText}</pre>
        </div>
      </main>
      <div className="sticky bottom-0 z-30 mt-auto flex shrink-0 flex-col gap-2 border-t border-raised bg-sunk px-5 pt-3 pb-[calc(14px+env(safe-area-inset-bottom,14px))]">
        <div className="flex gap-2.5">
          <button type="button" onClick={() => copy(shareText, "share")} className="box-border min-h-12 grow rounded-[3px] border border-bone bg-bone px-4 py-[15px] text-[17px] font-semibold text-ink">{copied === "share" ? "Copied" : "Share the result"}</button>
          <button type="button" aria-label="Copy the run string" onClick={() => copy(runText, "run")} className="box-border min-h-12 w-16 rounded-[3px] border border-rule-btn bg-transparent font-mono text-[13px] text-bone">{copied === "run" ? "OK" : "RUN"}</button>
        </div>
        <div className="flex justify-between">
          <Link href="/" className="flex min-h-10 items-center py-2 text-[15px] text-dim no-underline">Back to today</Link>
          <button type="button" onClick={() => { abandon(); router.push("/"); }} className="min-h-10 border-0 bg-transparent py-2 text-[15px] text-dim">New free run</button>
        </div>
      </div>
    </Screen>
  );
}
