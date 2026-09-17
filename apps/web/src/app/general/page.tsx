"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BottomBar, PrimaryButton } from "@/components/BottomBar";
import { RunHeader } from "@/components/RunHeader";
import { Screen } from "@/components/Screen";
import { StepBar } from "@/components/StepBar";
import { useCampaign } from "@/lib/campaign/CampaignProvider";
import { generalHint } from "@/lib/draftRules";
import { STEPS } from "@/lib/steps";
import { GENERAL_STATS, PLAN_LABEL, cultureColor, cultureName, firstName, traitName } from "@/lib/text";

const ORDINAL = ["THE FIRST", "THE SECOND", "THE THIRD"];

export default function GeneralPage() {
  const router = useRouter();
  const { engine, hydrated, save, updateDraft, setStage } = useCampaign();
  const [chosen, setChosen] = useState<number | null>(null);
  const [flipped, setFlipped] = useState<boolean[]>([false, false, false]);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    if (hydrated && !save) router.replace("/");
    if (save && save.draft.generalIndex !== null) router.replace(`/draft/${save.row + 1}`);
  }, [hydrated, save, router]);

  // The reveal: cards turn over by themselves (v2 §5.2).
  useEffect(() => {
    if (!save) return;
    timers.current = [0, 1, 2].map((i) => setTimeout(() => setFlipped((f) => f.map((x, k) => (k === i ? true : x))), 450 + i * 650));
    return () => timers.current.forEach(clearTimeout);
  }, [save]);

  if (!engine || !save) return <Screen />;
  const rules = engine.data.rules;
  const pool = save.draft.generalPool.map((id) => engine.data.generalById.get(id)!);
  const allUp = flipped.every(Boolean);

  const take = () => {
    if (chosen === null) return;
    updateDraft((e, d) => e.pickGeneral(d, chosen));
    setStage("draft");
    router.push("/draft/1");
  };

  return (
    <Screen>
      <RunHeader back="/" label="1 · Your general" help />
      <div className="px-[18px] pb-3.5">
        <StepBar steps={[...STEPS]} current={0} />
      </div>
      <div className="flex items-end justify-between px-[18px] pb-3">
        <div className="flex flex-col gap-1">
          <h1 className="display m-0 text-[28px] leading-[1.1]">{allUp ? "Three names. Take one." : "Three came up."}</h1>
          <span className="text-xs text-faint">{allUp ? "Tap a card to take him. Tap ? for what the numbers mean." : "Turning them over…"}</span>
        </div>
        <span className="text-right font-mono text-[10px] leading-normal text-faint-2">
          DRAWN FROM
          <br />
          {engine.data.generals.length} GENERALS
        </span>
      </div>
      <main className="flex grow flex-col gap-2.5 px-[18px] pb-3">
        {pool.map((g, i) => {
          const sel = chosen === i;
          const cc = cultureColor(g.culture);
          const elites = g.stats.logistics >= rules.eliteCap.logisticsThreshold ? rules.eliteCap.withLogistics : rules.eliteCap.base;
          const chips = [
            { text: PLAN_LABEL[rules.styleToPlan[g.style]], hot: false },
            { text: `${elites} ELITE`, hot: elites > rules.eliteCap.base },
            { text: traitName(engine, g.culture).toUpperCase(), hot: false },
          ];
          return (
            <div key={g.id} className="min-h-[196px] grow basis-0" style={{ perspective: 1200 }}>
              <button
                type="button"
                onClick={() => flipped[i] && setChosen(sel ? null : i)}
                aria-pressed={sel}
                className="relative h-full w-full border-0 bg-transparent p-0 text-left"
                style={{ transformStyle: "preserve-3d", transition: "transform 560ms cubic-bezier(0.2, 0.7, 0.2, 1)", transform: flipped[i] ? "rotateY(180deg)" : "rotateY(0deg)" }}
              >
                <div className="absolute inset-0 box-border flex items-center justify-center rounded-lg border border-rule bg-panel" style={{ backfaceVisibility: "hidden" }}>
                  <div className="absolute inset-[7px] rounded-[5px] border border-raised" />
                  <div className="flex flex-col items-center gap-2">
                    <span className="font-mono text-[9px] tracking-[0.24em] text-faint-2">{ORDINAL[i]}</span>
                    <span className="display text-[24px] text-faint">Warlord Draft</span>
                  </div>
                </div>
                <div
                  className="absolute inset-0 box-border flex flex-col gap-[7px] rounded-lg px-[15px] py-[13px]"
                  style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)", background: cc.deep, border: `2px solid ${sel ? "var(--bone)" : cc.bright}`, boxShadow: sel ? "0 0 26px rgba(242, 236, 221, 0.22)" : "none" }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 flex-col gap-[3px]">
                      <span className="font-mono text-[9px] tracking-[0.18em] uppercase" style={{ color: cc.bright }}>
                        {cultureName(engine, g.culture)}
                      </span>
                      <span className="display text-[27px] leading-[1.05] text-bone">{g.name}</span>
                    </div>
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[13px] text-ink" style={{ borderColor: sel ? "var(--bone)" : cc.bright, background: sel ? "var(--bone)" : "transparent" }}>
                      {sel ? "✓" : ""}
                    </div>
                  </div>
                  {g.note && <span className="text-[11px] leading-snug italic opacity-85" style={{ color: "#e6decb" }}>{g.note}</span>}
                  <div className="flex gap-2.5 pt-0.5">
                    {GENERAL_STATS.map(([k, key]) => {
                      const v = g.stats[key];
                      const color = v >= 85 ? "var(--white)" : "#e6decb";
                      return (
                        <div key={k} className="flex grow basis-0 flex-col gap-[3px]">
                          <div className="flex items-baseline justify-between">
                            <span className="font-mono text-[7px] tracking-[0.08em] opacity-70" style={{ color: "#e6decb" }}>
                              {k}
                            </span>
                            <span className="font-mono text-[13px]" style={{ color }}>
                              {v}
                            </span>
                          </div>
                          <div className="h-[3px] rounded-sm" style={{ background: "rgba(0,0,0,0.35)" }}>
                            <div className="h-[3px] rounded-sm" style={{ width: `${v}%`, background: color }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {chips.map((ch) => (
                      <span key={ch.text} className="rounded-sm border px-[7px] py-[3px] font-mono text-[8px] tracking-[0.08em]" style={{ color: ch.hot ? "var(--ink)" : cc.bright, background: ch.hot ? "var(--bone)" : "transparent", borderColor: ch.hot ? "var(--bone)" : cc.bright }}>
                        {ch.text}
                      </span>
                    ))}
                  </div>
                </div>
              </button>
            </div>
          );
        })}
      </main>
      <BottomBar>
        <div className="min-h-[17px] text-xs leading-snug" style={{ color: chosen !== null ? "var(--bone)" : "var(--faint-2)" }}>
          {chosen !== null ? generalHint(engine, pool[chosen].id) : allUp ? "Tap the one you want." : ""}
        </div>
        <PrimaryButton muted={chosen === null} disabled={chosen === null} onClick={take}>
          {chosen === null ? "Pick a general" : `Take the field with ${firstName(pool[chosen].name)}`}
        </PrimaryButton>
      </BottomBar>
    </Screen>
  );
}
