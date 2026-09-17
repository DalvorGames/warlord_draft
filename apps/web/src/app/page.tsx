import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { EngineSmoke } from "@/components/EngineSmoke";
import { Screen } from "@/components/Screen";
import { TabBar } from "@/components/TabBar";
import { dailyKey, formatMusterDate, seedFromKey } from "@/lib/daily";

export const dynamic = "force-dynamic";

export default function TodayPage() {
  const key = dailyKey();
  const seed = seedFromKey(key);
  const facts = [
    { k: "SEED", v: String(seed) },
    { k: "BATTLES", v: "3" },
    { k: "REROLLS", v: "2" },
  ];
  return (
    <Screen>
      <AppHeader />
      <main className="flex grow flex-col gap-3.5 px-[18px] pt-1">
        <section className="flex flex-col gap-3.5 rounded-lg border border-accent bg-panel px-[18px] pt-5 pb-[18px]">
          <div className="flex items-baseline justify-between">
            <span className="label text-accent">Today’s muster</span>
            <span className="font-mono text-[10px] text-faint-2">{formatMusterDate()}</span>
          </div>
          <h1 className="display m-0 text-[30px]">
            One army. Three generals.
            <br />
            One attempt.
          </h1>
          <div className="flex gap-2.5">
            {facts.map((f) => (
              <div key={f.k} className="flex flex-1 basis-0 flex-col gap-[3px] rounded-md border border-rule-2 bg-panel-2 px-2.5 py-[9px]">
                <span className="label text-[8px] tracking-[0.1em] text-faint-2">{f.k}</span>
                <span className="font-mono text-[13px] text-bone">{f.v}</span>
              </div>
            ))}
          </div>
          <Link
            href="/general"
            className="flex min-h-11 items-center justify-center rounded-md bg-accent-fill px-4 py-[17px] text-[17px] font-semibold text-accent-text no-underline"
          >
            Draft today’s army
          </Link>
          <div className="text-center text-xs text-faint-2">Draft once, fight three times. About six minutes.</div>
        </section>
        <div className="flex gap-2.5">
          <Link href="/general?free=1" className="flex min-h-11 flex-1 basis-0 items-center justify-center rounded-md border border-rule-btn px-2.5 py-[15px] text-sm text-bone no-underline">
            Free campaign
          </Link>
          <button type="button" className="min-h-11 flex-1 basis-0 rounded-md border border-rule-btn bg-transparent px-2.5 py-[15px] text-sm text-bone">
            Replay a run
          </button>
        </div>
        <div className="mt-auto pb-3">
          <EngineSmoke seed={seed} />
        </div>
      </main>
      <TabBar />
    </Screen>
  );
}
