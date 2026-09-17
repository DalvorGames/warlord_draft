"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { BottomBar, PrimaryButton } from "@/components/BottomBar";
import { RunHeader } from "@/components/RunHeader";
import { Screen } from "@/components/Screen";
import { StepBar } from "@/components/StepBar";
import { Reel, type ReelLine, type ReelPhase } from "@/components/draft/Reel";
import { UnitCard } from "@/components/draft/UnitCard";
import { useCampaign } from "@/lib/campaign/CampaignProvider";
import { consequenceLine, cultureTallies } from "@/lib/draftRules";
import { SLOT_HINT, SLOT_LABEL, cultureColor, cultureShort, traitName } from "@/lib/text";

/** Rows already rolled in this page load, so going back does not re-spin. */
const rolled = new Set<string>();

export default function DraftRowPage() {
  const params = useParams<{ row: string }>();
  const router = useRouter();
  const rowIndex = Math.max(0, Math.min(7, Number(params.row) - 1 || 0));
  const { engine, hydrated, save, updateDraft, setRow, setStage } = useCampaign();
  const [phase, setPhase] = useState<ReelPhase[]>([]);
  const [landed, setLanded] = useState<number | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const rollingRef = useRef(false);

  useEffect(() => {
    if (hydrated && !save) router.replace("/");
    else if (save && save.draft.generalIndex === null) router.replace("/general");
  }, [hydrated, save, router]);
  useEffect(() => {
    if (save && save.row !== rowIndex) setRow(rowIndex);
  }, [save, rowIndex, setRow]);

  const state = save?.draft ?? null;
  const row = state?.rows[rowIndex] ?? null;
  const rollKey = state ? `${state.draftSeed}:${rowIndex}:${state.rerollLog.filter((r) => r === rowIndex).length}` : "";

  // Slot cadence (v2 §5.1): every reel loops, then they brake and stop one at a time, top to bottom.
  const roll = (n: number) => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    rollingRef.current = true;
    setPhase(Array(n).fill(0) as ReelPhase[]);
    setLanded(null);
    for (let i = 0; i < n; i++) {
      const settleAt = 520 + i * 300 + (i === n - 1 ? 80 : 0);
      timers.current.push(setTimeout(() => setPhase((p) => p.map((x, k) => (k === i ? 1 : x))), settleAt - 480));
      timers.current.push(
        setTimeout(() => {
          setPhase((p) => p.map((x, k) => (k === i ? 2 : x)));
          setLanded(i);
          if (i === n - 1) rollingRef.current = false;
        }, settleAt),
      );
    }
  };
  useEffect(() => {
    if (!row || !rollKey || rolled.has(rollKey)) return;
    rolled.add(rollKey);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the reel is timer-driven by design (v2 §5.1)
    roll(row.cards.length);
    return () => {
      if (rollingRef.current) rolled.delete(rollKey);
      timers.current.forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rollKey]);

  const reelLines = useMemo<ReelLine[]>(() => {
    if (!engine || !row) return [];
    const others = Object.keys(engine.data.cultures).filter((c) => c !== row.culture);
    const pools = [row.culture, others[(rowIndex * 2) % others.length], others[(rowIndex * 2 + 1) % others.length]].map((c) => engine.data.units.filter((u) => u.culture === c));
    const lines: ReelLine[] = [];
    for (let i = 0; lines.length < 8 && i < 12; i++) {
      const pool = pools[i % 3];
      const u = pool[(i * 5 + rowIndex) % pool.length];
      if (u) lines.push({ grade: u.grade, name: u.name });
    }
    return lines;
  }, [engine, row, rowIndex]);

  if (!engine || !state || !row) return <Screen />;
  const cc = cultureColor(row.culture);
  const summary = engine.summarize(state);
  const rowTally = summary.cultureCounts[row.culture] ?? 0;
  const [t1, t2] = engine.data.rules.traitThresholds;
  const rowNote = cultureTallies(engine, state).find((t) => t.culture === row.culture)?.note ?? `${t1 - rowTally} more for ${traitName(engine, row.culture)}.`;
  const rolling = phase.some((p) => p < 2);
  const nextUnpicked = state.rows.findIndex((r, i) => i > rowIndex && r.pick === null);
  const allPicked = state.rows.every((r) => r.pick !== null);

  const pick = (card: number) => {
    if (rolling) return;
    updateDraft((e, d) => (d.rows[rowIndex].pick === card ? e.unpickRow(d, rowIndex) : e.pickCard(d, rowIndex, card)));
  };
  const reroll = () => {
    if (rolling || row.pick !== null || state.rerollsLeft <= 0) return;
    updateDraft((e, d) => e.rerollRow(d, rowIndex));
  };
  const next = () => {
    if (row.pick === null || rolling) return;
    if (allPicked) {
      setStage("deploy");
      router.push("/deploy/1");
    } else router.push(`/draft/${(nextUnpicked >= 0 ? nextUnpicked : state.rows.findIndex((r) => r.pick === null)) + 1}`);
  };

  const chips = [
    { k: "ELITE", v: `${summary.eliteUsed} / ${summary.eliteCap}`, color: "var(--bone)", edge: "var(--rule)" },
    { k: "TAKEN", v: `${summary.picksMade} / 8`, color: "var(--center)", edge: "var(--rule)" },
    { k: cultureShort(engine, row.culture).toUpperCase(), v: `${rowTally} / ${rowTally >= t1 ? t2 : t1}`, color: rowTally >= t1 ? cc.bright : "var(--center)", edge: rowTally >= t1 ? cc.deep : "var(--rule)" },
  ];

  return (
    <Screen>
      <RunHeader
        back={rowIndex === 0 ? "/general" : `/draft/${rowIndex}`}
        label={`Row ${rowIndex + 1} of 8`}
        help
        right={
          <Link href="/draft/board" className="flex h-11 min-w-11 items-center justify-center pr-2 pl-1 text-[13px] text-bone no-underline">
            Board
          </Link>
        }
      />
      <div className="px-[18px] pb-3">
        <StepBar steps={state.rows.map((_, i) => `Row ${i + 1}`)} current={rowIndex} />
      </div>
      <div className="flex items-end justify-between gap-3 px-[18px] pb-3">
        <div className="flex min-w-0 flex-col gap-[3px]">
          <span className="font-mono text-[13px] tracking-[0.2em] text-rust">{SLOT_LABEL[row.slot]}</span>
          <span className="display text-[27px] leading-[1.05]" style={{ color: cc.bright }}>
            {cultureShort(engine, row.culture)}
          </span>
          <span className="text-[11px] leading-snug text-faint-2">{SLOT_HINT[row.slot]}</span>
        </div>
        <button
          type="button"
          onClick={reroll}
          disabled={rolling || row.pick !== null || state.rerollsLeft <= 0}
          className="min-h-11 shrink-0 rounded-[3px] border bg-transparent px-[13px] py-[11px] text-xs"
          style={state.rerollsLeft > 0 && row.pick === null ? { borderColor: "var(--rule-btn)", color: "var(--bone)" } : { borderColor: "var(--raised)", color: "#5c5749" }}
        >
          {state.rerollsLeft > 0 ? `Reroll · ${state.rerollsLeft}` : "No rerolls"}
        </button>
      </div>
      <main className="flex grow flex-col gap-[9px] px-[18px]">
        {row.cards.map((c, i) => {
          const unit = engine.data.unitById.get(c.unitId)!;
          const ph = phase[i] ?? 2;
          const stop: ReelLine[] = [...reelLines.slice(0, 6), { grade: unit.grade, name: unit.name, hot: true }, ...reelLines.slice(6, 9)];
          return (
            <div key={`${c.unitId}-${i}`} className="relative min-h-[132px] grow basis-0">
              {ph < 2 ? (
                <Reel phase={ph} lines={reelLines} stop={stop} speedMs={260 + i * 30} delayMs={-i * 90} line={cc.bright} />
              ) : (
                <UnitCard unit={unit} selected={row.pick === i} dimmed={row.pick !== null && row.pick !== i} consequence={consequenceLine(engine, state, rowIndex, i)} onClick={() => pick(i)} landed={landed === i} edge={cc.bright} />
              )}
            </div>
          );
        })}
        {row.cards.length < engine.data.rules.cardsPerRow && (
          <div className="flex min-h-[60px] items-center justify-center rounded-lg border border-dashed border-rule px-4 text-center text-[11px] text-faint-2">
            {cultureShort(engine, row.culture)} fields only {row.cards.length} {row.slot === "flex" ? "units" : `${row.slot} units`}.
          </div>
        )}
      </main>
      <BottomBar>
        <div className="flex gap-[7px]">
          {chips.map((ch) => (
            <div key={ch.k} className="flex grow basis-0 flex-col gap-0.5 rounded-[3px] border bg-raised px-2 py-[7px]" style={{ borderColor: ch.edge }}>
              <span className="font-mono text-[8px] tracking-[0.08em] text-faint-2">{ch.k}</span>
              <span className="font-mono text-xs" style={{ color: ch.color }}>
                {ch.v}
              </span>
            </div>
          ))}
        </div>
        <div className="text-[11px] leading-snug text-faint">{rowNote}</div>
        <PrimaryButton muted={row.pick === null || rolling} disabled={row.pick === null || rolling} onClick={next}>
          {rolling ? "Rolling…" : row.pick === null ? "Take one to go on" : allPicked ? "Set the line" : "Next row"}
        </PrimaryButton>
      </BottomBar>
    </Screen>
  );
}
