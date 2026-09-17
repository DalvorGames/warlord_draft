"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BottomBar, PrimaryButton } from "@/components/BottomBar";
import { RunHeader } from "@/components/RunHeader";
import { Screen } from "@/components/Screen";
import { StepBar } from "@/components/StepBar";
import { useCampaign } from "@/lib/campaign/CampaignProvider";
import { generalHint } from "@/lib/draftRules";
import { STEPS } from "@/lib/steps";
import { PLAN_LABEL, cultureName, firstName, traitName, traitPhaseWord } from "@/lib/text";

const STAT_KEYS = [
  ["CMD", "command"],
  ["TAC", "tactics"],
  ["LOG", "logistics"],
  ["CHA", "charisma"],
] as const;

export default function GeneralPage() {
  const router = useRouter();
  const { engine, hydrated, save, updateDraft, setStage } = useCampaign();
  const [chosen, setChosen] = useState<number | null>(null);

  useEffect(() => {
    if (hydrated && !save) router.replace("/");
    if (save && save.draft.generalIndex !== null) router.replace(`/draft/${save.row + 1}`);
  }, [hydrated, save, router]);

  if (!engine || !save) return <Screen />;
  const rules = engine.data.rules;
  const pool = save.draft.generalPool.map((id) => engine.data.generalById.get(id)!);

  const take = () => {
    if (chosen === null) return;
    updateDraft((e, d) => e.pickGeneral(d, chosen));
    setStage("draft");
    router.push("/draft/1");
  };

  return (
    <Screen>
      <RunHeader back="/" label="1 · Your general" />
      <div className="px-[18px] pb-3.5">
        <StepBar steps={[...STEPS]} current={0} />
      </div>
      <div className="px-[18px] pb-3.5">
        <h1 className="display m-0 mb-1.5 text-[30px] leading-[1.1]">Three names came up.</h1>
        <p className="m-0 text-[13px] leading-normal text-faint">He sets your doctrine, your elite slots, and how steady your fronts are. He stands in the center.</p>
      </div>
      <main className="flex grow flex-col gap-2.5 px-[18px] pb-4">
        {pool.map((g, i) => {
          const sel = chosen === i;
          const elites = g.stats.logistics >= rules.eliteCap.logisticsThreshold ? rules.eliteCap.withLogistics : rules.eliteCap.base;
          const c = engine.data.cultures[g.culture];
          const chips = [
            { text: PLAN_LABEL[rules.styleToPlan[g.style]], hot: false },
            { text: `${elites} ELITE`, hot: elites > rules.eliteCap.base },
            { text: `${traitName(engine, g.culture).toUpperCase()} · ${traitPhaseWord(c.level1)}`, hot: false },
          ];
          return (
            <button
              key={g.id}
              type="button"
              onClick={() => setChosen(i)}
              aria-pressed={sel}
              className="flex shrink-0 flex-col gap-2.5 rounded-lg border px-4 py-[15px] text-left"
              style={{ background: sel ? "var(--panel-sel)" : "var(--panel)", borderColor: sel ? "var(--accent)" : "var(--rule-2)" }}
            >
              <div className="flex items-start gap-2.5">
                <div className="flex min-w-0 grow flex-col gap-[3px]">
                  <span className="font-mono text-[9px] tracking-[0.14em] uppercase text-faint">{cultureName(engine, g.culture)}</span>
                  <span className="display text-[26px] leading-[1.1]">{g.name}</span>
                </div>
                <div className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border text-xs text-ground" style={{ borderColor: sel ? "var(--brass)" : "#4a4538", background: sel ? "var(--brass)" : "transparent" }}>
                  {sel ? "✓" : ""}
                </div>
              </div>
              {g.note && <span className="text-xs leading-snug text-faint italic">{g.note}</span>}
              <div className="grid grid-cols-4 gap-2">
                {STAT_KEYS.map(([k, key]) => (
                  <div key={k} className="flex flex-col gap-0.5">
                    <span className="font-mono text-[8px] tracking-[0.08em] text-faint-2">{k}</span>
                    <span className="font-mono text-base" style={{ color: g.stats[key] >= 85 ? "var(--brass)" : "var(--center)" }}>
                      {g.stats[key]}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {chips.map((ch) => (
                  <span key={ch.text} className="rounded-sm border px-[7px] py-[3px] font-mono text-[9px] tracking-[0.08em]" style={{ color: ch.hot ? "var(--brass)" : "var(--dim)", borderColor: ch.hot ? "#7a6420" : "#3d382f" }}>
                    {ch.text}
                  </span>
                ))}
              </div>
            </button>
          );
        })}
      </main>
      <BottomBar>
        <div className="min-h-[34px] text-xs leading-snug text-brass">{chosen === null ? "Tap a name to read him." : generalHint(engine, pool[chosen].id)}</div>
        <PrimaryButton muted={chosen === null} disabled={chosen === null} onClick={take}>
          {chosen === null ? "Choose a general" : `Take the field with ${firstName(pool[chosen].name)}`}
        </PrimaryButton>
      </BottomBar>
    </Screen>
  );
}
