"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { narrateBeats, whyLine } from "@warlord/engine";
import { HeaderLink, RunHeader } from "@/components/RunHeader";
import { Screen } from "@/components/Screen";
import { Token } from "@/components/ui/Token";
import { ContestBar, StrengthBar } from "@/components/ui/Bars";
import { LineReveal } from "@/components/ui/LineReveal";
import { useCampaign } from "@/lib/campaign/CampaignProvider";
import { contestRows, frontStrip, stageGutter, strengthOf, FRONT_WORD } from "@/lib/battleView";
import { cultureColor, firstName } from "@/lib/text";

export default function BattlePage() {
  const params = useParams<{ battle: string }>();
  const router = useRouter();
  const n = Math.max(1, Math.min(3, Number(params.battle) || 1));
  const i = n - 1;
  const { engine, hydrated, save, army, general, battles, score } = useCampaign();
  const [shown, setShown] = useState(1); // beats revealed so far, the reveal beat included
  const [playing, setPlaying] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const b = battles[i];
  const result = b?.result ?? null;
  const beats = useMemo(() => (result ? narrateBeats(result) : []), [result]);
  const total = beats.length; // the last beat is the result; it is shown as the reveal

  useEffect(() => {
    if (!engine) return;
    if (hydrated && !save) router.replace("/");
    else if (save && !save.battles[i]?.fought) router.replace(`/deploy/${n}`);
  }, [engine, hydrated, save, i, n, router]);

  useEffect(() => {
    if (!playing) return;
    timer.current = setInterval(() => setShown((s) => { if (s >= total) { setPlaying(false); return s; } return s + 1; }), 1800);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [playing, total]);

  if (!engine || !save || !army || !general || !b || !result || !total) return <Screen />;
  const mine = cultureColor(general.culture);
  const hisRaw = cultureColor(b.foeGeneral.culture);
  const his = hisRaw.bright === mine.bright ? { ...hisRaw, bright: "#b3ac9c" } : hisRaw;
  const youName = firstName(general.name).toUpperCase();
  const hisName = firstName(b.foeGeneral.name).toUpperCase();
  const routLevel = engine.data.rules.fronts.routLevel;
  const atEnd = shown >= total;
  const last = beats[Math.min(shown, total) - 1];
  const youWon = result.winner === "A";
  const nextHref = score.over ? "/result" : `/between/${n}`;
  const visible = beats.slice(0, shown).map((bt, k) => ({ bt, k })).reverse();
  const strip = frontStrip(result, beats, shown - 1);
  const sy = strengthOf(last.moraleYou, routLevel), sh = strengthOf(last.moraleHim, routLevel);
  const units = (ids: string[]) => ids.map((id) => engine.data.unitById.get(id)!);

  return (
    <Screen>
      <RunHeader label={`Battle ${n} of 3 · The report`} right={!atEnd ? <HeaderLink onClick={() => { setPlaying(false); setShown(total); }}>Skip</HeaderLink> : null} />
      <div className="flex shrink-0 flex-col gap-3 px-5 pb-3">
        <div className="flex items-end gap-3">
          <div className="flex grow basis-0 flex-col gap-1.5">
            <span className="label" style={{ color: mine.bright }}>{youName}</span>
            <StrengthBar value={sy.value} word={sy.word} color={mine.bright} />
          </div>
          <span className="label pb-1 text-faint">VS</span>
          <div className="flex grow basis-0 flex-col items-end gap-1.5">
            <span className="label" style={{ color: his.bright }}>{hisName}</span>
            <StrengthBar value={sh.value} word={sh.word} color={his.bright} his />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {strip.map((p, k) => {
            const bad = p.word === "BROKE" || p.word === "FLANKED";
            return (
              <div key={k} className="flex flex-col gap-1.5 rounded-md border px-2 py-2" style={{ borderColor: bad ? "#6e3620" : "var(--rule)", background: "var(--panel)" }}>
                <span className="label" style={{ color: mine.bright }}>YOUR {FRONT_WORD[p.you.front]}</span>
                <div className="flex flex-wrap gap-1">{units(p.you.unitIds).map((u, j) => <Token key={j} unit={u} size={24} state={p.you.broken ? "broken" : p.you.shaken ? "shaken" : "normal"} />)}</div>
                <div className="flex flex-wrap gap-1">{units(p.him.unitIds).map((u, j) => <Token key={j} unit={u} size={24} his state={p.him.broken ? "broken" : p.him.shaken ? "shaken" : "normal"} />)}</div>
                <span className="label" style={{ color: his.bright }}>HIS {FRONT_WORD[p.him.front]}</span>
                <span className="label" style={{ color: bad ? "var(--rust)" : p.word === "HE BROKE" ? "var(--bone)" : "var(--dim)" }}>{p.word}</span>
              </div>
            );
          })}
        </div>
      </div>
      <main className="flex grow flex-col gap-3 border-t border-rule px-5 pt-3 pb-4">
        {visible.map(({ bt, k }) => {
          const isResult = bt.kind === "result";
          const rows = contestRows(bt);
          return (
            <div key={k} className="flex items-stretch gap-3" style={{ animation: "wdrise 240ms ease-out 1" }}>
              <div className="flex w-[52px] shrink-0 flex-col items-start gap-1.5 pt-3">
                <span className="label" style={{ color: isResult || bt.keys.some((x) => x.kind === "break") ? "var(--bone)" : "var(--dim)" }}>{stageGutter(bt)}</span>
                <div className="ml-1 w-px grow bg-rule" />
              </div>
              <div className="flex min-w-0 grow flex-col gap-3 rounded-lg border border-rule bg-panel px-4 py-3.5">
                {isResult ? (
                  <>
                    <span className="label" style={{ color: youWon ? mine.bright : his.bright }}>{youWon ? "THE FIELD IS YOURS" : "THE FIELD IS HIS"}</span>
                    <span className="display text-[24px] leading-[1.2] text-bone">The curtain comes back. This is the line he set.</span>
                    <LineReveal engine={engine} mine={{ ...army, deployment: b.play.deployment as ("L" | "C" | "R")[] }} his={b.foe} result={result} size={30} mineColor={mine.bright} hisColor={his.bright} />
                    <span className="text-[15px] leading-snug text-dim">{whyLine(engine.data, result, beats)}</span>
                    <span className="display text-[18px] leading-snug text-bone">{bt.narration}</span>
                  </>
                ) : (
                  <>
                    <span className="display text-[18px] leading-[1.35] text-bone">{bt.narration}</span>
                    {bt.keys.map((key, j) => (
                      <div key={j} className="flex flex-col gap-1 rounded-[3px] bg-raised px-3 py-2" style={{ borderLeft: `2px solid ${key.kind === "trait" ? "var(--bone)" : "var(--rust)"}` }}>
                        <span className="label flex items-center gap-1.5" style={{ color: key.kind === "trait" ? "var(--bone)" : "var(--rust)" }}>
                          {key.kind === "trait" ? <span className="inline-block h-2 w-2 rotate-45 bg-bone" /> : <span className="inline-block h-2 w-2 rounded-full bg-rust" />}
                          {key.label}
                        </span>
                        <span className="text-[13px] leading-snug text-dim">{key.text}</span>
                      </div>
                    ))}
                    {rows.length > 0 && (
                      <div className="flex flex-col gap-1.5">
                        {rows.map((r) => (
                          <div key={r.k} className="flex items-center gap-2.5">
                            <span className="w-8 font-mono text-[11px] text-faint">{r.k}</span>
                            <ContestBar yourShare={r.yourShare} mine={mine.bright} his={his.bright} />
                            <span className="w-[120px] text-right text-[13px]" style={{ color: r.winner === "A" ? mine.bright : r.winner === "B" ? his.bright : "var(--dim)" }}>
                              {r.word} <span className="font-mono text-[11px] text-faint">{r.pct}</span>
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </main>
      <div className="sticky bottom-0 z-30 mt-auto flex shrink-0 gap-2.5 border-t border-raised bg-sunk px-5 pt-3 pb-[calc(14px+env(safe-area-inset-bottom,14px))]">
        {atEnd ? (
          <>
            <button type="button" onClick={() => { setShown(1); setPlaying(true); }} className="box-border min-h-12 grow basis-0 rounded-[3px] border border-rule-btn bg-transparent px-2 py-3.5 text-[15px] text-bone">Watch it again</button>
            <Link href={nextHref} className="box-border flex min-h-12 grow basis-0 items-center justify-center rounded-[3px] bg-bone px-2 py-3.5 text-[17px] font-semibold text-ink no-underline">See the result</Link>
          </>
        ) : (
          <>
            <button type="button" onClick={() => setPlaying((p) => !p)} className="box-border min-h-12 grow basis-0 rounded-[3px] border border-rule-btn bg-transparent px-2 py-3.5 text-[17px] text-bone">{playing ? "Pause" : "Play"}</button>
            <button type="button" onClick={() => setShown((s) => Math.min(total, s + 1))} className="box-border min-h-12 grow basis-0 rounded-[3px] border border-bone bg-bone px-2 py-3.5 text-[17px] font-semibold text-ink">Next beat</button>
          </>
        )}
      </div>
    </Screen>
  );
}
