"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { RunHeader } from "@/components/RunHeader";
import { Screen } from "@/components/Screen";
import { GradeChip } from "@/components/draft/GradeChip";
import { StatGrid } from "@/components/draft/StatGrid";
import { useCampaign } from "@/lib/campaign/CampaignProvider";
import { enemyRead } from "@/lib/deployText";
import { PLAN_LABEL, classTint, cultureName } from "@/lib/text";

export default function RosterPage() {
  const params = useParams<{ battle: string }>();
  const n = Math.max(1, Math.min(3, Number(params.battle) || 1));
  const { engine, battles } = useCampaign();
  const b = battles[n - 1];
  if (!engine || !b) return <Screen />;
  const g = engine.data.generalById.get(b.foe.generalId)!;
  const units = b.foe.slots.map((s) => engine.data.unitById.get(s.unitId)!);
  return (
    <Screen>
      <RunHeader back={`/deploy/${n}`} label={`His roster · Battle ${n}`} right={<Link href={`/deploy/${n}`} className="px-2 text-[13px] text-bone no-underline">Close</Link>} />
      <main className="flex grow flex-col gap-3 px-[18px] pb-6">
        <div className="flex flex-col gap-0.5">
          <span className="font-mono text-[9px] tracking-[0.14em] uppercase text-faint">{cultureName(engine, g.culture)}</span>
          <span className="display text-[26px]">{g.name}</span>
          <span className="font-mono text-[10px] text-faint-2">
            CMD {g.stats.command} · TAC {g.stats.tactics} · LOG {g.stats.logistics} · CHA {g.stats.charisma} · {PLAN_LABEL[b.foe.plan]}
          </span>
        </div>
        <p className="m-0 text-[13px] leading-snug text-dim">{enemyRead(engine, b.foe)}</p>
        <p className="m-0 text-[11px] text-faint-2">You have his roster. You do not have his deployment, and he does not have yours.</p>
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {units.map((u, k) => (
            <li key={k} className="flex flex-col gap-2 rounded-lg border border-rule-2 bg-panel px-3.5 py-3">
              <div className="flex items-center gap-2">
                <GradeChip grade={u.grade} />
                <span className="grow text-[15px] font-medium">{u.name}</span>
                <span className="rounded-sm border px-1.5 py-0.5 font-mono text-[9px] tracking-[0.1em] uppercase" style={{ color: classTint(u.class).color, borderColor: classTint(u.class).edge }}>
                  {u.class}
                </span>
              </div>
              <StatGrid stats={u.stats} size={13} />
            </li>
          ))}
        </ul>
      </main>
    </Screen>
  );
}
