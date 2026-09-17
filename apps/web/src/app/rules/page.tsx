import { AppHeader } from "@/components/AppHeader";
import { Screen } from "@/components/Screen";
import { TabBar } from "@/components/TabBar";

export default function RulesPage() {
  return (
    <Screen>
      <AppHeader />
      <main className="flex grow flex-col gap-4 px-[18px] pt-1">
        <h1 className="display m-0 text-[30px]">How a campaign goes</h1>
        <p className="m-0 text-[15px] leading-relaxed text-dim">
          Pick a general. Draft eight units, one row at a time; a row decides which culture is offered, not what the
          unit becomes. Then face three generals in turn. Before each battle you see his roster, choose a doctrine,
          and set your line on the left, center and right. Lose once and the campaign is over.
        </p>
      </main>
      <TabBar />
    </Screen>
  );
}
