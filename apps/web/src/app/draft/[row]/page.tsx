"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { BottomBar, PrimaryButton } from "@/components/BottomBar";
import { RunHeader } from "@/components/RunHeader";
import { Screen } from "@/components/Screen";
import { StepBar } from "@/components/StepBar";
import { Reel } from "@/components/draft/Reel";
import { UnitCard } from "@/components/draft/UnitCard";
import { useCampaign } from "@/lib/campaign/CampaignProvider";
import { consequenceLine, cultureTallies } from "@/lib/draftRules";
import { SLOT_LABEL, cultureShort, traitName } from "@/lib/text";

/** Rows already rolled in this page load, so going back does not re-spin. */
const rolled = new Set<string>();

export default function DraftRowPage() {
  const params = useParams<{ row: string }>();
  const router = useRouter();
  const rowIndex = Math.max(0, Math.min(7, Number(params.row) - 1 || 0));
  const { engine, hydrated, save, updateDraft, setRow, setStage } = useCampaign();
  const [spin, setSpin] = useState(0); // cards still spinning, from the top
  const [landed, setLanded] = useState<number | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

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

  const spinRef = useRef(0);
  const roll = (n: number) => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    spinRef.current = n;
    setSpin(n);
    for (let i = 0; i < n; i++) {
      timers.current.push(
        setTimeout(() => {
          spinRef.current = n - 1 - i;
          setSpin(n - 1 - i);
          setLanded(i);
        }, 520 + i * 210),
      );
    }
  };
  useEffect(() => {
    if (!row || !rollKey || rolled.has(rollKey)) return;
    rolled.add(rollKey);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the reel is timer-driven by design (handoff §5.1)
    roll(row.cards.length);
    return () => {
      // Interrupted mid-roll (dev double-mount, or leaving early): forget the key so the row rolls again.
      if (spinRef.current > 0) rolled.delete(rollKey);
      timers.current.forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rollKey]);

  const reelLines = useMemo(() => {
    if (!engine || !row) return [];
    const others = Object.keys(engine.data.cultures).filter((c) => c !== row.culture);
    const pools = [row.culture, others[(rowIndex * 2) % others.length], others[(rowIndex * 2 + 1) % others.length]].map((c) => engine.data.units.filter((u) => u.culture === c));
    const lines: { grade: string; name: string }[] = [];
    for (let i = 0; lines.length < 8 && i < 8; i++) {
      const pool = pools[i % 3];
      const u = pool[(i * 5 + rowIndex) % pool.length];
      if (u) lines.push({ grade: u.grade, name: u.name });
    }
    return lines;
  }, [engine, row, rowIndex]);

  if (!engine || !state || !row) return <Screen />;
  const summary = engine.summarize(state);
  const rowTally = summary.cultureCounts[row.culture] ?? 0;
  const [t1, t2] = engine.data.rules.traitThresholds;
  const rowNote = cultureTallies(engine, state).find((t) => t.culture === row.culture)?.note ?? `${t1 - rowTally} more for ${traitName(engine, row.culture)}.`;
  const spinning = spin > 0;
  const nextUnpicked = state.rows.findIndex((r, i) => i > rowIndex && r.pick === null);
  const allPicked = state.rows.every((r) => r.pick !== null);

  const pick = (card: number) => {
    if (spinning) return;
    updateDraft((e, d) => (d.rows[rowIndex].pick === card ? e.unpickRow(d, rowIndex) : e.pickCard(d, rowIndex, card)));
  };
  const reroll = () => {
    if (spinning || row.pick !== null || state.rerollsLeft <= 0) return;
    updateDraft((e, d) => e.rerollRow(d, rowIndex));
  };
  const next = () => {
    if (row.pick === null || spinning) return;
    if (allPicked) {
      setStage("deploy");
      router.push("/deploy/1");
    } else router.push(`/draft/${(nextUnpicked >= 0 ? nextUnpicked : state.rows.findIndex((r) => r.pick === null)) + 1}`);
  };

  const chips = [
    { k: "ELITE", v: `${summary.eliteUsed} / ${summary.eliteCap}`, color: "var(--brass)", edge: "var(--rule-2)" },
    { k: "TAKEN", v: `${summary.picksMade} / 8`, color: "var(--center)", edge: "var(--rule-2)" },
    { k: cultureShort(engine, row.culture).toUpperCase(), v: `${rowTally} / ${rowTally >= t1 ? t2 : t1}`, color: rowTally >= t1 ? "var(--brass)" : "var(--center)", edge: rowTally >= t1 ? "#7a6420" : "var(--rule-2)" },
  ];

  return (
    <Screen>
      <RunHeader
        back={rowIndex === 0 ? "/general" : `/draft/${rowIndex}`}
        label={`Row ${rowIndex + 1} of 8`}
        right={
          <Link href="/draft/board" className="flex h-11 min-w-11 items-center justify-center px-2 text-[13px] text-bone no-underline">
            Board
          </Link>
        }
      />
      <div className="px-[18px] pb-3">
        <StepBar steps={state.rows.map((_, i) => `Row ${i + 1}`)} current={rowIndex} />
      </div>
      <div className="flex items-end justify-between px-[18px] pb-3">
        <div className="flex min-w-0 flex-col gap-[3px]">
          <span className="font-mono text-[13px] tracking-[0.2em] text-accent">{SLOT_LABEL[row.slot]}</span>
          <span className="display text-[27px] leading-[1.05]">{cultureShort(engine, row.culture)}</span>
          <span className="text-[11px] leading-snug text-faint-2">The row picks the culture. Where it stands is your call.</span>
        </div>
        <button
          type="button"
          onClick={reroll}
          disabled={spinning || row.pick !== null || state.rerollsLeft <= 0}
          className="min-h-11 shrink-0 rounded-md border bg-transparent px-[13px] py-[11px] text-xs"
          style={state.rerollsLeft > 0 && row.pick === null ? { borderColor: "var(--rule-btn)", color: "var(--bone)" } : { borderColor: "var(--rule)", color: "#5c5749" }}
        >
          {state.rerollsLeft > 0 ? `Reroll · ${state.rerollsLeft}` : "No rerolls"}
        </button>
      </div>
      <main className="flex grow flex-col gap-[9px] px-[18px]">
        {row.cards.map((c, i) => {
          const unit = engine.data.unitById.get(c.unitId)!;
          const isSpinning = i < spin;
          return (
            <div key={`${c.unitId}-${i}`} className="relative min-h-[132px] grow basis-0">
              {isSpinning ? (
                <Reel lines={reelLines} speedMs={340 + i * 45} delayMs={-i * 90} />
              ) : (
                <UnitCard unit={unit} selected={row.pick === i} dimmed={row.pick !== null && row.pick !== i} consequence={consequenceLine(engine, state, rowIndex, i)} onClick={() => pick(i)} landed={landed === i && rolled.has(rollKey)} />
              )}
            </div>
          );
        })}
        {row.cards.length < engine.data.rules.cardsPerRow && (
          <div className="flex min-h-[60px] items-center justify-center rounded-lg border border-dashed border-hidden-edge px-4 text-center text-[11px] text-faint-2">
            {cultureShort(engine, row.culture)} fields only {row.cards.length} {row.slot === "flex" ? "units" : `${row.slot} units`}.
          </div>
        )}
      </main>
      <BottomBar>
        <div className="flex gap-[7px]">
          {chips.map((ch) => (
            <div key={ch.k} className="flex grow basis-0 flex-col gap-0.5 rounded-md border bg-panel-2 px-2 py-[7px]" style={{ borderColor: ch.edge }}>
              <span className="font-mono text-[8px] tracking-[0.08em] text-faint-2">{ch.k}</span>
              <span className="font-mono text-xs" style={{ color: ch.color }}>
                {ch.v}
              </span>
            </div>
          ))}
        </div>
        <div className="text-[11px] leading-snug text-faint">{rowNote}</div>
        <PrimaryButton muted={row.pick === null || spinning} disabled={row.pick === null || spinning} onClick={next}>
          {spinning ? "Rolling…" : row.pick === null ? "Take one to go on" : allPicked ? "Set the line" : "Next row"}
        </PrimaryButton>
      </BottomBar>
    </Screen>
  );
}
