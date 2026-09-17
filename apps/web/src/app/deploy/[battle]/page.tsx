"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { cohesionWord, deployPreview, heaviestFront, type Front, type PlanName } from "@warlord/engine";
import { BottomBar, PrimaryButton } from "@/components/BottomBar";
import { HeaderLink, RunHeader } from "@/components/RunHeader";
import { Screen } from "@/components/Screen";
import { Token } from "@/components/ui/Token";
import { TraitChip } from "@/components/ui/TraitChip";
import { InfoBubble, InlineNote } from "@/components/ui/Note";
import { Sheet } from "@/components/ui/Sheet";
import { StatBar } from "@/components/ui/Bars";
import { useCampaign } from "@/lib/campaign/CampaignProvider";
import { enemyRead, inspectorFit, lineTraitState, matchupSentence, matchups, planFit, rosterMatchupLine, tierWord } from "@/lib/deployText";
import { CLASS_WORD, GENERAL_STATS, GROUND_NOTE, PLAN_TEXT, PLAN_TITLE, STAT_KEYS, STAT_WORD, TERRAIN_WORD, WING_CLASSES, cultureColor, cultureName, cultureShort, gradeStyle, ofCulture, shortUnitName, subtypeWord, traitDef, traitWithLevel } from "@/lib/text";

const FRONT_DEFS: { id: Front; label: string; word: string }[] = [
  { id: "L", label: "LEFT", word: "left" },
  { id: "C", label: "CENTER", word: "center" },
  { id: "R", label: "RIGHT", word: "right" },
];
const PLANS: PlanName[] = ["aggressive", "defensive", "envelopment", "skirmish"];
const WING_KEYS = new Set(["mobility", "melee", "shock", "ranged"]);
const CENTER_KEYS = new Set(["melee", "armor", "discipline", "shock"]);
const FRONT_NAME: Record<Front, string> = { L: "Left", C: "Center", R: "Right" };

export default function DeployPage() {
  const params = useParams<{ battle: string }>();
  const router = useRouter();
  const n = Math.max(1, Math.min(3, Number(params.battle) || 1));
  const i = n - 1;
  const { engine, hydrated, save, army, general, traits, battles, setBattlePlan, setBattleDeployment, giveBattle, setStage } = useCampaign();
  const [held, setHeld] = useState<number | null>(null);
  const [sheet, setSheet] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);
  const [bubble, setBubble] = useState<string | null>(null); // "ground" | `coh:${front}` | `trait:${id}`
  const [sheetNote, setSheetNote] = useState<string | null>(null);

  useEffect(() => {
    if (!engine) return;
    if (hydrated && !save) router.replace("/");
    else if (save && !army) router.replace(`/draft/${save.row + 1}`);
    else if (save && save.battles[i]?.fought) router.replace(`/battle/${n}`);
    else if (save && i > 0 && !save.battles[i - 1]?.fought) router.replace(`/deploy/${i}`);
    else if (save && save.stage !== "deploy") setStage("deploy");
  }, [engine, hydrated, save, army, i, n, router, setStage]);

  const b = battles[i];
  const play = save?.battles[i];
  const plan: PlanName = play?.plan ?? (engine && general ? engine.defaultPlan(general) : "aggressive");
  const placed: (Front | null)[] = useMemo(() => play?.deployment ?? army?.slots.map(() => null) ?? [], [play, army]);

  const preview = useMemo(() => {
    if (!engine || !army || !b || !placed.some((f) => f)) return null;
    return deployPreview(engine.data, { ...army, plan }, b.spec.terrain, undefined, placed);
  }, [engine, army, b, placed, plan]);
  const cohIf = useMemo(() => {
    if (!engine || !army || !b || held === null) return null;
    return FRONT_DEFS.map((d) => {
      const trial = placed.map((f, k) => (k === held ? d.id : f));
      const pv = deployPreview(engine.data, { ...army, plan }, b.spec.terrain, undefined, trial);
      return { id: d.id, word: cohesionWord(pv.fronts[d.id].threshold) };
    });
  }, [engine, army, b, held, placed, plan]);

  if (!engine || !save || !army || !general || !b) return <Screen />;
  const units = army.slots.map((s) => engine.data.unitById.get(s.unitId)!);
  const foeUnits = b.foe.slots.map((s) => engine.data.unitById.get(s.unitId)!);
  const bench = placed.map((f, k) => (f ? -1 : k)).filter((k) => k >= 0);
  const allPlaced = bench.length === 0;
  const anyPlaced = placed.some(Boolean);
  const count = (f: Front) => placed.filter((x) => x === f).length;
  const heldUnit = held === null ? null : units[held];
  const heldCC = heldUnit ? cultureColor(heldUnit.culture) : null;
  const keys = heldUnit && WING_CLASSES.has(heldUnit.class) ? WING_KEYS : CENTER_KEYS;
  const hisCC = cultureColor(b.foeGeneral.culture);
  const mineCC = cultureColor(general.culture);
  const rings = heldUnit ? matchups(engine, heldUnit, b.foe) : null;
  const brittle = FRONT_DEFS.filter((d) => preview && preview.fronts[d.id].count > 0 && cohesionWord(preview.fronts[d.id].threshold) === "BRITTLE").map((d) => d.id);
  const scouts = traits.some((t) => t.id === "scouts") ? heaviestFront(b.spec.line) : null;

  const put = (target: Front | null) => {
    if (held === null) return;
    const next = placed.slice();
    next[held] = target;
    setBattleDeployment(i, next);
    setHeld(null);
    setBubble(null);
  };
  const give = () => {
    if (!allPlaced) return;
    giveBattle(i, plan);
    router.push(`/battle/${n}`);
  };
  const toggleBubble = (k: string) => setBubble((x) => (x === k ? null : k));
  const cohNote = (f: Front) => {
    const thr = preview?.fronts[f].threshold ?? 0;
    const word = cohesionWord(thr);
    if (!thr) return { title: "Nobody here", text: "An empty front gives way the moment it is touched, and the fronts beside it are flanked." };
    const fix = word === "BRITTLE" ? "Steadier units, or your general's Charisma, would firm it." : word === "STEADY" ? "A steadier unit would make it firm." : "As firm as a front gets.";
    return { title: `${word} ${thr.toFixed(2)}`, text: `How much this front can take before it breaks: 0.55 plus a third of its STEADY plus a fifth of his Charisma, times the plan. ${fix}` };
  };

  return (
    <Screen>
      <RunHeader back={i === 0 ? "/draft/8" : `/between/${i}`} label={`Battle ${n} of 3 · Set the line`} right={<HeaderLink href="/numbers">Numbers</HeaderLink>} />
      <main className="flex grow flex-col gap-3.5 px-5 pb-4">
        {/* 2. The enemy row */}
        <button type="button" onClick={() => setSheet(true)} aria-label={`His army: ${b.foeGeneral.name} ${ofCulture(engine, b.foeGeneral.culture)}`} className="flex flex-col gap-3 rounded-lg border border-rule bg-panel px-4 py-3 text-left">
          <div className="flex items-center justify-between gap-2">
            <span className="display min-w-0 truncate text-[26px] leading-tight text-bone">
              {b.foeGeneral.name} <span className="text-[18px]" style={{ color: hisCC.bright }}>{ofCulture(engine, b.foeGeneral.culture)}</span>
            </span>
            <span className="text-[18px] text-dim">›</span>
          </div>
          <div className="flex justify-between">
            {foeUnits.map((u, k) => (
              <Token key={k} unit={u} size={36} his ring={rings ? (rings.favored.includes(k) ? "bone" : rings.beaten.includes(k) ? "rust" : null) : null} />
            ))}
          </div>
          {rings && (
            <div className="flex gap-4 font-mono text-[11px] tracking-[0.14em]">
              <span className="flex items-center gap-1.5 text-bone"><span className="inline-block h-2.5 w-2.5 rounded-sm border-2 border-bone" /> IT IS FAVORED · {rings.favored.length}</span>
              <span className="flex items-center gap-1.5 text-rust"><span className="inline-block h-2.5 w-2.5 rounded-sm border-2 border-rust" /> HE IS · {rings.beaten.length}</span>
            </div>
          )}
          <span className="label text-faint">{tierWord(b.spec.tier)}</span>
        </button>
        {scouts && (
          <div className="flex items-center gap-2 rounded-[3px] border border-dotted border-bone px-3 py-2 font-mono text-[11px] tracking-[0.14em] text-bone">
            <span className="inline-block h-2 w-2 rotate-45 bg-bone" /> SCOUTS · {scouts.fronts.length > 1 ? `HIS ${scouts.fronts.map((f) => FRONT_NAME[f].toUpperCase()).join(" AND ")} TIE FOR HEAVIEST: ${["", "ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN", "EIGHT"][scouts.count]} EACH` : `HIS ${FRONT_NAME[scouts.fronts[0]].toUpperCase()} IS HEAVIEST: ${["", "ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN", "EIGHT"][scouts.count]} UNITS`}
          </div>
        )}

        {/* 3. The pitch */}
        <div className="relative flex flex-col gap-3 rounded-lg border border-rule bg-panel px-3 pt-3 pb-3">
          <div className="flex items-center justify-between">
            <button type="button" onClick={() => toggleBubble("ground")} aria-expanded={bubble === "ground"} className="flex min-h-10 items-center gap-1.5 rounded-[3px] border border-rule-btn bg-transparent px-3 font-mono text-[13px] tracking-[0.14em] text-bone">
              {TERRAIN_WORD[b.spec.terrain]}
              <span aria-hidden="true" className="flex h-3.5 w-3.5 items-center justify-center rounded-full border font-mono text-[9px] tracking-normal" style={{ borderColor: "var(--faint)", color: "var(--faint)" }}>i</span>
            </button>
            <span className="flex items-baseline gap-2">
              <span className="label text-faint">YOUR SHAPE</span>
              <span className="font-mono text-[20px] font-semibold" style={{ color: allPlaced ? "var(--bone)" : "var(--dim)" }}>{count("L")} · {count("C")} · {count("R")}</span>
            </span>
          </div>
          {bubble === "ground" && <InfoBubble title={TERRAIN_WORD[b.spec.terrain].charAt(0) + TERRAIN_WORD[b.spec.terrain].slice(1).toLowerCase()} onClose={() => setBubble(null)} style={{ top: 52, left: 12 }}>{GROUND_NOTE[b.spec.terrain]}</InfoBubble>}
          <div className="flex min-h-[250px] gap-2">
            {FRONT_DEFS.map((d) => {
              const idx = placed.map((f, k) => (f === d.id ? k : -1)).filter((k) => k >= 0);
              const elsewhere = held !== null && placed[held] !== d.id;
              const thr = preview?.fronts[d.id].threshold ?? 0;
              const word = idx.length ? cohesionWord(thr) : "NOBODY";
              const empty = idx.length === 0;
              const wordColor = empty ? (anyPlaced ? "var(--rust)" : "var(--faint)") : word === "BRITTLE" ? "var(--rust)" : word === "FIRM" ? "var(--bone)" : "var(--dim)";
              return (
                <div key={d.id} className="relative flex min-w-0 basis-0 flex-col items-center gap-2 rounded-md border px-1.5 pt-2.5 pb-2" style={{ flexGrow: d.id === "C" ? 1.4 : 1, borderColor: elsewhere ? "var(--rust)" : "var(--rule)", borderStyle: elsewhere || empty ? "dashed" : "solid" }}>
                  <span className="label text-bone">{d.label}</span>
                  <button type="button" onClick={() => !empty && toggleBubble(`coh:${d.id}`)} aria-expanded={bubble === `coh:${d.id}`} className="-mt-1 min-h-7 border-0 bg-transparent px-1 font-mono text-[11px] tracking-[0.14em]" style={{ color: wordColor }}>
                    {word}
                  </button>
                  <div className="flex flex-wrap content-start justify-center gap-1.5">
                    {idx.map((k) => <Token key={k} unit={units[k]} size={48} held={held === k} onClick={() => { setHeld(held === k ? null : k); setBubble(null); }} pressed={held === k} />)}
                    {empty && <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-dashed border-rule-btn text-dim">—</div>}
                  </div>
                  {elsewhere && (
                    <button type="button" onClick={() => put(d.id)} className="absolute inset-0 flex items-center justify-center rounded-md border-0 p-2 text-center text-[15px] font-medium text-bone" style={{ background: "rgba(16,15,12,0.78)" }}>
                      Place on the {d.word}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          {bubble?.startsWith("coh:") && (() => { const f = bubble.slice(4) as Front; const nt = cohNote(f); return <InfoBubble title={nt.title} onClose={() => setBubble(null)} style={{ bottom: 12, left: f === "L" ? 12 : f === "R" ? "auto" : "50%", right: f === "R" ? 12 : "auto", transform: f === "C" ? "translateX(-50%)" : undefined }}>{nt.text}</InfoBubble>; })()}
          {!anyPlaced && <span className="text-[13px] leading-snug text-dim">Tap a unit below, then tap a front. Wings want speed; the center wants steady.</span>}
        </div>

        {/* 4. Your general's row */}
        <div className="flex flex-col gap-2.5">
          <div className="flex items-baseline justify-between gap-2">
            <span className="display min-w-0 truncate text-[26px] leading-tight text-bone">
              {general.name} <span className="text-[18px]" style={{ color: mineCC.bright }}>{ofCulture(engine, general.culture)}</span>
            </span>
            <span className="label shrink-0 text-faint">YOUR GENERAL</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {traits.length ? traits.map((t) => {
              const lt = lineTraitState(engine, t.id, army, placed);
              return <TraitChip key={t.id} rule={t.kind === "rule"} state={lt ? (lt.on ? "on" : "off") : "on"} active={bubble === `trait:${t.id}`} onClick={() => toggleBubble(`trait:${t.id}`)}>{traitWithLevel(engine, t.id, t.level)}</TraitChip>;
            }) : <span className="text-xs text-dim">No traits. What you build is all he brings.</span>}
          </div>
          {bubble?.startsWith("trait:") && (() => { const id = bubble.slice(6); const lt = lineTraitState(engine, id, army, placed); return <InlineNote title={traitDef(engine, id).name}>{traitDef(engine, id).text}{lt ? ` ${lt.note}` : ""}</InlineNote>; })()}
        </div>

        {/* 5. The bench */}
        <div className="flex flex-col gap-2.5">
          <span className="label text-faint">THE BENCH</span>
          {bench.length ? (
            <div className="grid grid-cols-4 gap-3">
              {bench.map((k) => <div key={k} className="flex justify-center"><Token unit={units[k]} size={52} held={held === k} onClick={() => { setHeld(held === k ? null : k); setBubble(null); }} pressed={held === k} /></div>)}
            </div>
          ) : <span className="text-[15px] text-dim">Everyone is on the field.</span>}
        </div>

        {/* 6. The unit card */}
        {heldUnit && (
          <div className="flex flex-col gap-3 rounded-lg border border-rule-btn bg-panel px-4 py-3.5" style={{ borderLeft: `3px solid ${heldCC!.bright}`, animation: "wdrise 240ms ease-out 1" }}>
            <div className="flex items-center gap-3">
              <Token unit={heldUnit} size={48} held />
              <div className="flex min-w-0 grow flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <span className="min-w-0 truncate text-[17px] font-semibold text-bone">{shortUnitName(heldUnit)}</span>
                  <span className="shrink-0 rounded-sm border px-1.5 font-mono text-[11px] font-semibold" style={{ background: gradeStyle(heldUnit.grade).bg, color: gradeStyle(heldUnit.grade).text, borderColor: gradeStyle(heldUnit.grade).edge }}>{heldUnit.grade}</span>
                </div>
                <span className="label text-faint">{CLASS_WORD[heldUnit.class]} · {subtypeWord(heldUnit.subtype)} <span style={{ color: heldCC!.bright }}>{cultureShort(engine, heldUnit.culture).toUpperCase()}</span></span>
              </div>
              <button type="button" onClick={() => setHeld(null)} aria-label="Close" className="flex h-11 w-11 items-center justify-center border-0 bg-transparent text-[20px] text-dim">×</button>
            </div>
            <div className="grid grid-cols-3 gap-x-4 gap-y-2.5">
              {STAT_KEYS.map((k) => <StatBar key={k} label={STAT_WORD[k]} value={heldUnit.stats[k]} color={heldCC!.bright} lit={keys.has(k)} />)}
            </div>
            <span className="text-[15px] leading-snug text-bone">{inspectorFit(heldUnit).text}</span>
            <span className="text-[13px] leading-snug text-dim">{matchupSentence(engine, heldUnit, b.foe)}</span>
            {cohIf && (
              <span className="text-[13px] leading-snug text-dim">
                If placed: {cohIf.map((c, k) => <span key={c.id}>{k > 0 && " · "}{FRONT_NAME[c.id]} <span style={{ color: c.word === "BRITTLE" ? "var(--rust)" : c.word === "FIRM" ? "var(--bone)" : "var(--dim)" }}>{c.word.charAt(0) + c.word.slice(1).toLowerCase()}</span></span>)}.
              </span>
            )}
            {placed[held!] && (
              <button type="button" onClick={() => put(null)} className="self-start rounded-[3px] border border-dashed border-rule-btn bg-transparent px-3 py-2 text-[13px] text-dim">Bench it</button>
            )}
          </div>
        )}

        {/* 7. The plan */}
        <div className="flex flex-col gap-3">
          <button type="button" onClick={() => setPlanOpen((o) => !o)} aria-expanded={planOpen} className="flex items-center gap-4 rounded-lg border border-rule bg-panel px-4 py-3 text-left">
            <span className="label text-faint">PLAN</span>
            <div className="flex min-w-0 grow flex-col gap-0.5">
              <span className="text-[17px] font-semibold text-bone">{PLAN_TITLE[plan]}</span>
              <span className="text-[13px] leading-snug text-dim">{planFit(engine, plan, army, placed, brittle)}</span>
            </div>
            <span className="text-[18px] text-dim">{planOpen ? "⌄" : "›"}</span>
          </button>
          {planOpen && (
            <div className="flex flex-col gap-2.5 rounded-lg border border-rule-btn bg-panel px-3.5 py-3.5" style={{ animation: "wdrise 240ms ease-out 1" }}>
              <div className="flex items-start justify-between gap-3">
                <span className="text-[15px] leading-snug text-dim">How your army fights this battle. One plan, no numbers; change it any time before you give battle.</span>
                <button type="button" onClick={() => setPlanOpen(false)} aria-label="Close" className="-mt-1 -mr-1 flex h-9 w-9 shrink-0 items-center justify-center border-0 bg-transparent text-[20px] text-dim">×</button>
              </div>
              {PLANS.map((p) => {
                const on = p === plan;
                return (
                  <button key={p} type="button" onClick={() => setBattlePlan(i, p)} aria-pressed={on} className="flex flex-col gap-1 rounded-md border bg-sunk px-3.5 py-3 text-left" style={{ borderColor: on ? "var(--rust)" : "var(--rule)" }}>
                    <div className="flex items-baseline justify-between">
                      <span className="text-[17px] font-semibold text-bone">{PLAN_TITLE[p]}</span>
                      {on && <span className="label text-rust">CHOSEN</span>}
                    </div>
                    <span className="text-[13px] leading-snug text-dim">{PLAN_TEXT[p].does} <span className="text-faint">{PLAN_TEXT[p].suits}</span></span>
                    <span className="text-[13px] leading-snug text-bone">{planFit(engine, p, army, placed, brittle)}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </main>
      <BottomBar>
        <PrimaryButton muted={!allPlaced} disabled={!allPlaced} onClick={give}>
          {allPlaced ? "Give battle" : `${bench.length} still on the bench`}
        </PrimaryButton>
      </BottomBar>

      {/* The enemy sheet */}
      <Sheet open={sheet} onClose={() => { setSheet(false); setSheetNote(null); }} title={<span className="label text-dim">HIS ARMY · WHERE HE STANDS IS HIDDEN</span>}>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 rounded-lg px-4 py-3.5" style={{ background: hisCC.deep, border: `2px solid ${hisCC.bright}` }}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="display text-[28px] leading-tight text-bone">{b.foeGeneral.name}</span>
              <span className="label text-bone" style={{ opacity: 0.85 }}>{cultureShort(engine, b.foeGeneral.culture).toUpperCase()}</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {b.foeTraits.length ? b.foeTraits.map((t) => <TraitChip key={t.id} onDeep rule={t.kind === "rule"} active={sheetNote === t.id} onClick={() => setSheetNote((x) => (x === t.id ? null : t.id))}>{traitWithLevel(engine, t.id, t.level)}</TraitChip>) : <span className="text-xs text-bone" style={{ opacity: 0.8 }}>No traits.</span>}
            </div>
            {sheetNote && <InlineNote onDeep title={traitDef(engine, sheetNote).name}>{traitDef(engine, sheetNote).text}</InlineNote>}
            <div className="grid grid-cols-4 gap-3">
              {GENERAL_STATS.map(([k, key]) => (
                <div key={k} className="flex flex-col gap-0.5">
                  <span className="label text-bone" style={{ opacity: 0.8 }}>{k}</span>
                  <span className="font-mono text-[20px] font-semibold text-white">{b.foeGeneral.stats[key]}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <span className="label text-faint">THE READ</span>
            <span className="text-[17px] leading-snug text-bone">{enemyRead(engine, b.foe)}</span>
            <span className="text-[15px] leading-snug text-dim">{rosterMatchupLine(engine, army, b.foe)}</span>
          </div>
          <div className="flex flex-col">
            <span className="label pb-2 text-faint">HIS EIGHT</span>
            {foeUnits.map((u, k) => {
              const cc = cultureColor(u.culture);
              return (
                <div key={k} className="flex flex-col gap-2 border-t border-rule py-3">
                  <div className="flex items-center gap-3">
                    <Token unit={u} size={44} his />
                    <div className="flex min-w-0 grow flex-col gap-0.5">
                      <span className="truncate text-[15px] font-semibold text-bone">{shortUnitName(u)}</span>
                      <span className="label text-faint">{CLASS_WORD[u.class]} · {subtypeWord(u.subtype)} <span style={{ color: cc.bright }}>{cultureShort(engine, u.culture).toUpperCase()}</span></span>
                    </div>
                    <span className="rounded-sm border px-1.5 font-mono text-[11px] font-semibold" style={{ background: gradeStyle(u.grade).bg, color: gradeStyle(u.grade).text, borderColor: gradeStyle(u.grade).edge }}>{u.grade}</span>
                  </div>
                  <div className="grid grid-cols-6 gap-1 pl-[56px]">
                    {STAT_KEYS.map((k) => (
                      <div key={k} className="flex flex-col">
                        <span className="font-mono text-[11px] tracking-[0.08em] text-faint">{STAT_WORD[k]}</span>
                        <span className="font-mono text-[15px]" style={{ color: u.stats[k] === 0 ? "var(--zero)" : "var(--bone)" }}>{u.stats[k]}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          <span className="text-xs text-faint">{cultureName(engine, b.foeGeneral.culture)}.</span>
        </div>
      </Sheet>
    </Screen>
  );
}
