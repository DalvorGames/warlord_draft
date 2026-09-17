import type { Stats } from "@warlord/engine";
import { STAT_KEYS, STAT_LABELS, statColor } from "@/lib/text";

export function StatGrid({ stats, size = 14 }: { stats: Stats; size?: number }) {
  return (
    <div className="grid grid-cols-6 gap-[5px]">
      {STAT_KEYS.map((k) => (
        <div key={k} className="flex flex-col gap-px">
          <span className="font-mono text-[8px] tracking-[0.06em] text-faint-2">{STAT_LABELS[k]}</span>
          <span className="font-mono" style={{ fontSize: size, color: statColor(stats[k]) }}>
            {stats[k]}
          </span>
        </div>
      ))}
    </div>
  );
}
