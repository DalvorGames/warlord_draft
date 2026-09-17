"use client";

import Link from "next/link";
import { HeaderLink, RunHeader } from "@/components/RunHeader";
import { Screen } from "@/components/Screen";
import { TabBar } from "@/components/TabBar";
import { TraitChip } from "@/components/ui/TraitChip";
import { Glyph } from "@/components/ui/Token";
import { useEngine } from "@/lib/engine/EngineProvider";
import { STAGE } from "@/lib/stages";
import { cultureColor, cultureShort } from "@/lib/text";

const ORDER = ["rom", "grk", "mac", "per", "car", "chn", "stp", "ind", "gal"];

export default function RulesPage() {
  const engine = useEngine();
  const traits = engine?.data.rules.traits ?? {};
  const generalOnly = Object.entries(traits).filter(([, t]) => !t.culture);
  const [t1, t2] = engine?.data.rules.traitThresholds ?? [4, 6];
  return (
    <Screen>
      <RunHeader back="/" label="How it works" right={<HeaderLink href="/numbers">Numbers</HeaderLink>} />
      <main className="flex grow flex-col gap-5 px-5 pb-6">
        <div className="flex flex-col gap-1.5">
          <h1 className="display m-0 text-[30px] leading-[1.1]">One army a day. About six minutes.</h1>
          <span className="text-[15px] text-dim">Draft an ancient army. Read the enemy. Watch the war.</span>
        </div>

        <section className="flex flex-col gap-3 rounded-lg border border-rule bg-panel px-4 py-4">
          <div className="flex items-baseline gap-3"><span className="font-mono text-[15px] text-rust">1</span><span className="display text-[24px]">Take a general</span></div>
          <div className="grid grid-cols-3 gap-2">
            {[{ c: "stp", n: "Spitamenes", t: ["harass", "envelopment"] }, { c: "grk", n: "Epaminondas", t: ["oblique_order", "deep_ranks"] }, { c: "rom", n: "Flaminius", t: [] }].map((g) => (
              <div key={g.n} className="flex flex-col gap-1.5 rounded-md px-2.5 py-2.5" style={{ background: cultureColor(g.c).deep, border: `1px solid ${cultureColor(g.c).bright}` }}>
                <span className="label text-bone" style={{ opacity: 0.85 }}>{engine ? cultureShort(engine, g.c).toUpperCase() : g.c}</span>
                <span className="display text-[17px] text-bone">{g.n}</span>
                <div className="flex flex-wrap gap-1">{g.t.length ? g.t.map((id) => <TraitChip key={id} onDeep>{traits[id]?.name ?? id}</TraitChip>) : <span className="text-[11px] text-bone" style={{ opacity: 0.75 }}>No traits</span>}</div>
              </div>
            ))}
          </div>
          <p className="m-0 text-[15px] leading-snug text-dim">Three turn over. Each has four stats and up to three traits: a word and a sentence that say how he fights. A general with no traits is the bold pick: what you build is all he brings.</p>
          <span className="text-[13px] text-faint">• Traits stack with your cultures, up to level III.</span>
        </section>

        <section className="flex flex-col gap-3 rounded-lg border border-rule bg-panel px-4 py-4">
          <div className="flex items-baseline gap-3"><span className="font-mono text-[15px] text-rust">2</span><span className="display text-[24px]">Draft eight rows</span></div>
          <div className="flex flex-col gap-1.5 rounded-md border border-rule bg-sunk p-2.5">
            <div className="grid grid-cols-4 gap-1.5">
              {(["line", "line", "cavalry", "ranged"] as const).map((c, k) => (
                <div key={k} className="flex flex-col items-center gap-1 rounded-sm border border-rule-btn py-2"><Glyph cls={c} size={16} /><span className="label text-dim">{c.toUpperCase()}</span></div>
              ))}
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {[0, 1, 2, 3].map((k) => (
                <div key={k} className="flex flex-col items-center gap-1 rounded-sm border border-dashed border-rule-btn py-2"><span className="text-[13px] text-dim">any</span><span className="label text-rust">FLEX</span></div>
              ))}
            </div>
          </div>
          <p className="m-0 text-[15px] leading-snug text-dim">Two line rows, one cavalry, one ranged, four flex. Four cards a row from any culture. Fielding {t1} of a culture wakes its trait; {t2} lifts it a level. Your general counts as one.</p>
          <span className="text-[13px] text-faint">• Two rerolls, plus one free for everyone, today included.</span>
        </section>

        <section className="flex flex-col gap-3 rounded-lg border border-rule bg-panel px-4 py-4">
          <div className="flex items-baseline gap-3"><span className="font-mono text-[15px] text-rust">3</span><span className="display text-[24px]">Place them on three fronts</span></div>
          <div className="flex flex-col gap-2 rounded-md border border-rule bg-sunk p-2.5">
            <div className="grid grid-cols-3 gap-1.5">
              {[{ n: "LEFT", g: ["cavalry", "ranged"] as const, w: "WANTS SPEED" }, { n: "CENTER", g: ["line", "line", "shock"] as const, w: "WANTS STEADY" }, { n: "RIGHT", g: ["cavalry", "cavalry"] as const, w: "WANTS SPEED" }].map((f) => (
                <div key={f.n} className="flex flex-col items-center gap-1.5 rounded-sm border border-dashed border-rule-btn py-2">
                  <span className="label text-bone">{f.n}</span>
                  <div className="flex gap-1">{f.g.map((c, k) => <Glyph key={k} cls={c} size={14} />)}</div>
                  <span className="label text-faint">{f.w}</span>
                </div>
              ))}
            </div>
            <span className="label text-center text-faint">HIS LINE IS HIDDEN UNTIL BATTLE</span>
          </div>
          <p className="m-0 text-[15px] leading-snug text-dim">You see his eight units and his traits, never where he stands. Put every unit by hand on the left, center or right, and choose a plan.</p>
          <span className="text-[13px] text-faint">• A front nobody holds gives way the moment it is touched.</span>
        </section>

        <section className="flex flex-col gap-3 rounded-lg border border-rule bg-panel px-4 py-4">
          <div className="flex items-baseline gap-3"><span className="font-mono text-[15px] text-rust">4</span><span className="display text-[24px]">Watch it play out</span></div>
          <div className="flex flex-col gap-2 rounded-md border border-rule bg-sunk p-2.5">
            <div className="flex gap-1.5">
              {(["SKIRMISH", "CLASH", "PRESS", "BREAK"] as const).map((k) => <span key={k} className="label rounded-sm border px-2 py-1" style={{ color: STAGE[k].color, borderColor: STAGE[k].edge }}>{k}</span>)}
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 grow rounded-sm bg-ground"><div className="h-3 w-[70%] rounded-sm" style={{ background: cultureColor("grk").bright }} /></div>
              <span className="label text-faint">VS</span>
              <div className="h-3 grow rounded-sm bg-ground" style={{ direction: "rtl" }}><div className="h-3 w-[60%] rounded-sm" style={{ background: `repeating-linear-gradient(135deg, ${cultureColor("mac").bright} 0 3px, rgba(16,15,12,0.55) 3px 7px)` }} /></div>
            </div>
          </div>
          <p className="m-0 text-[15px] leading-snug text-dim">A skirmish, a clash, then the press, round by round, until a front breaks or an army routs. Every trait that acts is named at the beat where it acted. Bigger bar is better.</p>
          <span className="text-[13px] text-faint">• His line is revealed at the end, front for front. That is the lesson.</span>
        </section>

        <div className="flex items-baseline justify-between">
          <span className="label text-faint">CULTURES & TRAITS</span>
          <span className="label text-dim">{t1} UNITS WAKES IT · {t2} LIFTS IT</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {ORDER.map((c) => {
            const cc = cultureColor(c);
            const id = engine?.data.cultures[c]?.trait;
            const t = id ? traits[id] : null;
            return (
              <div key={c} className="flex min-h-[120px] flex-col gap-1 rounded-md px-2.5 py-2.5" style={{ background: cc.deep, border: `1px solid ${cc.bright}` }}>
                <span className="label text-bone" style={{ opacity: 0.85 }}>{engine ? cultureShort(engine, c).toUpperCase() : c}</span>
                <span className="text-[15px] font-semibold leading-tight text-bone">{t?.name ?? ""}</span>
                <span className="text-[12px] leading-snug text-bone" style={{ opacity: 0.85 }}>{t?.text ?? ""}</span>
              </div>
            );
          })}
        </div>
        <span className="label text-faint">GENERALS&apos; OWN TRAITS</span>
        <div className="flex flex-col gap-2">
          {generalOnly.map(([id, t]) => (
            <div key={id} className="flex flex-col gap-1 rounded-md border border-rule bg-panel px-3.5 py-2.5" style={{ borderStyle: t.kind === "rule" ? "dotted" : "solid" }}>
              <span className="flex items-center gap-2 text-[15px] font-semibold text-bone">{t.kind === "rule" && <span className="inline-block h-2 w-2 rotate-45 bg-bone" />}{t.name}</span>
              <span className="text-[13px] leading-snug text-dim">{t.text}</span>
            </div>
          ))}
        </div>
        <p className="m-0 text-[13px] leading-snug text-dim">The ladder ranks runs by battles won, then by losses. Everyone plays the same board, so a conquest is a conquest of the same three generals.</p>
        <div className="flex gap-2.5 pt-2">
          <Link href="/numbers" className="box-border flex min-h-12 grow basis-0 items-center justify-center rounded-[3px] border border-rule-btn px-3 py-3 text-center text-[15px] text-bone no-underline">What each number means</Link>
          <Link href="/" className="box-border flex min-h-12 grow basis-0 items-center justify-center rounded-[3px] bg-bone px-3 py-3 text-center text-[15px] font-semibold text-ink no-underline">Play today&apos;s board</Link>
        </div>
      </main>
      <TabBar />
    </Screen>
  );
}
