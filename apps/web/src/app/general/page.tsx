"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { General } from "@warlord/engine";
import { BottomBar, PrimaryButton } from "@/components/BottomBar";
import { HeaderLink, RunHeader } from "@/components/RunHeader";
import { Screen } from "@/components/Screen";
import { StepBar } from "@/components/StepBar";
import { TraitChip } from "@/components/ui/TraitChip";
import { InlineNote } from "@/components/ui/Note";
import { useCampaign } from "@/lib/campaign/CampaignProvider";
import { STEPS } from "@/lib/steps";
import { PresenceLine, Timer } from "@/components/versus/Presence";
import { countdown, useServerClock } from "@/lib/versus/client";
import { routeForDuel } from "@/lib/versus/duel";
import { GENERAL_STATS, GENERAL_STAT_NOTE, cultureColor, cultureName, firstName, traitDef } from "@/lib/text";

const ORDINAL = ["THE FIRST", "THE SECOND", "THE THIRD"];

export default function GeneralPage() {
  const router = useRouter();
  const { engine, hydrated, save, duel, updateDraft, setStage } = useCampaign();
  const now = useServerClock(duel?.serverNow ?? Date.now);
  const [sending, setSending] = useState(false);
  const [chosen, setChosen] = useState<number | null>(null);
  const [flipped, setFlipped] = useState<boolean[]>([false, false, false]);
  const [note, setNote] = useState<string | null>(null); // `${i}:${traitId}` or `${i}:stat:${key}`
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    if (hydrated && !save) router.replace("/");
    if (save && save.draft.generalIndex !== null) router.replace(save.kind === "duel" && duel ? routeForDuel(duel.view) : `/draft/${save.row + 1}`);
  }, [hydrated, save, duel, router]);

  // The reveal: cards turn over by themselves (v2 §5.2), unless motion is reduced.
  useEffect(() => {
    if (!save) return;
    const instant = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    timers.current = [0, 1, 2].map((i) => setTimeout(() => setFlipped((f) => f.map((x, k) => (k === i ? true : x))), instant ? 0 : 450 + i * 650));
    return () => timers.current.forEach(clearTimeout);
  }, [save]);

  if (!engine || !save) return <Screen />;
  const rules = engine.data.rules;
  const pool = save.draft.generalPool.map((id) => engine.data.generalById.get(id)!);
  const allUp = flipped.every(Boolean);

  const take = async () => {
    if (chosen === null) return;
    if (duel) {
      setSending(true);
      try { await duel.pick({ general: chosen }); router.push("/draft/1"); } catch { setSending(false); }
      return;
    }
    updateDraft((e, d) => e.pickGeneral(d, chosen));
    setStage("draft");
    router.push("/draft/1");
  };
  const timer = duel ? countdown(duel.view.me.deadline, now) : null;
  const toggleNote = (k: string) => setNote((n) => (n === k ? null : k));
  const elitesOf = (g: General) => (g.stats.logistics >= rules.eliteCap.logisticsThreshold ? rules.eliteCap.withLogistics : rules.eliteCap.base);

  return (
    <Screen>
      <RunHeader back={duel ? undefined : "/"} label="1 · Your general" right={duel && timer ? <Timer text={timer.text} ms={timer.ms} /> : <HeaderLink href="/numbers">Numbers</HeaderLink>} />
      <div className="px-5 pb-2">
        <StepBar steps={[...STEPS].slice(0, 4)} current={0} />
      </div>
      {duel?.view.him && <PresenceLine name={duel.view.him.name} dot={duel.view.him.dot} where={duel.view.him.where} />}
      <div className="flex flex-col gap-1 px-5 pt-2 pb-4">
        <h1 className="display m-0 text-[30px] leading-[1.1]">{duel ? "Three names. You both see them." : allUp ? "Three names. Take one." : "Three came up."}</h1>
        <span className="text-[15px] text-dim">{duel ? "He may take the same one. Tap a word to see what it does." : allUp ? "Tap a word to see what it does." : "Turning them over…"}</span>
      </div>
      <main className="flex grow flex-col gap-3 px-5 pb-4">
        {pool.map((g, i) => {
          const sel = chosen === i;
          const cc = cultureColor(g.culture);
          const openTrait = note?.startsWith(`${i}:`) && !note.includes(":stat:") ? note.slice(note.indexOf(":") + 1) : null;
          const openStat = note?.startsWith(`${i}:stat:`) ? note.split(":")[2] : null;
          return (
            <div key={g.id} className="min-h-[220px]" style={{ perspective: 1200 }}>
              <div className="relative h-full w-full" style={{ transformStyle: "preserve-3d", transition: "transform 560ms cubic-bezier(0.2, 0.7, 0.2, 1)", transform: flipped[i] ? "rotateY(180deg)" : "rotateY(0deg)" }}>
                {!flipped[i] && (
                  <div className="absolute inset-0 box-border flex items-center justify-center rounded-lg border border-rule bg-panel" style={{ backfaceVisibility: "hidden" }}>
                    <div className="absolute inset-[7px] rounded-[5px] border border-raised" />
                    <div className="flex flex-col items-center gap-2">
                      <span className="label text-faint">{ORDINAL[i]}</span>
                      <span className="display text-[24px] text-faint">Warlord Draft</span>
                    </div>
                  </div>
                )}
                <div
                  className="box-border flex flex-col gap-3 rounded-lg px-4 py-3.5"
                  style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)", background: cc.deep, border: `2px solid ${sel ? "var(--bone)" : cc.bright}`, boxShadow: sel ? "0 0 0 2px rgba(242,236,221,0.25)" : "none", visibility: flipped[i] ? "visible" : "hidden" }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-col gap-1">
                      <span className="label text-bone" style={{ opacity: 0.9 }}>{cultureName(engine, g.culture)}</span>
                      <span className="display text-[28px] leading-[1.05] text-bone">{g.name}</span>
                      {g.note && <span className="text-[13px] leading-snug italic text-bone" style={{ opacity: 0.8 }}>{g.note}</span>}
                    </div>
                    <button type="button" onClick={() => setChosen(sel ? null : i)} aria-pressed={sel} aria-label={sel ? `${g.name} taken` : `Take ${g.name}`} className="flex h-11 w-11 shrink-0 items-center justify-center border-0 bg-transparent p-0">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 text-[15px] text-ink" style={{ borderColor: "var(--bone)", background: sel ? "var(--bone)" : "transparent" }}>{sel ? "✓" : ""}</span>
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {g.traits.length ? g.traits.map((t) => {
                      const def = traitDef(engine, t);
                      return <TraitChip key={t} onDeep rule={def.kind === "rule"} active={openTrait === t} onClick={() => toggleNote(`${i}:${t}`)}>{def.name}</TraitChip>;
                    }) : (
                      <>
                        <TraitChip onDeep state="off" active={openTrait === "none"} onClick={() => toggleNote(`${i}:none`)}>No traits</TraitChip>
                        <span className="text-xs text-bone" style={{ opacity: 0.8 }}>The bold pick.</span>
                      </>
                    )}
                  </div>
                  {openTrait && (
                    <InlineNote onDeep title={openTrait === "none" ? "No traits" : traitDef(engine, openTrait).name}>
                      {openTrait === "none" ? "Nothing but his four numbers and your cultures. What you build is all he brings, so every trait on the board is yours to choose." : traitDef(engine, openTrait).text}
                    </InlineNote>
                  )}
                  <div className="grid grid-cols-4 gap-3">
                    {GENERAL_STATS.map(([k, key, title]) => {
                      const v = g.stats[key];
                      return (
                        <button key={k} type="button" onClick={() => toggleNote(`${i}:stat:${key}`)} aria-label={`${title} ${v}`} className="flex min-w-0 flex-col gap-1 border-0 bg-transparent p-0 text-left">
                          <div className="flex items-baseline justify-between">
                            <span className="font-mono text-[11px] tracking-[0.14em] text-bone" style={{ opacity: 0.8, textDecoration: openStat === key ? "underline dotted" : "none", textUnderlineOffset: 3 }}>{k}</span>
                            <span className="font-mono text-[17px] font-semibold text-white">{v}</span>
                          </div>
                          <div className="h-[3px] rounded-sm" style={{ background: "rgba(16,15,12,0.45)" }}>
                            <div className="h-[3px] rounded-sm" style={{ width: `${v}%`, background: cc.bright }} />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  {openStat && <InlineNote onDeep title={GENERAL_STATS.find((s) => s[1] === openStat)![2]}>{GENERAL_STAT_NOTE[openStat]}</InlineNote>}
                  <div className="flex items-center justify-between">
                    <span className="label text-bone" style={{ opacity: 0.8 }}>{elitesOf(g)} ELITE SLOTS</span>
                    <span className="label text-bone" style={{ opacity: 0.8 }}>{g.traits.length ? `${g.traits.length} TRAIT${g.traits.length > 1 ? "S" : ""}` : "NO TRAITS"}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </main>
      <BottomBar>
        <PrimaryButton muted={chosen === null || sending} disabled={chosen === null || sending} onClick={take}>
          {sending ? "Taking…" : chosen === null ? (allUp ? "Tap a card to take him" : "Turning them over…") : `Take the field with ${firstName(pool[chosen].name)}`}
        </PrimaryButton>
      </BottomBar>
    </Screen>
  );
}
