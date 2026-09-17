"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { narrateBeats } from "@warlord/engine";
import { BottomBar, PrimaryButton } from "@/components/BottomBar";
import { RunHeader } from "@/components/RunHeader";
import { Screen } from "@/components/Screen";
import { StepBar } from "@/components/StepBar";
import { useCampaign } from "@/lib/campaign/CampaignProvider";
import { endedLabel } from "@/lib/battleView";
import { STEPS } from "@/lib/steps";
import { PLAN_LABEL, cultureName } from "@/lib/text";

export default function BetweenPage() {
  const params = useParams<{ battle: string }>();
  const router = useRouter();
  const n = Math.max(1, Math.min(3, Number(params.battle) || 1));
  const i = n - 1;
  const { engine, hydrated, save, battles, score, marchOn } = useCampaign();
  const b = battles[i];
  const result = b?.result ?? null;
  const beats = useMemo(() => (result ? narrateBeats(result) : []), [result]);

  useEffect(() => {
    if (!engine) return;
    if (hydrated && !save) router.replace("/");
    else if (save && !save.battles[i]?.fought) router.replace(`/deploy/${n}`);
    else if (save && score.over) router.replace("/result");
  }, [engine, hydrated, save, i, n, score.over, router]);

  if (!engine || !save || !b || !result) return <Screen />;
  const next = battles[i + 1];
  const youWon = result.winner === "A";
  const general = engine.data.generalById.get(save.draft.generalPool[save.draft.generalIndex!])!;
  const go = () => {
    marchOn();
    router.push(`/deploy/${n + 1}`);
  };
  return (
    <Screen>
      <RunHeader back={`/battle/${n}`} label={`Battle ${n} of 3 · Won`} />
      <div className="px-[18px] pb-3.5">
        <StepBar steps={[...STEPS]} current={1 + n} />
      </div>
      <main className="flex grow flex-col gap-4 px-[18px] pb-4">
        <div className="flex flex-col gap-2">
          <span className="font-mono text-[10px] tracking-[0.16em] text-brass">{youWon ? "THE FIELD IS YOURS" : "THE FIELD IS HIS"}</span>
          <h1 className="display m-0 text-[30px] leading-[1.14]">{beats[beats.length - 1]?.narration}</h1>
          <p className="m-0 text-[13px] text-dim">
            {general.name}, {PLAN_LABEL[b.play.plan!].toLowerCase()}, on {b.spec.terrain} — against {b.foeGeneral}.
          </p>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {[
            { k: "ENDED", v: endedLabel(result.brokeInPhase) },
            { k: "HIS MORALE", v: result.moraleFraction.B.toFixed(2) },
            { k: "YOU LOST", v: `${(result.casualties.A * 100).toFixed(0)}%` },
            { k: "HE LOST", v: `${(result.casualties.B * 100).toFixed(0)}%` },
          ].map((o) => (
            <div key={o.k} className="flex flex-col gap-[3px] rounded-md border border-rule-2 bg-panel px-2 py-2">
              <span className="font-mono text-[8px] tracking-[0.1em] text-faint-2">{o.k}</span>
              <span className="font-mono text-sm text-bone">{o.v}</span>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-2">
          <span className="label text-faint">How it went</span>
          {beats.slice(0, -1).map((bt) => (
            <div key={bt.label} className="flex gap-3 border-t border-rule-3 pt-2">
              <span className="w-[62px] shrink-0 font-mono text-[9px] tracking-[0.1em] text-faint-2">{bt.label}</span>
              <span className="text-[13px] leading-snug text-dim">{bt.short}</span>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-1 rounded-lg border border-rule-2 bg-panel px-4 py-3.5">
          <span className="label text-accent">Next</span>
          <span className="display text-[24px]">{next?.foeGeneral}</span>
          <span className="text-[13px] text-dim">
            of {next ? cultureName(engine, next.foeCulture) : ""}, on {next?.spec.terrain}. Same army, a new line.
          </span>
        </div>
      </main>
      <BottomBar>
        <PrimaryButton onClick={go}>March on</PrimaryButton>
      </BottomBar>
    </Screen>
  );
}
