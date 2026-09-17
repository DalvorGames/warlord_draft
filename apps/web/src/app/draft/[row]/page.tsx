"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { StatKey, Unit } from "@warlord/engine";
import { BottomBar, PrimaryButton } from "@/components/BottomBar";
import { HeaderLink, RunHeader } from "@/components/RunHeader";
import { Screen } from "@/components/Screen";
import { StepBar } from "@/components/StepBar";
import { Reel, type ReelLine, type ReelPhase } from "@/components/draft/Reel";
import { Token } from "@/components/ui/Token";
import { InfoLabel, InlineNote, Hint } from "@/components/ui/Note";
import { useCampaign } from "@/lib/campaign/CampaignProvider";
import { consequenceLine, loudStats, rowBest } from "@/lib/draftRules";
import { useHint } from "@/lib/hints";
import { PresenceLine, Timer } from "@/components/versus/Presence";
import { countdown, useServerClock } from "@/lib/versus/client";
import { routeForDuel } from "@/lib/versus/duel";
import { CLASS_WORD, SLOT_LABEL, SLOT_QUESTION, STAT_NOTE, STAT_TITLE, STAT_WORD, cultureColor, cultureShort, gradeStyle, shortUnitName, subtypeWord } from "@/lib/text";

/** Rows already rolled in this page load, so going back does not re-spin. */
const rolled = new Set<string>();

export default function DraftRowPage() {
  const params = useParams<{ row: string }>();
  const router = useRouter();
  const rowIndex = Math.max(0, Math.min(7, Number(params.row) - 1 || 0));
  const { engine, hydrated, save, general, duel, draftFrozen, updateDraft, setRow, setStage } = useCampaign();
  const now = useServerClock(duel?.serverNow ?? Date.now);
  const [chosen, setChosen] = useState<number | null>(null); // a duel picks locally, then Next row commits
  const [sending, setSending] = useState(false);
  const [phase, setPhase] = useState<ReelPhase[]>([]);
  const [landed, setLanded] = useState<number | null>(null);
  const [note, setNote] = useState<string | null>(null); // `${card}:${key}` or `${card}:why`
  const [flexHint, dismissFlexHint] = useHint("flex-loud");
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const rollingRef = useRef(false);

  useEffect(() => {
    if (hydrated && !save) router.replace("/");
    else if (save && save.draft.generalIndex === null) router.replace("/general");
    else if (save && save.kind === "duel" && duel) {
      // The server owns the step: rows are sequential, and a timer may have moved you on.
      const want = routeForDuel(duel.view);
      if (want !== `/draft/${rowIndex + 1}`) router.replace(want);
    } else if (save && draftFrozen) router.replace(`/deploy/${save.battleIndex + 1}`);
  }, [hydrated, save, duel, draftFrozen, rowIndex, router]);
  useEffect(() => {
    if (save && save.kind !== "duel" && save.row !== rowIndex) setRow(rowIndex);
  }, [save, rowIndex, setRow]);

  const state = save?.draft ?? null;
  const row = state?.rows[rowIndex] ?? null;
  const rollKey = state ? `${state.draftSeed}:${rowIndex}:${state.rerollLog.filter((r) => r === rowIndex).length}` : "";

  // Slot cadence (v2 §5.1): every reel loops, then they brake and stop one at a time, top to bottom.
  const roll = (n: number) => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    const instant = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (instant) { setPhase(Array(n).fill(2) as ReelPhase[]); return; }
    rollingRef.current = true;
    setPhase(Array(n).fill(0) as ReelPhase[]);
    setLanded(null);
    for (let i = 0; i < n; i++) {
      const settleAt = 520 + i * 300 + (i === n - 1 ? 80 : 0);
      timers.current.push(setTimeout(() => setPhase((p) => p.map((x, k) => (k === i ? 1 : x))), settleAt - 480));
      timers.current.push(setTimeout(() => { setPhase((p) => p.map((x, k) => (k === i ? 2 : x))); setLanded(i); if (i === n - 1) rollingRef.current = false; }, settleAt));
    }
  };
  useEffect(() => {
    if (!row || !rollKey || rolled.has(rollKey)) return;
    rolled.add(rollKey);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the reel is timer-driven by design (v2 §5.1)
    roll(row.cards.length);
    setNote(null);
    return () => {
      if (rollingRef.current) rolled.delete(rollKey);
      timers.current.forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rollKey]);

  const reelLines = useMemo<ReelLine[]>(() => {
    if (!engine) return [];
    const lines: ReelLine[] = [];
    for (let i = 0; lines.length < 8; i++) {
      const u = engine.data.units[(i * 17 + rowIndex * 5) % engine.data.units.length];
      lines.push({ grade: u.grade, name: u.name });
    }
    return lines;
  }, [engine, rowIndex]);

  if (!engine || !state || !row || !general) return <Screen />;
  const summary = engine.summarize(state);
  const loud = loudStats(engine, state, rowIndex);
  const rolling = phase.some((p) => p < 2);
  const nextUnpicked = state.rows.findIndex((r, i) => i > rowIndex && r.pick === null);
  const allPicked = state.rows.every((r) => r.pick !== null);
  const homeCC = cultureColor(general.culture);
  const [t1, t2] = engine.data.rules.traitThresholds;
  const homeCount = summary.cultureCounts[general.culture] ?? 0;

  const picked = duel ? chosen : row.pick;
  const pick = (card: number) => {
    if (rolling) return;
    if (duel) { setChosen((c) => (c === card ? null : card)); return; }
    updateDraft((e, d) => (d.rows[rowIndex].pick === card ? e.unpickRow(d, rowIndex) : e.pickCard(d, rowIndex, card)));
  };
  const reroll = async () => {
    if (rolling || picked !== null || state.rerollsLeft <= 0) return;
    if (duel) { setChosen(null); try { await duel.pick({ reroll: true }); } catch { /* the poll will say */ } return; }
    updateDraft((e, d) => e.rerollRow(d, rowIndex));
  };
  const next = async () => {
    if (picked === null || rolling) return;
    if (duel) {
      setSending(true);
      try { await duel.pick({ card: picked }); setChosen(null); router.push(rowIndex === 7 ? "/deploy/1" : `/draft/${rowIndex + 2}`); } catch { /* an illegal pick: the card stays, the error shows */ }
      setSending(false);
      return;
    }
    if (allPicked) { setStage("deploy"); router.push("/deploy/1"); }
    else router.push(`/draft/${(nextUnpicked >= 0 ? nextUnpicked : state.rows.findIndex((r) => r.pick === null)) + 1}`);
  };
  const timer = duel ? countdown(duel.view.me.deadline, now) : null;
  const toggle = (k: string) => setNote((n) => (n === k ? null : k));
  const best = Object.fromEntries(loud.keys.map((k) => [k, rowBest(engine, state, rowIndex, k)])) as Record<StatKey, number>;
  const canReroll = picked === null && state.rerollsLeft > 0 && !rolling;

  return (
    <Screen>
      <RunHeader back={duel ? undefined : rowIndex === 0 ? "/general" : `/draft/${rowIndex}`} label={`Row ${rowIndex + 1} of 8 · ${SLOT_LABEL[row.slot]}`} right={duel && timer ? <Timer text={timer.text} ms={timer.ms} /> : <HeaderLink href="/draft/board">Board</HeaderLink>} />
      <div className="px-5 pb-2">
        <StepBar steps={state.rows.map((_, i) => `Row ${i + 1}`)} current={rowIndex} />
      </div>
      {duel?.view.him && <PresenceLine name={duel.view.him.name} dot={duel.view.him.dot} where={duel.view.him.where} />}
      <div className="flex items-start justify-between gap-4 px-5 pt-2 pb-4">
        <div className="flex min-w-0 flex-col gap-1.5">
          <h1 className="display m-0 text-[30px] leading-[1.05]">{SLOT_QUESTION[row.slot]}</h1>
          <span className="text-[15px] leading-snug text-dim">{duel ? "Same four cards on his screen. Your pick stays hidden until the line is set." : loud.hint}</span>
        </div>
        <button type="button" onClick={reroll} disabled={!canReroll} className="flex min-h-[64px] shrink-0 flex-col items-center justify-center gap-1 rounded-[3px] border bg-transparent px-3.5 py-2" style={canReroll ? { borderColor: "var(--rule-btn)", color: "var(--bone)" } : { borderColor: "var(--rule)", color: "var(--faint)" }}>
          <span className="text-[17px]">{state.rerollsLeft > 0 ? "Reroll" : "No rerolls left"}</span>
          {state.rerollsLeft > 0 && <span className="font-mono text-[11px] tracking-[0.14em]">{state.rerollsLeft} LEFT{duel ? "" : " · 1 FREE"}</span>}
        </button>
      </div>
      {duel?.error && <div className="px-5 pb-2 text-[13px] text-rust">{duel.error}</div>}
      {row.slot === "flex" && flexHint && (
        <div className="px-5 pb-3">
          <Hint onDismiss={dismissFlexHint}>A flex row makes loud whatever your army still lacks: shooters first, then wings, then the center.</Hint>
        </div>
      )}
      <main className="flex grow flex-col gap-3 px-5 pb-4">
        {row.cards.map((c, i) => {
          const unit: Unit = engine.data.unitById.get(c.unitId)!;
          const ph = phase[i] ?? 2;
          const stop: ReelLine[] = [...reelLines.slice(0, 6), { grade: unit.grade, name: unit.name, hot: true }, ...reelLines.slice(6, 9)];
          const cc = cultureColor(unit.culture);
          const cons = consequenceLine(engine, state, rowIndex, i);
          const selected = picked === i;
          const disabled = cons.disabled && !selected;
          const gs = gradeStyle(unit.grade);
          const openKey = note?.startsWith(`${i}:`) ? note.slice(note.indexOf(":") + 1) : null;
          const tone = cons.tone === "bad" ? "var(--rust)" : cons.tone === "culture" ? cc.bright : cons.tone === "bone" ? "var(--bone)" : "var(--dim)";
          if (ph < 2) return <div key={`${c.unitId}-${i}`} className="relative min-h-[150px]"><Reel phase={ph} lines={reelLines} stop={stop} speedMs={260 + i * 30} delayMs={-i * 90} line={cc.bright} /></div>;
          return (
            <div key={`${c.unitId}-${i}`} className="flex flex-col gap-3 rounded-lg border bg-panel px-4 py-3.5" style={{ borderColor: selected ? "var(--bone)" : "var(--rule)", borderLeft: `3px solid ${cc.bright}`, opacity: disabled ? 0.6 : 1, animation: landed === i ? "wdland 240ms ease-out 1" : undefined }} aria-disabled={disabled}>
              <div className="flex items-center gap-3">
                <Token unit={unit} size={44} />
                <div className="flex min-w-0 grow flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <span className="min-w-0 truncate text-[17px] font-semibold text-bone">{shortUnitName(unit)}</span>
                    <span className="shrink-0 rounded-sm border px-1.5 font-mono text-[11px] font-semibold" style={{ background: gs.bg, color: gs.text, borderColor: gs.edge }}>{unit.grade}</span>
                  </div>
                  <span className="label text-faint">
                    {CLASS_WORD[unit.class]} · {subtypeWord(unit.subtype)} <span style={{ color: cc.bright }}>{cultureShort(engine, unit.culture).toUpperCase()}</span>
                  </span>
                </div>
                <button type="button" onClick={() => pick(i)} disabled={disabled} aria-pressed={selected} aria-label={selected ? `Unpick ${unit.name}` : `Take ${unit.name}`} className="flex h-11 w-11 shrink-0 items-center justify-center border-0 bg-transparent p-0">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 text-[15px] text-ink" style={{ borderColor: selected ? "var(--bone)" : "var(--rule-btn)", background: selected ? "var(--bone)" : "transparent" }}>{selected ? "✓" : ""}</span>
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {loud.keys.map((k) => {
                  const v = unit.stats[k];
                  const delta = best[k] - v;
                  const isBest = delta === 0;
                  return (
                    <div key={k} className="flex flex-col gap-1">
                      <div className="flex items-baseline justify-between gap-1">
                        <InfoLabel onClick={() => toggle(`${i}:${k}`)} active={openKey === k}>{STAT_WORD[k]}</InfoLabel>
                        <span className="flex items-baseline gap-1.5">
                          <span className="font-mono text-[20px] font-semibold text-white">{v}</span>
                          <span className="font-mono text-[11px]" style={{ color: isBest ? "var(--dim)" : "var(--faint)" }}>{isBest ? "best here" : `−${delta}`}</span>
                        </span>
                      </div>
                      <div className="relative h-1.5 rounded-sm bg-ground">
                        <div className="h-1.5 rounded-sm" style={{ width: `${v}%`, background: isBest ? cc.bright : "var(--faint)" }} />
                        <div className="absolute top-[-2px] h-2.5 w-0.5 bg-bone" style={{ left: `calc(${best[k]}% - 1px)` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              {openKey && openKey !== "why" && <InlineNote title={STAT_TITLE[openKey as StatKey]}>{STAT_NOTE[openKey as StatKey]}</InlineNote>}
              <div className="flex flex-wrap gap-x-3 gap-y-1 font-mono text-[11px] tracking-[0.14em] text-faint">
                {(["melee", "ranged", "armor", "mobility", "discipline", "shock"] as StatKey[]).filter((k) => !loud.keys.includes(k)).map((k) => (
                  <span key={k}>{STAT_WORD[k]} <span style={{ color: unit.stats[k] === 0 ? "var(--zero)" : "var(--dim)" }}>{unit.stats[k]}</span></span>
                ))}
              </div>
              <button type="button" onClick={() => toggle(`${i}:why`)} aria-expanded={openKey === "why"} className="-mx-1 min-h-8 border-0 bg-transparent px-1 text-left font-mono text-[11px] tracking-[0.14em]" style={{ color: tone }}>
                {cons.text}
              </button>
              {openKey === "why" && cons.note && <InlineNote title={cons.note.title}>{cons.note.text}</InlineNote>}
            </div>
          );
        })}
      </main>
      <BottomBar>
        <div className="flex justify-between font-mono text-[11px] tracking-[0.14em]">
          <span className="text-dim">ELITE {summary.eliteUsed} / {summary.eliteCap}</span>
          <span className="text-dim">TAKEN {summary.picksMade} / 8</span>
          <span style={{ color: homeCount >= t1 ? homeCC.bright : "var(--dim)" }}>{cultureShort(engine, general.culture).toUpperCase()} {homeCount} OF {homeCount >= t1 ? t2 : t1}</span>
        </div>
        <PrimaryButton muted={picked === null || rolling || sending} disabled={picked === null || rolling || sending} onClick={next}>
          {sending ? "Taking…" : rolling ? "Rolling…" : picked === null ? "Take one to go on" : allPicked || (duel && rowIndex === 7) ? "Set the line" : "Next row"}
        </PrimaryButton>
      </BottomBar>
    </Screen>
  );
}
