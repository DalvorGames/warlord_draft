"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { cohesionWord, deployPreview, type Front, type PlanName } from "@warlord/engine";
import { BottomBar, PrimaryButton } from "@/components/BottomBar";
import { RunHeader } from "@/components/RunHeader";
import { Screen } from "@/components/Screen";
import { StepBar } from "@/components/StepBar";
import { UnitChip } from "@/components/deploy/UnitChip";
import { useCampaign } from "@/lib/campaign/CampaignProvider";
import { emptyFrontNote, enemyRead, planNote, terrainNote } from "@/lib/deployText";
import { STEPS } from "@/lib/steps";
import { PLAN_LABEL } from "@/lib/text";

const FRONT_DEFS: { id: Front; label: string; faces: string; grow: number }[] = [
  { id: "L", label: "LEFT", faces: "FACES HIS RIGHT", grow: 1 },
  { id: "C", label: "CENTER", faces: "FACES HIS CENTER", grow: 1.25 },
  { id: "R", label: "RIGHT", faces: "FACES HIS LEFT", grow: 1 },
];
const OPP: Record<Front, Front> = { L: "R", C: "C", R: "L" };
const PLANS: PlanName[] = ["aggressive", "defensive", "envelopment", "skirmish"];

export default function DeployPage() {
  const params = useParams<{ battle: string }>();
  const router = useRouter();
  const n = Math.max(1, Math.min(3, Number(params.battle) || 1));
  const i = n - 1;
  const { engine, hydrated, save, army, battles, setBattlePlan, setBattleDeployment, giveBattle, setStage } = useCampaign();
  const [held, setHeld] = useState<number | null>(null);

  useEffect(() => {
    if (!engine) return;
    if (hydrated && !save) router.replace("/");
    else if (save && !army) router.replace(`/draft/${save.row + 1}`);
    else if (save && save.battles[i]?.fought) router.replace(`/battle/${n}`);
    else if (save && save.stage !== "deploy") setStage("deploy");
  }, [engine, hydrated, save, army, i, n, router, setStage]);

  const b = battles[i];
  const play = save?.battles[i];
  const plan: PlanName = play?.plan ?? (engine && army ? engine.data.rules.styleToPlan[engine.data.generalById.get(army.generalId)!.style] : "defensive");
  const placed: (Front | null)[] = play?.deployment ?? army?.slots.map(() => null) ?? [];

  const preview = useMemo(() => {
    if (!engine || !army || !b) return null;
    if (!placed.some((f) => f)) return null;
    const his = engine.defaultDeployment(b.foe);
    const hisCount = (f: Front) => his.filter((x) => x === f).length;
    return deployPreview(engine.data, { ...army, plan }, b.spec.terrain, { L: hisCount(OPP.L), C: hisCount(OPP.C), R: hisCount(OPP.R) }, placed);
  }, [engine, army, b, placed, plan]);

  if (!engine || !save || !army || !b) return <Screen />;
  const units = army.slots.map((s) => engine.data.unitById.get(s.unitId)!);
  const general = engine.data.generalById.get(army.generalId)!;
  const tray = placed.map((f, k) => (f ? -1 : k)).filter((k) => k >= 0);
  const allPlaced = tray.length === 0;
  const pn = planNote(engine, plan, army.generalId);

  const put = (target: Front | null) => {
    if (held === null) return;
    const next = placed.slice();
    next[held] = target;
    setBattleDeployment(i, next);
    setHeld(null);
  };
  const standard = () => {
    setBattleDeployment(i, engine.defaultDeployment({ ...army, plan }));
    setHeld(null);
  };
  const give = () => {
    if (!allPlaced) return;
    giveBattle(i, plan);
    router.push(`/battle/${n}`);
  };

  return (
    <Screen>
      <RunHeader
        back={i === 0 ? "/draft/8" : `/between/${i}`}
        label={`Battle ${n} of 3 · Deploy`}
        right={
          <Link href={`/deploy/${n}/roster`} className="flex h-11 min-w-11 items-center justify-center px-2 text-[13px] text-bone no-underline">
            Roster
          </Link>
        }
      />
      <div className="px-[18px] pb-2.5">
        <StepBar steps={[...STEPS]} current={1 + n} />
      </div>
      <div className="flex items-end justify-between px-[18px] pb-2">
        <div className="flex flex-col">
          <span className="display text-[27px] leading-[1.05]">Set the line</span>
          <span className="font-mono text-[10px] tracking-[0.12em] uppercase text-faint">
            {b.foeGeneral} · {b.spec.terrain}
          </span>
        </div>
        <button type="button" onClick={standard} className="min-h-11 rounded-md border border-rule-btn bg-transparent px-3 py-[9px] text-xs text-dim">
          Standard order
        </button>
      </div>
      <div className="flex flex-col gap-1.5 px-[18px] pb-2.5">
        <div className="flex gap-[5px]">
          {PLANS.map((p) => {
            const on = p === plan;
            return (
              <button key={p} type="button" onClick={() => setBattlePlan(i, p)} aria-pressed={on} className="min-h-10 grow basis-0 rounded-md border px-1 text-[11px]" style={{ background: on ? "var(--panel-sel)" : "transparent", borderColor: on ? "var(--accent)" : "#3d382f", color: on ? "var(--bone)" : "var(--dim)" }}>
                {PLAN_LABEL[p][0] + PLAN_LABEL[p].slice(1).toLowerCase()}
              </button>
            );
          })}
        </div>
        <span className="text-[11px] leading-snug" style={{ color: pn.matches ? "var(--brass)" : "var(--faint)" }}>
          {pn.text}
        </span>
        <span className="text-[11px] leading-snug text-faint-2">{terrainNote(engine, b.spec.terrain)}</span>
      </div>
      <div className="mx-[18px] mb-2.5 flex items-center gap-2.5 rounded-md border border-dashed border-hidden-edge bg-hidden px-2.5 py-2">
        <div className="flex shrink-0 gap-1">
          {[26, 40, 26].map((w, k) => (
            <div key={k} className="flex h-[26px] items-center justify-center rounded-sm border border-rule font-mono text-[11px] text-zero" style={{ width: w }}>
              ?
            </div>
          ))}
        </div>
        <span className="text-[11px] leading-snug text-dim">{enemyRead(engine, b.foe)}</span>
      </div>
      <main className="flex grow flex-col gap-2 px-[18px]">
        {FRONT_DEFS.map((d) => {
          const idx = placed.map((f, k) => (f === d.id ? k : -1)).filter((k) => k >= 0);
          const holdingElsewhere = held !== null && placed[held] !== d.id;
          const pv = preview?.fronts[d.id];
          const thr = pv?.threshold ?? 0;
          const word = idx.length ? cohesionWord(thr) : "NOTHING HERE";
          const wordColor = !idx.length ? "var(--bad)" : thr >= 1 ? "var(--brass)" : thr >= 0.92 ? "var(--center)" : "var(--bad)";
          return (
            <section key={d.id} className="flex flex-col gap-[7px] rounded-lg border px-3 py-2.5" style={{ minHeight: d.id === "C" ? 120 : 96, background: holdingElsewhere ? "#1e1b15" : "var(--panel)", borderColor: holdingElsewhere ? "#6b5636" : idx.length === 0 ? "#4a3228" : "var(--rule-2)" }}>
              <div className="flex items-baseline justify-between">
                <div className="flex items-baseline gap-[9px]">
                  <span className="font-mono text-[11px] tracking-[0.16em] text-bone">{d.label}</span>
                  <span className="font-mono text-[9px] text-[#5c5749]">{d.faces}</span>
                </div>
                <div className="flex items-baseline gap-1.5">
                  {pv && pv.reserve > 0 && <span className="font-mono text-[9px] tracking-[0.08em] text-faint-2">{pv.reserve} IN RESERVE</span>}
                  <span className="font-mono text-[10px] tracking-[0.08em]" style={{ color: wordColor }}>
                    {word}
                  </span>
                  {idx.length > 0 && <span className="font-mono text-[10px] text-faint-2">{thr.toFixed(2)}</span>}
                </div>
              </div>
              <div className="flex grow flex-wrap content-start gap-[5px]">
                {idx.map((k) => (
                  <UnitChip key={k} unit={units[k]} held={held === k} onClick={() => setHeld(held === k ? null : k)} />
                ))}
                {idx.length === 0 && !holdingElsewhere && <span className="px-0.5 py-1.5 text-[11px] leading-snug text-bad">{emptyFrontNote(engine, d.id, general.name)}</span>}
                {holdingElsewhere && (
                  <button type="button" onClick={() => put(d.id)} className="min-h-11 w-full rounded-sm border border-dashed border-accent bg-panel-sel px-2.5 py-2.5 text-[13px] font-medium text-bone">
                    Place on the {d.label.toLowerCase()}
                  </button>
                )}
              </div>
            </section>
          );
        })}
      </main>
      <div className="px-[18px] pt-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-full font-mono text-[9px] tracking-[0.12em] text-faint-2">NOT YET PLACED</span>
          {tray.map((k) => (
            <UnitChip key={k} unit={units[k]} held={held === k} onClick={() => setHeld(held === k ? null : k)} large />
          ))}
          {allPlaced && held === null && <span className="text-xs text-faint-2">All eight are on the line.</span>}
          {held !== null && placed[held] !== null && (
            <button type="button" onClick={() => put(null)} className="min-h-10 rounded-sm border border-dashed border-rule-btn bg-transparent px-3 py-2 text-xs text-dim">
              Take off the line
            </button>
          )}
        </div>
      </div>
      <BottomBar>
        <div className="min-h-[17px] text-xs leading-snug" style={{ color: held === null ? "var(--faint-2)" : "var(--brass)" }}>
          {held === null ? (allPlaced ? "Tap any unit to move it." : "Tap a unit, then tap where it stands.") : `Holding ${units[held].name}. Tap a front.`}
        </div>
        <PrimaryButton muted={!allPlaced} disabled={!allPlaced} onClick={give}>
          {allPlaced ? "Give battle" : `${tray.length} still unplaced`}
        </PrimaryButton>
      </BottomBar>
    </Screen>
  );
}
