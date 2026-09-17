import Link from "next/link";
import { RunHeader } from "@/components/RunHeader";
import { Screen } from "@/components/Screen";
import { STAGE, type StageKey } from "@/lib/stages";
import { gradeStyle } from "@/lib/text";

// Copy from the v2 artboard (Phone-Glossary), derived from resolveFronts.ts and prepare.ts; keep in step with them.
const GENERAL: { word: string; abbr: string; text: string; how: string; tags: StageKey[] }[] = [
  { word: "Command", abbr: "CMD", text: "Multiplies everything your army does, on every front, at every stage. The one number with no off switch.", how: "every score × (0.85 + Command × 0.30). A 50 changes nothing; a 100 is +15%.", tags: ["ALWAYS"] },
  { word: "Tactics", abbr: "TAC", text: "How hard your wings press once the lines are locked. High Tactics is what turns a flank.", how: "wing press × (0.70 + Tactics × 0.60). Center ignores it.", tags: ["PRESS"] },
  { word: "Supply", abbr: "LOG", text: "How many elite units the army can feed. 80 or more carries a third S or A grade instead of two.", how: "elite slots: 2, or 3 at Supply 80+.", tags: ["DRAFT"] },
  { word: "Charisma", abbr: "CHA", text: "How long every front stands before it breaks. A fifth of each front’s cohesion comes straight from him.", how: "cohesion = 0.55 + 0.35 × Steady + 0.20 × Charisma, then the doctrine.", tags: ["COHESION"] },
];
const UNITS: { word: string; abbr: string; text: string; how: string; tags: StageKey[] }[] = [
  { word: "Shoot", abbr: "RNG", text: "Arrows, slings, javelins. Decides the skirmish before anyone closes. Enemy Armor soaks up to half of it.", how: "Shoot × (0.7 + 0.3 × Speed), less enemy Armor cover.", tags: ["SKIRMISH"] },
  { word: "Charge", abbr: "SHK", text: "The weight of the first contact. Elephants, heavy horse and pike blocks live here. Lopsided charges shake the other side.", how: "Charge, curved so 90 hits far harder than 60.", tags: ["CLASH"] },
  { word: "Steady", abbr: "DIS", text: "Drill. Holds the line when the charge lands, and is the biggest part of how much a front can take before it runs.", how: "60% of clash steadiness · 35% of cohesion · 20% of center press.", tags: ["CLASH", "COHESION"] },
  { word: "Armor", abbr: "ARM", text: "Shields and mail. Takes the sting out of arrows, braces the line in the clash, and keeps the center grinding.", how: "halves enemy Shoot at 100 · 40% of steadiness · 30% of center press.", tags: ["SKIRMISH", "CLASH", "PRESS"] },
  { word: "Fight", abbr: "MEL", text: "Plain close combat. Once the charge is spent this is what wins the press, especially in the center.", how: "50% of center press · 40% of wing press.", tags: ["PRESS"] },
  { word: "Speed", abbr: "MOB", text: "Wings need it. Fast units get around a flank, shoot better on the move, and run down a broken enemy.", how: "40% of wing press, curved · 30% boost to Shoot · pursuit after a rout.", tags: ["SKIRMISH", "PRESS"] },
];
const GRADES = ["S", "A", "B", "C", "D", "F"] as const;

function Tag({ k }: { k: StageKey }) {
  const s = STAGE[k];
  return (
    <span className="rounded-sm border px-1.5 py-0.5 font-mono text-[8px] tracking-[0.08em]" style={{ color: s.color, borderColor: s.edge }}>
      {k}
    </span>
  );
}
function Row({ r }: { r: (typeof GENERAL)[number] }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-md border border-rule bg-panel px-3.5 py-3">
      <div className="flex items-baseline justify-between gap-2">
        <div className="flex items-baseline gap-2">
          <span className="text-[15px] font-semibold text-bone">{r.word}</span>
          <span className="font-mono text-[10px] text-faint-2">{r.abbr}</span>
        </div>
        <div className="flex gap-1">
          {r.tags.map((t) => (
            <Tag key={t} k={t} />
          ))}
        </div>
      </div>
      <span className="text-xs leading-relaxed" style={{ color: "var(--center)" }}>
        {r.text}
      </span>
      <span className="font-mono text-[10px] leading-snug text-faint-2">{r.how}</span>
    </div>
  );
}

export default function NumbersPage() {
  return (
    <Screen>
      <RunHeader back="/rules" label="The numbers" right={<Link href="/rules" className="px-2 text-[13px] text-bone no-underline">Rules</Link>} />
      <main className="flex grow flex-col gap-4 px-[18px] pb-6">
        <div className="flex flex-col gap-1.5">
          <h1 className="display m-0 text-[28px] leading-[1.1]">What each number means</h1>
          <span className="text-xs leading-relaxed text-faint">Every stat runs 0 to 100. Higher is better. Each one only matters at certain moments of the battle, marked on the right.</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(["SKIRMISH", "CLASH", "PRESS", "COHESION"] as StageKey[]).map((k) => (
            <span key={k} className="rounded-sm border px-2 py-1 font-mono text-[9px] tracking-[0.1em]" style={{ color: STAGE[k].color, borderColor: STAGE[k].edge, background: STAGE[k].bg }}>
              {k}
            </span>
          ))}
          <span className="w-full pt-0.5 text-[11px] leading-snug text-faint-2">Skirmish is the arrows. Clash is the charge. Press is the shoving match after. Cohesion is how much of that a front can take before it runs.</span>
        </div>
        <section className="flex flex-col gap-2">
          <span className="font-mono text-[10px] tracking-[0.18em] text-faint">YOUR GENERAL</span>
          {GENERAL.map((r) => (
            <Row key={r.word} r={r} />
          ))}
        </section>
        <section className="flex flex-col gap-2 pt-2">
          <span className="font-mono text-[10px] tracking-[0.18em] text-faint">YOUR UNITS</span>
          {UNITS.map((r) => (
            <Row key={r.word} r={r} />
          ))}
        </section>
        <section className="flex flex-col gap-2 pt-2">
          <span className="font-mono text-[10px] tracking-[0.18em] text-faint">GRADES</span>
          <div className="flex flex-col gap-2 rounded-md border border-rule bg-panel px-3.5 py-3">
            <div className="flex items-center gap-1.5">
              {GRADES.map((g) => {
                const s = gradeStyle(g);
                return (
                  <span key={g} className="rounded-sm border px-[9px] py-[3px] font-mono text-xs font-semibold" style={{ background: s.bg, color: s.text, borderColor: s.edge }}>
                    {g}
                  </span>
                );
              })}
            </div>
            <span className="text-xs leading-relaxed" style={{ color: "var(--center)" }}>
              A grade is the unit’s overall weight, S down to F. S and A are elites: you can carry two, or three if your general’s Supply is 80 or more.
            </span>
          </div>
        </section>
      </main>
      <div className="flex shrink-0 flex-col gap-2 border-t border-raised bg-sunk px-[18px] pt-3 pb-[calc(14px+env(safe-area-inset-bottom,14px))]">
        <Link href="/rules" className="box-border flex min-h-11 items-center justify-center rounded-[3px] border border-rule-btn px-4 py-3.5 text-[15px] font-medium text-bone no-underline">
          How a battle plays out
        </Link>
      </div>
    </Screen>
  );
}
