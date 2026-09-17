"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { narrateBeats } from "@warlord/engine";
import { BottomBar, PrimaryButton } from "@/components/BottomBar";
import { HeaderLink, RunHeader } from "@/components/RunHeader";
import { Screen } from "@/components/Screen";
import { TraitChip } from "@/components/ui/TraitChip";
import { LineReveal } from "@/components/ui/LineReveal";
import { useCampaign } from "@/lib/campaign/CampaignProvider";
import { chronicle, endedLabel } from "@/lib/battleView";
import { tierShort } from "@/lib/deployText";
import { GROUND_NOTE, TERRAIN_WORD, cultureColor, cultureName, traitDef, traitWithLevel } from "@/lib/text";

export default function BetweenPage() {
  const params = useParams<{ battle: string }>();
  const router = useRouter();
  const n = Math.max(1, Math.min(3, Number(params.battle) || 1));
  const i = n - 1;
  const { engine, hydrated, save, army, general, battles, score, marchOn } = useCampaign();
  const b = battles[i];
  const result = b?.result ?? null;
  const beats = useMemo(() => (result ? narrateBeats(result) : []), [result]);

  useEffect(() => {
    if (!engine) return;
    if (hydrated && !save) router.replace("/");
    else if (save && !save.battles[i]?.fought) router.replace(`/deploy/${n}`);
    else if (save && score.over) router.replace("/result");
  }, [engine, hydrated, save, i, n, score.over, router]);

  if (!engine || !save || !army || !general || !b || !result) return <Screen />;
  const next = battles[i + 1];
  const mine = cultureColor(general.culture);
  const his = cultureColor(b.foeGeneral.culture);
  const nextCC = next ? cultureColor(next.foeGeneral.culture) : mine;
  const lines = chronicle(beats);
  const decisive = beats.filter((x) => x.kind !== "result" && (x.broke.him.length || x.routed)).pop() ?? beats[beats.length - 2];
  const go = () => { marchOn(); router.push(`/deploy/${n + 1}`); };
  const nextRuleTrait = next?.foeTraits.find((t) => t.kind === "rule");
  return (
    <Screen>
      <RunHeader label={`After battle ${n}`} right={<HeaderLink href="/rules">Rules</HeaderLink>} />
      <main className="flex grow flex-col gap-5 px-5 pb-4">
        <div className="flex flex-col gap-2">
          <span className="label" style={{ color: mine.bright }}>THE FIELD IS YOURS · BATTLE {n} OF 3</span>
          <h1 className="display m-0 text-[30px] leading-[1.14]">{decisive?.short ?? beats[beats.length - 1]?.narration} {beats[beats.length - 1]?.narration}</h1>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            { k: "YOU LOST", v: `${(result.casualties.A * 100).toFixed(0)}%`, color: "var(--bone)" },
            { k: "HE LOST", v: `${(result.casualties.B * 100).toFixed(0)}%`, color: "var(--bone)" },
            { k: "ENDED", v: endedLabel(result.brokeInPhase), color: mine.bright },
          ].map((o) => (
            <div key={o.k} className="flex flex-col gap-1 rounded-md border border-rule bg-panel px-3 py-3">
              <span className="label text-faint">{o.k}</span>
              <span className="font-mono text-[17px]" style={{ color: o.color }}>{o.v}</span>
            </div>
          ))}
        </div>
        <div className="flex flex-col">
          <span className="label pb-2 text-faint">HOW IT WENT</span>
          {lines.map((l, k) => (
            <div key={k} className="flex gap-4 border-t border-rule py-2.5">
              <span className="label w-[60px] shrink-0 pt-0.5" style={{ color: l.key ? "var(--bone)" : "var(--faint)" }}>{l.label}</span>
              <span className="text-[15px] leading-snug" style={{ color: l.key ? "var(--bone)" : "var(--dim)" }}>{l.text}</span>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-2.5">
          <span className="label text-faint">THE LINES, REVEALED</span>
          <LineReveal engine={engine} mine={{ ...army, deployment: b.play.deployment as ("L" | "C" | "R")[] }} his={b.foe} result={result} size={36} mineColor={mine.bright} hisColor={his.bright} />
        </div>
        {next && (
          <div className="flex flex-col gap-2.5">
            <span className="label text-faint">NEXT</span>
            <div className="flex flex-col gap-3 rounded-lg px-4 py-3.5" style={{ background: nextCC.deep, border: `2px solid ${nextCC.bright}` }}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="label text-bone" style={{ opacity: 0.85 }}>BATTLE {n + 1} OF 3 · HARDER: {tierShort(next.spec.tier).toUpperCase()}</span>
                <span className="label shrink-0 text-bone">{TERRAIN_WORD[next.spec.terrain]}</span>
              </div>
              <span className="display text-[30px] leading-tight text-bone">{next.foeGeneral.name}</span>
              <span className="text-[15px] italic text-bone" style={{ opacity: 0.8 }}>of {cultureName(engine, next.foeGeneral.culture)}{next.foeGeneral.note ? ` · ${next.foeGeneral.note}` : ""}</span>
              {next.foeTraits.length ? (
                <div className="flex flex-col gap-2 rounded-md px-3 py-2.5" style={{ background: "rgba(16,15,12,0.35)" }}>
                  {next.foeTraits.map((t) => (
                    <div key={t.id} className="flex flex-col items-start gap-1">
                      <TraitChip onDeep rule={t.kind === "rule"}>{traitWithLevel(engine, t.id, t.level)}</TraitChip>
                      <span className="text-[13px] leading-snug text-bone" style={{ opacity: 0.85 }}>{traitDef(engine, t.id).text}</span>
                    </div>
                  ))}
                </div>
              ) : <span className="text-[13px] text-bone" style={{ opacity: 0.8 }}>No traits. His numbers are all he brings.</span>}
              <span className="text-[13px] leading-snug text-bone" style={{ opacity: 0.85 }}>
                {TERRAIN_WORD[next.spec.terrain].charAt(0) + TERRAIN_WORD[next.spec.terrain].slice(1).toLowerCase()}: {GROUND_NOTE[next.spec.terrain]}{nextRuleTrait ? ` ${nextRuleTrait.id === "delayer" ? "His fronts cannot break before the second round, so plan to win late." : nextRuleTrait.id === "rally" ? "His first broken front will stand one more stage." : nextRuleTrait.id === "master_of_ground" ? "The ground costs him half what it should." : "He will know where you are heaviest."}` : ""}
              </span>
            </div>
          </div>
        )}
      </main>
      <BottomBar>
        <PrimaryButton onClick={go}>Set the line for battle {n + 1}</PrimaryButton>
      </BottomBar>
    </Screen>
  );
}
