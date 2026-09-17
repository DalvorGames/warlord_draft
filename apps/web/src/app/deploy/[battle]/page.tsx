"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { cohesionWord, deployPreview, type Front, type PlanName } from "@warlord/engine";
import { BottomBar, PrimaryButton } from "@/components/BottomBar";
import { RunHeader } from "@/components/RunHeader";
import { Screen } from "@/components/Screen";
import { Token } from "@/components/deploy/Token";
import { useCampaign } from "@/lib/campaign/CampaignProvider";
import { emptyFrontNote, inspectorFit, planNote, terrainLine } from "@/lib/deployText";
import { PLAN_TITLE, STAT_KEYS, STAT_WORD, WING_CLASSES, classTint, cultureColor, cultureShort } from "@/lib/text";

const FRONT_DEFS: { id: Front; label: string; grow: number }[] = [
  { id: "L", label: "LEFT", grow: 1 },
  { id: "C", label: "CENTER", grow: 1.5 },
  { id: "R", label: "RIGHT", grow: 1 },
];
const OPP: Record<Front, Front> = { L: "R", C: "C", R: "L" };
const PLANS: PlanName[] = ["aggressive", "defensive", "envelopment", "skirmish"];
const WING_KEYS = new Set(["mobility", "melee", "shock", "ranged"]);
const CENTER_KEYS = new Set(["melee", "armor", "discipline", "shock"]);

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

  const opposing = useMemo(() => {
    if (!engine || !b) return undefined;
    const his = engine.defaultDeployment(b.foe);
    const count = (f: Front) => his.filter((x) => x === f).length;
    return { L: count(OPP.L), C: count(OPP.C), R: count(OPP.R) };
  }, [engine, b]);
  const preview = useMemo(() => {
    if (!engine || !army || !b || !placed.some((f) => f)) return null;
    return deployPreview(engine.data, { ...army, plan }, b.spec.terrain, opposing, placed);
  }, [engine, army, b, placed, plan, opposing]);
  /** What each front would read if the held unit stood there (v2 §4.6). */
  const cohIf = useMemo(() => {
    if (!engine || !army || !b || held === null) return null;
    return FRONT_DEFS.map((d) => {
      const trial = placed.map((f, k) => (k === held ? d.id : f));
      const pv = deployPreview(engine.data, { ...army, plan }, b.spec.terrain, opposing, trial);
      return { id: d.id, word: cohesionWord(pv.fronts[d.id].threshold) };
    });
  }, [engine, army, b, held, placed, plan, opposing]);

  if (!engine || !save || !army || !b) return <Screen />;
  const units = army.slots.map((s) => engine.data.unitById.get(s.unitId)!);
  const general = engine.data.generalById.get(army.generalId)!;
  const bench = placed.map((f, k) => (f ? -1 : k)).filter((k) => k >= 0);
  const allPlaced = bench.length === 0;
  const pn = planNote(engine, plan, army.generalId);
  const count = (f: Front) => placed.filter((x) => x === f).length;
  const heldUnit = held === null ? null : units[held];
  const heldCC = heldUnit ? cultureColor(heldUnit.culture) : null;
  const heldWing = heldUnit ? WING_CLASSES.has(heldUnit.class) : false;
  const keys = heldWing ? WING_KEYS : CENTER_KEYS;

  const put = (target: Front | null) => {
    if (held === null) return;
    const next = placed.slice();
    next[held] = target;
    setBattleDeployment(i, next);
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
        label={`Battle ${n} of 3 · The field`}
        right={
          <Link href={`/deploy/${n}/roster`} className="flex h-11 min-w-11 items-center justify-center px-2 text-[13px] text-bone no-underline">
            Roster
          </Link>
        }
      />
      <div className="flex items-end justify-between px-[18px] pb-2.5">
        <div className="flex flex-col gap-0.5">
          <span className="display text-[27px] leading-[1.05]">Set the line</span>
          <span className="text-[11px] text-faint-2">{held === null ? "Tap a token to read it, then tap where it stands." : `Holding ${heldUnit!.name} — tap a front, or read it below.`}</span>
        </div>
        <div className="flex flex-col items-end gap-0.5">
          <span className="font-mono text-[8px] tracking-[0.14em] text-faint-2">YOUR SHAPE</span>
          <span className="font-mono text-[20px]" style={{ color: allPlaced ? "var(--bone)" : "var(--dim)" }}>
            {count("L")} · {count("C")} · {count("R")}
          </span>
        </div>
      </div>

      <div className="relative mx-[18px] flex min-h-[250px] grow flex-col overflow-hidden rounded-md border border-rule bg-[#191712]">
        <div className="absolute top-1/2 left-1/2 h-[90px] w-[90px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-raised" />
        <div className="flex shrink-0 items-center justify-between gap-3 px-3 pt-2">
          <span className="min-w-0 truncate font-mono text-[8px] tracking-[0.18em] text-faint-2">{terrainLine(engine, b.spec.terrain)}</span>
          <span className="shrink-0 font-mono text-[8px] tracking-[0.18em] text-faint-2">HIS LINE IS HIDDEN</span>
        </div>
        <div className="flex min-h-0 grow gap-2 px-3 pt-2.5 pb-3">
          {FRONT_DEFS.map((d) => {
            const idx = placed.map((f, k) => (f === d.id ? k : -1)).filter((k) => k >= 0);
            const elsewhere = held !== null && placed[held] !== d.id;
            const thr = preview?.fronts[d.id].threshold ?? 0;
            const reserve = preview?.fronts[d.id].reserve ?? 0;
            const coh = idx.length ? `${cohesionWord(thr)} ${thr.toFixed(2)}` : "NOBODY";
            return (
              <div key={d.id} className="relative flex min-w-0 basis-0 flex-col gap-1.5 rounded-[4px] border px-1.5 py-2" style={{ flexGrow: d.grow, borderColor: elsewhere ? "#6b5636" : idx.length === 0 ? "#4a3228" : "var(--raised)" }}>
                <div className="flex flex-col items-center gap-px">
                  <span className="font-mono text-[9px] tracking-[0.16em] text-bone">{d.label}</span>
                  <span className="font-mono text-[8px] tracking-[0.08em]" style={{ color: idx.length === 0 ? "var(--bad)" : thr >= 1 ? "var(--bone)" : thr >= 0.92 ? "var(--faint)" : "var(--rust)" }}>
                    {coh}
                  </span>
                  {reserve > 0 && <span className="font-mono text-[7px] tracking-[0.1em] text-faint-2">{reserve} IN RESERVE</span>}
                </div>
                <div className="flex grow flex-wrap content-start justify-center gap-1.5 pt-0.5">
                  {idx.map((k) => (
                    <Token key={k} unit={units[k]} held={held === k} onClick={() => setHeld(held === k ? null : k)} />
                  ))}
                  {idx.length === 0 && !elsewhere && <span className="px-0.5 py-2 text-center text-[10px] leading-[1.35] text-bad">{emptyFrontNote(engine, d.id, general.name)}</span>}
                </div>
                {elsewhere && (
                  <button type="button" onClick={() => put(d.id)} className="absolute inset-0 flex items-center justify-center rounded-[4px] border border-dashed border-rust p-2 text-center text-xs font-medium text-bone" style={{ background: "rgba(42, 36, 25, 0.86)" }}>
                    Place on the {d.label.toLowerCase()}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="mx-[18px] mt-2 box-border flex h-[142px] shrink-0 flex-col gap-[7px] rounded-[4px] border bg-panel px-3 py-[9px]" style={{ borderColor: heldUnit ? "var(--rule-btn)" : "var(--rule)", borderLeft: `3px solid ${heldCC ? heldCC.bright : "var(--rule)"}` }}>
        {!heldUnit ? (
          <div className="flex grow flex-col justify-center gap-1">
            <span className="text-xs leading-snug text-dim">Tap a token to see its numbers and where it fits.</span>
            <span className="text-[11px] leading-snug text-faint-2">Wings press with Speed and Fight. The center holds with Fight, Armor and Steady.</span>
          </div>
        ) : (
          <>
            <div className="flex items-baseline justify-between gap-2">
              <div className="flex min-w-0 items-baseline gap-[7px]">
                <span className="overflow-hidden text-[13px] font-semibold text-ellipsis whitespace-nowrap text-bone">{heldUnit.name}</span>
                <span className="shrink-0 rounded-sm border px-[5px] py-px font-mono text-[8px] tracking-[0.1em] uppercase" style={{ color: classTint(heldUnit.class).color, borderColor: classTint(heldUnit.class).color }}>
                  {heldUnit.class}
                </span>
              </div>
              <span className="shrink-0 font-mono text-[9px] tracking-[0.1em] uppercase" style={{ color: heldCC!.bright }}>
                {cultureShort(engine, heldUnit.culture)}
              </span>
            </div>
            <div className="grid grid-cols-6 gap-1.5">
              {STAT_KEYS.map((k) => {
                const v = heldUnit.stats[k];
                const lit = keys.has(k);
                return (
                  <div key={k} className="flex flex-col gap-0.5">
                    <div className="flex items-baseline justify-between">
                      <span className="font-mono text-[7px] tracking-[0.04em]" style={{ color: lit ? "var(--bone)" : "var(--faint-2)" }}>
                        {STAT_WORD[k]}
                      </span>
                      <span className="font-mono text-xs" style={{ color: v === 0 ? "var(--zero)" : v >= 75 ? "var(--white)" : "var(--center)" }}>
                        {Math.round(v)}
                      </span>
                    </div>
                    <div className="h-[3px] rounded-sm bg-ground">
                      <div className="h-[3px] rounded-sm" style={{ width: `${Math.round(v)}%`, background: lit ? heldCC!.bright : "var(--rule-btn)" }} />
                    </div>
                  </div>
                );
              })}
            </div>
            <span className="text-[11px] leading-snug" style={{ color: "var(--center)" }}>
              {inspectorFit(heldUnit).text}
              {cohIf && ` If placed: ${cohIf.map((c) => `${c.id === "L" ? "Left" : c.id === "C" ? "Center" : "Right"} ${c.word}`).join(" · ")}.`}
            </span>
          </>
        )}
      </div>

      <div className="flex shrink-0 flex-col gap-1.5 px-[18px] pt-2.5">
        <span className="font-mono text-[8px] tracking-[0.14em] text-faint-2">THE BENCH · NOT YET ON THE FIELD</span>
        <div className="flex min-h-12 items-center gap-2 overflow-x-auto">
          {bench.map((k) => (
            <div key={k} className="shrink-0">
              <Token unit={units[k]} held={held === k} onClick={() => setHeld(held === k ? null : k)} />
            </div>
          ))}
          {allPlaced && held === null && <span className="text-xs text-faint-2">Everyone is on the field.</span>}
          {held !== null && placed[held] !== null && (
            <button type="button" onClick={() => put(null)} className="min-h-11 shrink-0 rounded-[3px] border border-dashed border-rule-btn bg-transparent px-3 py-2.5 text-[11px] text-dim">
              Bench it
            </button>
          )}
        </div>
      </div>

      <BottomBar>
        <div className="flex gap-[5px]">
          {PLANS.map((p) => {
            const on = p === plan;
            return (
              <button key={p} type="button" onClick={() => setBattlePlan(i, p)} aria-pressed={on} className="min-h-9 grow basis-0 rounded-[3px] border px-1 text-[11px]" style={{ background: on ? "var(--raised)" : "transparent", borderColor: on ? "var(--rust)" : "var(--rule-btn)", color: on ? "var(--bone)" : "var(--dim)" }}>
                {PLAN_TITLE[p]}
              </button>
            );
          })}
        </div>
        <span className="text-[11px] leading-snug" style={{ color: pn.matches ? "var(--bone)" : "var(--faint)" }}>
          {pn.text}
        </span>
        <PrimaryButton muted={!allPlaced} disabled={!allPlaced} onClick={give}>
          {allPlaced ? "Give battle" : `${bench.length} still on the bench`}
        </PrimaryButton>
      </BottomBar>
    </Screen>
  );
}
