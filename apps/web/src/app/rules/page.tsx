"use client";

import Link from "next/link";
import { RunHeader } from "@/components/RunHeader";
import { Screen } from "@/components/Screen";
import { useCampaign } from "@/lib/campaign/CampaignProvider";
import { STAGE } from "@/lib/stages";
import { CULTURE_COLORS, TRAIT_GIST, cultureShort, traitName } from "@/lib/text";

const WING = "var(--wing)", CENTER = "var(--center)";
const ROWS: { klass: string; color: string; picked: number }[] = [
  { klass: "LINE", color: CENTER, picked: 3 }, { klass: "LINE", color: CENTER, picked: 4 }, { klass: "SHOCK", color: CENTER, picked: 3 }, { klass: "CAVALRY", color: WING, picked: 2 },
  { klass: "CAVALRY", color: WING, picked: 1 }, { klass: "RANGED", color: WING, picked: 4 }, { klass: "RANGED", color: WING, picked: 4 }, { klass: "FLEX", color: CENTER, picked: 1 },
];
const cc = (k: string) => CULTURE_COLORS[k];
const Tip = ({ t }: { t: string }) => (
  <div className="flex items-start gap-2">
    <span className="mt-1.5 h-[5px] w-[5px] shrink-0 rounded-full bg-rust" />
    <span className="text-xs leading-relaxed text-dim">{t}</span>
  </div>
);
function Card({ n, title, kicker, children, body, tips }: { n: number; title: string; kicker: string; children: React.ReactNode; body: string; tips: string[] }) {
  return (
    <div className="flex flex-col gap-2.5 rounded-lg border border-rule bg-panel px-4 pt-3.5 pb-4">
      <div className="flex items-center gap-3">
        <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-bone font-mono text-[13px] font-semibold text-ink">{n}</span>
        <div className="flex min-w-0 flex-col gap-px">
          <span className="display text-[22px] leading-[1.1] text-bone">{title}</span>
          <span className="font-mono text-[9px] tracking-[0.14em] text-faint-2">{kicker}</span>
        </div>
      </div>
      {children}
      <span className="text-[13px] leading-relaxed" style={{ color: CENTER }}>
        {body}
      </span>
      {tips.map((t) => (
        <Tip key={t} t={t} />
      ))}
    </div>
  );
}

export default function RulesPage() {
  const { engine } = useCampaign();
  const cultures = engine ? Object.keys(engine.data.cultures) : Object.keys(CULTURE_COLORS);
  return (
    <Screen>
      <RunHeader back="/" label="How it works" right={<Link href="/numbers" className="px-2 text-[13px] text-bone no-underline">Numbers</Link>} />
      <main className="flex grow flex-col gap-3 px-[18px] pb-6">
        <div className="flex flex-col gap-1.5 pb-1">
          <h1 className="display m-0 text-[30px] leading-[1.1]">
            One army.
            <br />
            Three generals.
          </h1>
          <span className="text-xs leading-relaxed text-faint">Everyone gets the same board. Draft it, place it, then watch it fight. Four steps, three times over.</span>
        </div>
        <Card n={1} title="Take a general" kicker="THREE TURN OVER · ONE IS YOURS" body="His four numbers shape the whole army before you have drafted a single unit." tips={["Supply 80+ lets you carry three elites instead of two.", "Charisma makes every front stand longer. Command makes everything hit harder."]}>
          <div className="flex gap-2 py-0.5">
            {[
              ["gal", "Viridomarus"],
              ["ind", "Ashoka"],
              ["car", "Hasdrubal"],
            ].map(([k, name]) => (
              <div key={k} className="box-border flex h-[58px] grow basis-0 flex-col justify-between rounded-[4px] px-[9px] py-[7px]" style={{ background: cc(k).deep, border: `1px solid ${cc(k).bright}` }}>
                <span className="font-mono text-[7px] tracking-[0.14em] uppercase" style={{ color: cc(k).bright }}>
                  {engine ? cultureShort(engine, k) : k}
                </span>
                <span className="display text-[15px] leading-none text-bone">{name}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card n={2} title="Draft eight rows" kicker="ONE UNIT A ROW · TWO REROLLS" body="Each row deals four units from one culture. Take one, or reroll the row. Your general counts as a unit too." tips={["Four units from one culture wakes its trait. Six wakes the stronger version.", "S and A grades are elites. The cap is two, or three with the right general."]}>
          <div className="flex flex-col gap-1 py-0.5">
            {ROWS.map((r, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-3 text-right font-mono text-[9px] text-faint-2">{i + 1}</span>
                <span className="w-[58px] font-mono text-[9px] tracking-[0.1em]" style={{ color: r.color }}>
                  {r.klass}
                </span>
                <div className="flex grow gap-[3px]">
                  {[1, 2, 3, 4].map((c) => (
                    <div key={c} className="h-2 grow rounded-sm" style={{ background: c === r.picked ? "var(--bone)" : "var(--raised)" }} />
                  ))}
                </div>
              </div>
            ))}
            <span className="pt-1 pl-5 font-mono text-[8px] tracking-[0.06em] text-faint-2">4 CARDS A ROW · 3 IN CLASS, 1 WILD · CAVALRY ROWS ARE ALL CAVALRY</span>
          </div>
        </Card>
        <Card n={3} title="Place them on three fronts" kicker="TAP A UNIT · TAP A FRONT" body="Cavalry earns its keep on a wing. Heavy infantry holds the center. A front with nobody on it breaks the moment it is touched." tips={["Pick a doctrine: Aggressive, Defensive, Envelopment or Skirmish. It nudges every stage and how much your fronts can take.", "Each front shows a cohesion word: FIRM, STEADY or BRITTLE. Fix BRITTLE before you fight."]}>
          <div className="flex gap-1.5 py-0.5">
            {[
              { label: "LEFT", toks: ["per", "ind"], want: "wants speed", color: WING },
              { label: "CENTER", toks: ["rom", "chn", "ind", "ind"], want: "wants steady", color: CENTER },
              { label: "RIGHT", toks: ["ind", "ind"], want: "wants speed", color: WING },
            ].map((f) => (
              <div key={f.label} className="flex grow basis-0 flex-col items-center gap-[5px] rounded-[4px] border border-dashed border-rule-btn bg-sunk px-2 pt-2 pb-[9px]">
                <span className="font-mono text-[8px] tracking-[0.14em] text-faint">{f.label}</span>
                <div className="flex flex-wrap justify-center gap-[3px]">
                  {f.toks.map((k, j) => (
                    <span key={j} className="h-4 w-4 rounded-full" style={{ background: cc(k).deep, border: `1px solid ${cc(k).bright}` }} />
                  ))}
                </div>
                <span className="font-mono text-[8px]" style={{ color: f.color }}>
                  {f.want}
                </span>
              </div>
            ))}
          </div>
        </Card>
        <Card n={4} title="Watch it play out" kicker="ONE BEAT AT A TIME · NO INPUT" body="Each front fights its opposite. Losing a stage costs morale. Break both his wings and his center is surrounded; at 0.80 morale an army routs. Win, and the next general is waiting. Lose once and the campaign is over." tips={["Everyone plays the same board, so the ladder will rank how many you won, then how much you lost."]}>
          <div className="flex flex-col gap-1.5 py-0.5">
            {[
              ["SKIRMISH", STAGE.SKIRMISH.color, "Arrows first. Shoot against their Armor."],
              ["CLASH", STAGE.CLASH.color, "The charge lands. Charge against Steady and Armor."],
              ["PRESS", STAGE.PRESS.color, "The shoving match. Fight in the center, Speed on the wings."],
              ["BREAK", STAGE.BREAK.color, "A front that takes more than its cohesion runs."],
            ].map(([label, color, text]) => (
              <div key={label} className="flex items-center gap-2.5">
                <span className="w-[62px] font-mono text-[9px] tracking-[0.12em]" style={{ color }}>
                  {label}
                </span>
                <span className="grow text-[11px] leading-snug" style={{ color: CENTER }}>
                  {text}
                </span>
              </div>
            ))}
            <div className="flex items-center gap-2 pt-1.5">
              <span className="w-[62px] font-mono text-[8px] tracking-[0.1em] text-faint-2">MORALE</span>
              <div className="relative h-2 grow overflow-hidden rounded-sm bg-sunk">
                <div className="absolute inset-y-0 left-0 w-[55%] opacity-85" style={{ background: STAGE.CLASH.color }} />
                <div className="absolute inset-y-0 left-[80%] w-px bg-bone" />
              </div>
              <span className="font-mono text-[9px] text-rust">0.80 ROUT</span>
            </div>
          </div>
        </Card>
        <section className="flex flex-col gap-2.5 pt-2">
          <div className="flex items-baseline justify-between">
            <span className="font-mono text-[10px] tracking-[0.18em] text-faint">CULTURES &amp; TRAITS</span>
            <span className="font-mono text-[9px] text-faint-2">4 UNITS WAKES IT · 6 DOUBLES IT</span>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {cultures.map((k) => (
              <div key={k} className="box-border flex min-h-[52px] flex-col gap-[3px] rounded-[4px] px-[9px] py-2" style={{ background: cc(k)?.deep, border: `1px solid ${cc(k)?.bright}` }}>
                <span className="font-mono text-[8px] tracking-[0.12em] uppercase" style={{ color: cc(k)?.bright }}>
                  {engine ? cultureShort(engine, k) : k}
                </span>
                <span className="text-[11px] leading-tight font-medium text-bone">{engine ? traitName(engine, k) : ""}</span>
                <span className="text-[9px] leading-snug opacity-75" style={{ color: "#e6decb" }}>
                  {TRAIT_GIST[k]}
                </span>
              </div>
            ))}
          </div>
        </section>
      </main>
      <div className="flex shrink-0 flex-col gap-2 border-t border-raised bg-sunk px-[18px] pt-3 pb-[calc(14px+env(safe-area-inset-bottom,14px))]">
        <Link href="/numbers" className="box-border flex min-h-11 items-center justify-center rounded-[3px] border border-rule-btn px-4 py-3.5 text-[15px] font-medium text-bone no-underline">
          What each number means
        </Link>
        <Link href="/" className="box-border flex min-h-11 items-center justify-center rounded-[3px] bg-bone px-4 py-[15px] text-base font-semibold text-ink no-underline">
          Play today’s board
        </Link>
      </div>
    </Screen>
  );
}
