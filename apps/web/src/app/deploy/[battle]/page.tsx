"use client";

import { useParams } from "next/navigation";
import { RunHeader } from "@/components/RunHeader";
import { Screen } from "@/components/Screen";
import { StepBar } from "@/components/StepBar";
import { useCampaign } from "@/lib/campaign/CampaignProvider";
import { STEPS } from "@/lib/steps";

export default function DeployPage() {
  const params = useParams<{ battle: string }>();
  const n = Number(params.battle) || 1;
  const { engine, army, battles } = useCampaign();
  const b = battles[n - 1];
  return (
    <Screen>
      <RunHeader back="/draft/8" label={`Battle ${n} of 3 · ${b?.spec.terrain ?? ""}`} />
      <div className="px-[18px] pb-3.5">
        <StepBar steps={[...STEPS]} current={1 + n} />
      </div>
      <main className="flex grow flex-col gap-3 px-[18px]">
        <h1 className="display m-0 text-[30px]">Set the line.</h1>
        <p className="m-0 text-sm text-faint">
          {b ? `Against ${b.foeGeneral} on ${b.spec.terrain}.` : ""} {engine && army ? "Your army is legal." : ""} Deployment arrives in the next step.
        </p>
      </main>
    </Screen>
  );
}
