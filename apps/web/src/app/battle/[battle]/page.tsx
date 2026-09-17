"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { narrateBeats } from "@warlord/engine";
import { RunHeader } from "@/components/RunHeader";
import { Screen } from "@/components/Screen";
import { useCampaign } from "@/lib/campaign/CampaignProvider";
import { endedLabel, frontsAfter, isKeyBeat, keyTag, opposedBars } from "@/lib/battleView";
import { cultureColor, cultureShort, firstName } from "@/lib/text";

export default function BattlePage() {
  const params = useParams<{ battle: string }>();
  const router = useRouter();
  const n = Math.max(1, Math.min(3, Number(params.battle) || 1));
  const i = n - 1;
  const { engine, hydrated, save, army, battles, score } = useCampaign();
  const [mode, setMode] = useState<"key" | "every">("every");
  const [shown, setShown] = useState(1); // beats revealed so far
  const [playing, setPlaying] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const listEnd = useRef<HTMLDivElement | null>(null);

  const b = battles[i];
  const result = b?.result ?? null;
  const beats = useMemo(() => (result ? narrateBeats(result) : []), [result]);
  const total = beats.length;

  useEffect(() => {
    if (!engine) return;
    if (hydrated && !save) router.replace("/");
    else if (save && !save.battles[i]?.fought) router.replace(`/deploy/${n}`);
  }, [engine, hydrated, save, i, n, router]);

  useEffect(() => {
    if (!playing) return;
    timer.current = setInterval(() => {
      setShown((s) => {
        if (s >= total) {
          setPlaying(false);
          return s;
        }
        return s + 1;
      });
    }, 1600);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [playing, total]);
  useEffect(() => {
    listEnd.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [shown]);

  if (!engine || !save || !army || !b || !result || !total) return <Screen />;
  const mine = cultureColor(engine.data.generalById.get(army.generalId)!.culture);
  const hisColor = cultureColor(b.foeCulture);
  const his = hisColor.bright === mine.bright ? { ...hisColor, bright: "#b3ac9c" } : hisColor;
  const youName = firstName(engine.data.generalById.get(army.generalId)!.name);
  const hisName = firstName(b.foeGeneral);
  const routLevel = engine.data.rules.fronts.routLevel;
  const atEnd = shown >= total;
  const last = beats[Math.min(shown, total) - 1];
  const youWon = result.winner === "A";
  const nextHref = score.over ? "/result" : `/between/${n}`;
  const visible = beats.slice(0, shown).map((bt, k) => ({ bt, k })).filter(({ bt, k }) => mode === "every" || isKeyBeat(bt, k));
  const fronts = frontsAfter(result, beats, shown - 1);

  return (
    <Screen>
      <RunHeader
        back={`/deploy/${n}`}
        label={`4 · The match report`}
        right={
          !atEnd ? (
            <button type="button" onClick={() => setShown(total)} className="h-11 min-w-11 bg-transparent px-2 text-[13px] text-faint-2">
              Skip
            </button>
          ) : null
        }
      />
      <div className="mx-[18px] mb-2.5 flex shrink-0 items-center gap-3 rounded-[4px] border border-rule bg-panel px-3.5 py-3">
        <div className="flex grow basis-0 flex-col gap-0.5">
          <span className="font-mono text-[9px] tracking-[0.12em] uppercase" style={{ color: mine.bright }}>
            {youName} · {cultureShort(engine, engine.data.generalById.get(army.generalId)!.culture)}
          </span>
          <span className="display text-[30px] leading-none" style={{ color: last.moraleYou >= routLevel ? "var(--bad)" : mine.bright }}>
            {last.moraleYou.toFixed(2)}
          </span>
        </div>
        <div className="flex flex-col items-center gap-[3px]">
          <span className="font-mono text-[9px] tracking-[0.14em] text-faint-2">MORALE</span>
          <span className="rounded-sm border px-1.5 py-0.5 font-mono text-[9px] text-bad" style={{ borderColor: "#6e3620" }}>
            ROUT AT {routLevel.toFixed(2)}
          </span>
        </div>
        <div className="flex grow basis-0 flex-col items-end gap-0.5">
          <span className="font-mono text-[9px] tracking-[0.12em] uppercase" style={{ color: his.bright }}>
            {hisName} · {cultureShort(engine, b.foeCulture)}
          </span>
          <span className="display text-[30px] leading-none" style={{ color: last.moraleHim >= routLevel ? "var(--bad)" : his.bright }}>
            {last.moraleHim.toFixed(2)}
          </span>
        </div>
      </div>
      <div className="mx-[18px] mb-2 flex gap-1.5">
        {fronts.map((f, k) => {
          const red = f.you.broken || f.him.broken;
          const label = k === 0 ? "YOUR L · HIS R" : k === 1 ? "CENTERS" : "YOUR R · HIS L";
          return (
            <div key={k} className="flex grow basis-0 flex-col gap-1 rounded-[3px] border bg-panel px-2 py-1.5" style={{ borderColor: red ? "#4a3225" : "var(--rule)" }}>
              <span className="font-mono text-[7px] tracking-[0.08em]" style={{ color: red ? "var(--bad)" : "var(--faint)" }}>
                {label}
              </span>
              <div className="h-1 rounded-sm bg-raised">
                <div className="h-1 rounded-sm" style={{ width: `${(f.you.pct * 100).toFixed(0)}%`, background: f.you.broken ? "var(--bad)" : mine.bright, transition: "width 700ms ease, background 400ms ease" }} />
              </div>
              <div className="h-1 rounded-sm bg-raised">
                <div className="h-1 rounded-sm" style={{ width: `${(f.him.pct * 100).toFixed(0)}%`, background: f.him.broken ? "var(--bad)" : his.bright, transition: "width 700ms ease, background 400ms ease" }} />
              </div>
              <span className="font-mono text-[7px]" style={{ color: red ? "var(--bad)" : "#5c5749" }}>
                {f.you.broken && f.him.broken ? "BOTH BROKE" : f.him.broken ? "HIS FRONT BROKE" : f.you.broken ? "YOUR FRONT BROKE" : f.you.empty || f.him.empty ? "EMPTY" : "HOLDING"}
              </span>
            </div>
          );
        })}
      </div>
      <div className="mx-[18px] mb-2.5 flex shrink-0 rounded-[3px] border border-raised bg-sunk p-[3px]">
        {(["key", "every"] as const).map((m) => (
          <button key={m} type="button" onClick={() => setMode(m)} className="min-h-10 grow basis-0 rounded-sm border-0 px-2 py-2.5 text-[13px] font-medium" style={{ background: mode === m ? "#2a2419" : "transparent", color: mode === m ? "var(--bone)" : "var(--faint)" }}>
            {m === "key" ? "Key beats" : "Every beat"}
          </button>
        ))}
      </div>
      <div className="flex items-baseline px-[18px] pb-1.5">
        <span className="w-[54px] font-mono text-[8px] tracking-[0.12em] text-[#5c5749]">BEAT</span>
        <span className="grow font-mono text-[8px] tracking-[0.12em] text-[#5c5749]">{mode === "key" ? "WHAT DECIDED IT" : "ALL THREE FRONTS, EVERY ROUND"}</span>
        <span className="w-[34px] text-right font-mono text-[8px]" style={{ color: mine.bright }}>
          {youName.slice(0, 3).toUpperCase()}
        </span>
        <span className="w-[34px] text-right font-mono text-[8px]" style={{ color: his.bright }}>
          {hisName.slice(0, 3).toUpperCase()}
        </span>
      </div>
      <main className="flex grow flex-col gap-[7px] px-[18px] pb-3">
        {visible.map(({ bt, k }) => {
          const tag = keyTag(bt, hisName);
          const isResult = bt.kind === "result";
          const hot = isResult ? (youWon ? "A" : "B") : tag ? (bt.broke.him.length || bt.events.includes("B routs") ? "A" : "B") : null;
          const bars = isResult || bt.kind === "skirmish" && mode === "key" ? [] : opposedBars(bt);
          return (
            <div key={k} className="flex items-stretch" style={{ animation: "wdrise 240ms ease-out 1" }}>
              <div className="flex w-[54px] shrink-0 flex-col items-start gap-1 pt-2.5">
                <span className="font-mono text-[10px] tracking-[0.08em]" style={{ color: hot ? "var(--bone)" : "var(--faint)" }}>
                  {isResult ? "END" : bt.kind === "skirmish" ? "SKIRM" : bt.kind === "contact" ? "CLASH" : bt.label.replace("PRESS ", "P")}
                </span>
                <div className="ml-1 w-px grow bg-[#2a2720]" />
              </div>
              <div className="flex min-w-0 grow gap-2 rounded-[3px] border py-[9px] pr-2.5 pl-[11px]" style={{ background: hot === "A" ? "#2e2214" : hot === "B" ? "#2a1c15" : "var(--panel)", borderColor: hot === "A" ? "#6b3e12" : hot === "B" ? "#6e3620" : "var(--rule)", borderLeft: `3px solid ${hot === "A" ? mine.bright : hot === "B" ? "var(--bad)" : "var(--rule)"}` }}>
                <div className="flex min-w-0 grow flex-col gap-1.5">
                  {(tag || isResult) && (
                    <span className="font-mono text-[9px] tracking-[0.14em]" style={{ color: hot === "A" ? mine.bright : "var(--bad)" }}>
                      {isResult ? (youWon ? "THE FIELD IS YOURS" : "THE FIELD IS HIS") : tag}
                    </span>
                  )}
                  <span className={hot ? "display text-[15px] leading-[1.38] text-bone" : "text-[13px] leading-[1.38]"} style={hot ? undefined : { color: "var(--center)" }}>
                    {bt.narration}
                  </span>
                  {bars.length > 0 && (
                    <div className="flex flex-col gap-1 pt-0.5">
                      {bars.map((bar) => (
                        <div key={bar.k} className="flex items-center gap-1.5">
                          <span className="w-6 font-mono text-[8px] text-faint-2">{bar.k}</span>
                          <div className="relative flex h-1.5 grow rounded-sm bg-raised">
                            <div className="flex grow basis-0 justify-end">
                              <div className="h-1.5 rounded-l-sm" style={{ width: `${bar.aPct}%`, background: mine.bright }} />
                            </div>
                            <div className="flex grow basis-0">
                              <div className="h-1.5 rounded-r-sm" style={{ width: `${bar.bPct}%`, background: his.bright }} />
                            </div>
                            <div className="absolute top-[-2px] left-1/2 h-[10px] w-px bg-[#5c5749]" />
                          </div>
                          <span className="w-10 text-right font-mono text-[8px]" style={{ color: bar.winner === "A" ? mine.bright : bar.winner === "B" ? his.bright : "var(--faint-2)" }}>
                            {bar.tag}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  {isResult && (
                    <div className="grid grid-cols-4 gap-1.5 pt-1">
                      {[
                        { k: "ENDED", v: endedLabel(result.brokeInPhase), color: "var(--bone)" },
                        { k: "HIS MORALE", v: result.moraleFraction.B.toFixed(2), color: his.bright },
                        { k: "YOU LOST", v: `${(result.casualties.A * 100).toFixed(0)}%`, color: mine.bright },
                        { k: "HE LOST", v: `${(result.casualties.B * 100).toFixed(0)}%`, color: his.bright },
                      ].map((o) => (
                        <div key={o.k} className="flex flex-col gap-[2px] rounded-sm border border-rule bg-panel px-1.5 py-1.5">
                          <span className="font-mono text-[7px] tracking-[0.08em] text-faint-2">{o.k}</span>
                          <span className="font-mono text-[13px]" style={{ color: o.color }}>
                            {o.v}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex shrink-0 items-start pt-px">
                  <span className="w-[34px] text-right font-mono text-[11px]" style={{ color: bt.moraleYou >= routLevel ? "var(--bad)" : hot ? "var(--bone)" : "var(--dim)" }}>
                    {bt.moraleYou.toFixed(2)}
                  </span>
                  <span className="w-[34px] text-right font-mono text-[11px]" style={{ color: bt.moraleHim >= routLevel ? "var(--bad)" : hot ? "var(--bone)" : "var(--dim)" }}>
                    {bt.moraleHim.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={listEnd} />
      </main>
      <div className="flex shrink-0 gap-[9px] border-t border-raised bg-sunk px-[18px] pt-3 pb-[calc(14px+env(safe-area-inset-bottom,14px))]">
        {atEnd ? (
          <>
            <button type="button" onClick={() => { setShown(1); setPlaying(true); }} className="box-border min-h-11 grow basis-0 rounded-[3px] border border-rule-btn bg-transparent px-2 py-3.5 text-sm text-bone">
              Watch it again
            </button>
            <Link href={nextHref} className="box-border flex min-h-11 grow basis-0 items-center justify-center rounded-[3px] bg-bone px-2 py-3.5 text-sm font-semibold text-ink no-underline">
              {score.over ? "The campaign" : "The reckoning"}
            </Link>
          </>
        ) : (
          <>
            <button type="button" onClick={() => setPlaying((p) => !p)} className="box-border min-h-11 w-24 rounded-[3px] border border-rule-btn bg-transparent px-2 py-3.5 text-sm text-bone">
              {playing ? "Pause" : "Play"}
            </button>
            <button type="button" onClick={() => setShown((s) => Math.min(total, s + 1))} className="box-border min-h-11 grow rounded-[3px] border border-bone bg-bone px-2 py-3.5 text-sm font-semibold text-ink">
              Next beat
            </button>
          </>
        )}
      </div>
    </Screen>
  );
}
