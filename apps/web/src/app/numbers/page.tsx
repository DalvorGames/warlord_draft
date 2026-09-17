"use client";

import { HeaderLink, RunHeader } from "@/components/RunHeader";
import { Screen } from "@/components/Screen";
import { useEngine } from "@/lib/engine/EngineProvider";
import { STAGE, type StageKey } from "@/lib/stages";
import { ROMAN, gradeStyle } from "@/lib/text";

// Copy derived from resolveFronts.ts, prepare.ts and traits.md §4; keep in step with them.
const GENERAL: { word: string; text: string; how: string; tags: StageKey[] }[] = [
  { word: "Command", text: "Multiplies everything your army does, on every front, at every stage. The one number with no off switch.", how: "every score × (0.875 + Command × 0.25). A 50 changes nothing; a 100 is +12.5%.", tags: ["ALWAYS"] },
  { word: "Tactics", text: "How hard your wings press once the lines are locked. High Tactics is what turns a flank.", how: "wing press × (0.70 + Tactics × 0.60). Center ignores it.", tags: ["PRESS"] },
  { word: "Supply", text: "Two jobs at the draft. It nudges better cards onto your board a little, and at 75 or more it feeds a third elite.", how: "A and S card weight × (1 + 0.20 × (Supply − 50) / 50) · elite slots: 2, or 3 at Supply 75+.", tags: ["DRAFT"] },
  { word: "Charisma", text: "How long every front stands before it breaks. A fifth of each front's cohesion comes straight from him.", how: "cohesion = 0.55 + 0.35 × Steady + 0.20 × Charisma, then the plan and Steady traits.", tags: ["COHESION"] },
];
const UNITS: { word: string; text: string; how: string; tags: StageKey[] }[] = [
  { word: "Shoot", text: "Arrows, slings, javelins. Decides the skirmish before anyone closes. Enemy Armor soaks up to half of it.", how: "Shoot × (0.7 + 0.3 × Speed), less enemy Armor cover. The center shoots at half.", tags: ["SKIRMISH"] },
  { word: "Charge", text: "The weight of the first contact. Elephants, heavy horse and pike blocks live here. Lopsided charges shake the other side.", how: "Charge, curved so 90 hits far harder than 60.", tags: ["CLASH"] },
  { word: "Steady", text: "Drill. Holds the line when the charge lands, and is the biggest part of how much a front can take before it runs. Ground never touches it.", how: "60% of clash steadiness · 35% of cohesion · 20% of center press.", tags: ["CLASH", "COHESION"] },
  { word: "Armor", text: "Shields and mail. Takes the sting out of arrows, braces the line in the clash, and keeps the center grinding.", how: "halves enemy Shoot at 100 · 40% of steadiness · 30% of center press.", tags: ["SKIRMISH", "CLASH", "PRESS"] },
  { word: "Fight", text: "Plain close combat. Once the charge is spent this is what wins the press, especially in the center.", how: "50% of center press · 40% of wing press.", tags: ["PRESS"] },
  { word: "Speed", text: "Wings need it. Fast units get around a flank, shoot better on the move, and run down a broken enemy.", how: "40% of wing press, curved · 30% boost to Shoot · pursuit after a rout.", tags: ["SKIRMISH", "PRESS"] },
];
const GRADES = ["S", "A", "B", "C", "D", "F"] as const;
const TRAIT_HOOK: Record<string, string> = {
  deep_ranks: "each unbroken front sheds this much of its cohesion in damage after every press round",
  steady: "cohesion on every front",
  hammer_and_anvil: "wheel-in impact and damage",
  numbers: "added to the press exponent (base 0.30)",
  mercenary_captain: "FIGHT of units outside the general's culture",
  volley: "the center shoots at this instead of half",
  harass: "wing shooting",
  terror: "his fronts shake above edge 0.15 (base 0.25) and fight at this when shaken (base ×0.90)",
  furor: "the clash, then press scores lose this much a round",
  envelopment: "wing press",
  oblique_order: "the clash on your single heaviest front",
};
function fmt(e: Record<string, unknown>): string {
  if ("relief" in e) return `${((e.relief as number) * 100).toFixed(1)}%`;
  if ("moraleThreshold" in e) return `×${e.moraleThreshold}`;
  if ("rollup" in e) return `×${e.rollup}`;
  if ("lanchester" in e) return `+${e.lanchester}`;
  if ("stat" in e) return `×${e.mult}`;
  if ("centerShooting" in e) return `${e.centerShooting}`;
  if ("wingShooting" in e) return `×${e.wingShooting}`;
  if ("enemyShakenMult" in e) return `×${e.enemyShakenMult}`;
  if ("phase" in e) return `×${e.mult}`;
  if ("pressDecay" in e) return `−${((e.pressDecay as number) * 100).toFixed(1)}%`;
  if ("heaviestFrontContact" in e) return `×${e.heaviestFrontContact}`;
  return "";
}

function Tag({ k }: { k: StageKey }) {
  const s = STAGE[k];
  return <span className="label rounded-sm border px-1.5 py-0.5" style={{ color: s.color, borderColor: s.edge }}>{k}</span>;
}
function Row({ r }: { r: (typeof GENERAL)[number] }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-md border border-rule bg-panel px-3.5 py-3">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[17px] font-semibold text-bone">{r.word}</span>
        <div className="flex gap-1">{r.tags.map((t) => <Tag key={t} k={t} />)}</div>
      </div>
      <span className="text-[13px] leading-relaxed text-dim">{r.text}</span>
      <span className="font-mono text-[11px] leading-snug text-faint">{r.how}</span>
    </div>
  );
}

export default function NumbersPage() {
  const engine = useEngine();
  const traits = engine?.data.rules.traits ?? {};
  const routLevel = engine?.data.rules.fronts.routLevel ?? 0.8;
  return (
    <Screen>
      <RunHeader back="/rules" label="The numbers" right={<HeaderLink href="/rules">Rules</HeaderLink>} />
      <main className="flex grow flex-col gap-5 px-5 pb-6">
        <div className="flex flex-col gap-1.5">
          <h1 className="display m-0 text-[30px] leading-[1.1]">What each number means</h1>
          <span className="text-[15px] leading-snug text-dim">Every stat runs 0 to 100. Higher is better. Each one only matters at certain moments of the battle, marked on the right.</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(["SKIRMISH", "CLASH", "PRESS", "COHESION"] as StageKey[]).map((k) => <span key={k} className="label rounded-sm border px-2 py-1" style={{ color: STAGE[k].color, borderColor: STAGE[k].edge, background: STAGE[k].bg }}>{k}</span>)}
          <span className="w-full pt-0.5 text-[13px] leading-snug text-faint">Skirmish is the arrows. Clash is the charge. Press is the shoving match after. Cohesion is how much of that a front can take before it runs.</span>
        </div>
        <section className="flex flex-col gap-2"><span className="label text-faint">YOUR GENERAL</span>{GENERAL.map((r) => <Row key={r.word} r={r} />)}</section>
        <section className="flex flex-col gap-2"><span className="label text-faint">YOUR UNITS</span>{UNITS.map((r) => <Row key={r.word} r={r} />)}</section>
        <section className="flex flex-col gap-2">
          <span className="label text-faint">GRADES</span>
          <div className="flex flex-col gap-1.5 rounded-md border border-rule bg-panel px-3.5 py-3">
            <div className="flex gap-1.5">{GRADES.map((g) => { const s = gradeStyle(g); return <span key={g} className="flex h-7 w-8 items-center justify-center rounded-sm border font-mono text-[13px] font-semibold" style={{ background: s.bg, color: s.text, borderColor: s.edge }}>{g}</span>; })}</div>
            <span className="text-[13px] leading-snug text-dim">A unit&apos;s grade is its cost band, tuned by simulation so grades win in order. A and S are elites: you may field two, or three with Supply 75+.</span>
          </div>
        </section>
        <section className="flex flex-col gap-2">
          <span className="label text-faint">TRAITS</span>
          <div className="flex flex-col rounded-md border border-rule bg-panel px-3.5 py-1">
            {Object.entries(traits).filter(([, t]) => t.kind === "scaling").map(([id, t]) => (
              <div key={id} className="flex flex-col gap-0.5 border-t border-rule py-2.5 first:border-t-0">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[15px] font-semibold text-bone">{t.name}</span>
                  <span className="font-mono text-[11px] text-dim">{t.levels.map((lv, k) => `${ROMAN[k + 1]} ${lv.map((e) => fmt(e as Record<string, unknown>)).filter(Boolean).join(" ")}`).join(" · ")}</span>
                </div>
                <span className="text-[12px] leading-snug text-faint">{TRAIT_HOOK[id] ?? t.text}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-col rounded-md border border-dotted border-rule-btn bg-panel px-3.5 py-1">
            {Object.entries(traits).filter(([, t]) => t.kind === "rule").map(([id, t]) => (
              <div key={id} className="flex flex-col gap-0.5 border-t border-rule py-2.5 first:border-t-0">
                <span className="flex items-center gap-2 text-[15px] font-semibold text-bone"><span className="inline-block h-2 w-2 rotate-45 bg-bone" />{t.name}</span>
                <span className="text-[12px] leading-snug text-faint">{t.text}</span>
              </div>
            ))}
          </div>
          <span className="text-[12px] leading-snug text-faint">Each level of a scaling trait is worth about four points of win rate; a rule trait about nine to twelve. Levels from the general and the culture add, capped at III.</span>
        </section>
        <section className="flex flex-col gap-2">
          <span className="label text-faint">STRENGTH AS SHOWN</span>
          <div className="flex flex-col gap-1.5 rounded-md border border-rule bg-panel px-3.5 py-3">
            <span className="text-[13px] leading-snug text-dim">The bar at the top of the report is strength: how far the army is from routing. FIRM is two thirds or more; STEADY a third; BRITTLE anything left; ROUTED nothing.</span>
            <span className="font-mono text-[11px] leading-snug text-faint">strength = 1 − morale / {routLevel.toFixed(2)}. Morale is unit-weighted front damage plus a flat shock per broken front; the army routs at {routLevel.toFixed(2)}.</span>
          </div>
        </section>
      </main>
    </Screen>
  );
}
