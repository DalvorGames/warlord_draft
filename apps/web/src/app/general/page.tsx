import { Screen } from "@/components/Screen";
import { StepBar } from "@/components/StepBar";
import { STEPS } from "@/lib/steps";

export default function GeneralPage() {
  return (
    <Screen>
      <div className="px-[18px] pt-3.5">
        <StepBar steps={[...STEPS]} current={0} />
      </div>
      <main className="flex grow flex-col gap-4 px-[18px] pt-5">
        <span className="label text-accent">1 · Your general</span>
        <h1 className="display m-0 text-[30px]">Who leads?</h1>
        <p className="m-0 text-sm text-faint-2">Coming in M2.</p>
      </main>
    </Screen>
  );
}
