"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { narrateBeats } from "@warlord/engine";
import { RunHeader } from "@/components/RunHeader";
import { Screen } from "@/components/Screen";
import { useCampaign } from "@/lib/campaign/CampaignProvider";
import { calloutsFor, damageLine, edgeTag, endedLabel, frontsAfter, pairLabel, whoLine } from "@/lib/battleView";
import { firstName } from "@/lib/text";

const MINE = "var(--brass)", THEIRS = "var(--enemy)";

export default function BattlePage() {
  const params = useParams<{ battle: string }>();
  const router = useRouter();
  const n = Math.max(1, Math.min(3, Number(params.battle) || 1));
  const i = n - 1;
  const { engine, hydrated, save, battles, score } = useCampaign();
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const b = battles[i];
  const result = b?.result ?? null;
  const beats = useMemo(() => (result ? narrateBeats(result) : []), [result]);
  const last = beats.length - 1;

  useEffect(() => {
    if (!engine) return;
    if (hydrated && !save) router.replace("/");
    else if (save && !save.battles[i]?.fought) router.replace(`/deploy/${n}`);
  }, [engine, hydrated, save, i, n, router]);

  useEffect(() => {
    if (!playing) return;
    timer.current = setInterval(() => {
      setStep((s) => {
        if (s >= last) {
          setPlaying(false);
          return s;
        }
        return s + 1;
      });
    }, 1650);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [playing, last]);

  if (!engine || !save || !b || !result || !beats.length) return <Screen />;
  const beat = beats[Math.min(step, last)];
  const atEnd = step >= last;
  const fronts = frontsAfter(result, beats, step);
  const routLevel = engine.data.rules.fronts.routLevel;
  const youName = firstName(engine.data.generalById.get(engine.data.generalById.has(save.draft.generalPool[save.draft.generalIndex!]) ? save.draft.generalPool[save.draft.generalIndex!] : "")?.name ?? "You");
  const hisName = firstName(b.foeGeneral);
  const youWon = result.winner === "A";
  const nextHref = score.over ? "/result" : `/between/${n}`;
  const callouts = calloutsFor(beat, hisName);
  const showContests = beat.kind !== "skirmish" && beat.kind !== "result";

  const morale = [
    { name: youName, value: beat.moraleYou, fill: beat.moraleYou >= routLevel ? "var(--bad)" : MINE, nameColor: MINE },
    { name: hisName, value: beat.moraleHim, fill: beat.moraleHim >= routLevel ? "var(--bad)" : THEIRS, nameColor: THEIRS },
  ];

  return (
    <Screen>
      <RunHeader
        back={`/deploy/${n}`}
        label={atEnd ? `Battle ${n} · Result` : `Beat ${step + 1} of ${beats.length}`}
        right={
          !atEnd ? (
            <button type="button" onClick={() => setStep(last)} className="h-11 min-w-11 bg-transparent px-2 text-[13px] text-faint-2">
              Skip
            </button>
          ) : null
        }
      />
      <div className="flex gap-1 px-[18px] pb-3">
        {beats.map((x, k) => (
          <div key={k} className="h-[3px] flex-1 rounded-sm" style={{ background: k < step ? "var(--brass)" : k === step ? "var(--accent)" : "var(--rule)" }} />
        ))}
      </div>
      <div className="flex flex-col gap-[7px] px-[18px] pb-2.5">
        {morale.map((m) => (
          <div key={m.name} className="flex items-center gap-2.5">
            <span className="w-[72px] truncate text-xs" style={{ color: m.nameColor }}>
              {m.name}
            </span>
            <div className="relative h-2 grow rounded-sm border border-rule bg-[#262218]">
              <div className="h-full rounded-sm" style={{ width: `${Math.min(100, m.value * 100).toFixed(0)}%`, background: m.fill, transition: "width 700ms ease, background 400ms ease" }} />
              <div className="absolute -top-[3px] h-[14px] w-px bg-faint-2" style={{ left: `${routLevel * 100}%` }} />
            </div>
            <span className="w-[34px] text-right font-mono text-[11px]" style={{ color: m.fill }}>
              {m.value.toFixed(2)}
            </span>
          </div>
        ))}
      </div>
      <div className="flex gap-1.5 px-[18px] pb-3">
        {fronts.map((f) => {
          const red = f.him.broken || f.you.broken;
          return (
            <div key={f.label} className="flex grow basis-0 flex-col gap-[5px] rounded-md border bg-panel px-2 py-[7px]" style={{ borderColor: red ? "#4a3225" : "var(--rule-2)" }}>
              <span className="font-mono text-[8px] tracking-[0.08em]" style={{ color: red ? "var(--bad)" : "var(--faint)" }}>
                {f.label}
              </span>
              <div className="flex flex-col gap-[3px]">
                <div className="h-1 rounded-sm bg-[#262218]">
                  <div className="h-1 rounded-sm" style={{ width: `${(f.you.pct * 100).toFixed(0)}%`, background: f.you.broken ? "var(--bad)" : f.you.pct > 0.8 ? "var(--bad)" : MINE, transition: "width 700ms ease, background 400ms ease" }} />
                </div>
                <div className="h-1 rounded-sm bg-[#262218]">
                  <div className="h-1 rounded-sm" style={{ width: `${(f.him.pct * 100).toFixed(0)}%`, background: f.him.broken ? "var(--bad)" : THEIRS, transition: "width 700ms ease, background 400ms ease" }} />
                </div>
              </div>
              <span className="font-mono text-[8px]" style={{ color: red ? "var(--bad)" : "#5c5749" }}>
                {f.state}
              </span>
            </div>
          );
        })}
      </div>
      <main className="flex grow flex-col gap-[9px] px-[18px] pb-4">
        <div key={step} className="flex flex-col gap-[9px]" style={{ animation: "wdrise 240ms ease-out 1" }}>
          {beat.kind !== "result" ? (
            <>
              <div className="flex flex-col gap-1.5">
                <span className="font-mono text-[10px] tracking-[0.16em] text-accent">{beat.label}</span>
                <p className="display m-0 text-[19px] leading-[1.3] text-bone" style={{ textWrap: "pretty" }}>
                  {beat.narration}
                </p>
              </div>
              {showContests &&
                beat.contests.map((c, k) => {
                  const tag = edgeTag(c);
                  const max = Math.max(c.scoreA, c.scoreB, 1);
                  const dl = damageLine(c);
                  return (
                    <div key={k} className="flex flex-col gap-1.5 rounded-md border border-rule-2 bg-panel py-[9px] pr-[11px] pl-[11px]" style={{ borderLeft: `3px solid ${tag.mark}` }}>
                      <div className="flex items-baseline justify-between">
                        <span className="font-mono text-[9px] tracking-[0.1em] text-dim">{pairLabel(c)}</span>
                        <span className="font-mono text-[9px] tracking-[0.08em]" style={{ color: tag.color }}>
                          {tag.text}
                        </span>
                      </div>
                      {[
                        { score: c.scoreA, fill: MINE },
                        { score: c.scoreB, fill: THEIRS },
                      ].map((s, j) => (
                        <div key={j} className="flex items-center gap-2">
                          <div className="h-[7px] grow rounded-sm bg-[#262218]">
                            <div className="h-[7px] rounded-sm" style={{ width: `${((s.score / max) * 100).toFixed(0)}%`, background: s.fill, transition: "width 600ms ease" }} />
                          </div>
                          <span className="w-[46px] text-right font-mono text-[10px] text-faint-2">{s.score.toFixed(1)}</span>
                        </div>
                      ))}
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-[11px] leading-snug text-faint">{whoLine(c)}</span>
                        <span className="shrink-0 font-mono text-[9px] tracking-[0.08em]" style={{ color: dl.color }}>
                          {dl.text}
                        </span>
                      </div>
                    </div>
                  );
                })}
              {callouts.map((ev, k) => (
                <div key={k} className="flex flex-col gap-1 rounded-md border border-[#6e3620] bg-[#2a1c15] px-3 py-2.5">
                  <span className="font-mono text-[9px] tracking-[0.14em] text-bad">{ev.tag}</span>
                  <span className="text-xs leading-snug text-bone">{ev.text}</span>
                </div>
              ))}
            </>
          ) : (
            <div className="flex flex-col gap-3">
              <span className="font-mono text-[10px] tracking-[0.16em]" style={{ color: youWon ? "var(--brass)" : "var(--bad)" }}>
                {youWon ? "THE FIELD IS YOURS" : "THE FIELD IS HIS"}
              </span>
              <h2 className="display m-0 text-[30px] leading-[1.14]">{beat.narration}</h2>
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { k: "ENDED", v: endedLabel(result.brokeInPhase), color: "var(--bone)" },
                  { k: "HIS MORALE", v: result.moraleFraction.B.toFixed(2), color: result.moraleFraction.B >= routLevel ? "var(--bad)" : "var(--enemy)" },
                  { k: "YOU LOST", v: `${(result.casualties.A * 100).toFixed(0)}%`, color: youWon ? "var(--brass)" : "var(--bad)" },
                  { k: "HE LOST", v: `${(result.casualties.B * 100).toFixed(0)}%`, color: youWon ? "var(--bad)" : "var(--enemy)" },
                ].map((o) => (
                  <div key={o.k} className="flex flex-col gap-[3px] rounded-md border border-rule-2 bg-panel px-[11px] py-[9px]">
                    <span className="font-mono text-[8px] tracking-[0.1em] text-faint-2">{o.k}</span>
                    <span className="font-mono text-base" style={{ color: o.color }}>
                      {o.v}
                    </span>
                  </div>
                ))}
              </div>
              {result.generalFell?.A && <p className="m-0 text-xs text-bad">{youName} fell with the center.</p>}
              {result.generalFell?.B && <p className="m-0 text-xs text-dim">{hisName} fell with his center.</p>}
            </div>
          )}
        </div>
      </main>
      <div className="flex shrink-0 gap-[9px] border-t border-rule bg-[#1a1813] px-[18px] pt-3 pb-[calc(14px+env(safe-area-inset-bottom,14px))]">
        <button type="button" aria-label="Previous beat" onClick={() => setStep((s) => Math.max(0, s - 1))} className="min-h-12 w-14 rounded-md border border-[#3d382f] bg-transparent text-base" style={{ color: step === 0 ? "#4e4a3f" : "var(--bone)" }}>
          ←
        </button>
        <button type="button" onClick={() => setPlaying((p) => !p)} disabled={atEnd} className="min-h-12 w-24 rounded-md border border-[#3d382f] bg-transparent text-[13px] text-bone disabled:opacity-50">
          {playing ? "Pause" : "Play"}
        </button>
        {atEnd ? (
          <Link href={nextHref} className="flex min-h-12 grow items-center justify-center rounded-md bg-accent-fill text-[15px] font-semibold text-accent-text no-underline">
            {score.over ? "See the campaign" : "See the recap"}
          </Link>
        ) : (
          <button type="button" onClick={() => setStep((s) => Math.min(last, s + 1))} className="min-h-12 grow rounded-md border border-accent-fill bg-accent-fill text-[15px] font-semibold text-accent-text">
            Next
          </button>
        )}
      </div>
    </Screen>
  );
}
