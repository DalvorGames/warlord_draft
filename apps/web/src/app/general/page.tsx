"use client";

import { Screen } from "@/components/Screen";
import { StepBar } from "@/components/StepBar";
import { useCampaign } from "@/lib/campaign/CampaignProvider";
import { STEPS } from "@/lib/steps";

export default function GeneralPage() {
  const { engine, save } = useCampaign();
  const pool = engine && save ? save.draft.generalPool.map((id) => engine.data.generalById.get(id)!) : [];
  return (
    <Screen>
      <div className="px-[18px] pt-3.5">
        <StepBar steps={[...STEPS]} current={0} />
      </div>
      <main className="flex grow flex-col gap-4 px-[18px] pt-5">
        <span className="label text-accent">1 · Your general</span>
        <h1 className="display m-0 text-[30px]">Who leads?</h1>
        <ul className="m-0 list-none p-0 text-sm text-dim">
          {pool.map((g) => (
            <li key={g.id}>{g.name} of {g.culture}</li>
          ))}
        </ul>
        <p className="m-0 text-sm text-faint-2">The general cards arrive in the next step.</p>
      </main>
    </Screen>
  );
}
