"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { narrateBeats, traitWord, turningPoint, whyLine, type Front } from "@warlord/engine";
import { HeaderLink, RunHeader } from "@/components/RunHeader";
import { Screen } from "@/components/Screen";
import { TraitChip } from "@/components/ui/TraitChip";
import { LineReveal } from "@/components/ui/LineReveal";
import { useCampaign } from "@/lib/campaign/CampaignProvider";
import { chronicle, endedLabel } from "@/lib/battleView";
import { device } from "@/lib/versus/client";
import { TERRAIN_WORD, cultureColor, cultureShort, shortGeneralName, traitDef } from "@/lib/text";

/** Versus-Result (v3 §13.2): head-to-head, the turning point, both lines, Rematch. */
export function DuelResult() {
  const router = useRouter();
  const { engine, save, army, general, battles, duel } = useCampaign();
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const b = battles[0];
  const result = b?.result ?? null;
  const beats = useMemo(() => (result ? narrateBeats(result) : []), [result]);
  if (!engine || !save || !army || !general || !duel) return <Screen />;
  const v = duel.view;
  const me = v.me, him = v.him;
  const last = v.record.history[v.record.history.length - 1];
  const claimed = !!last?.claimed;
  const iWon = last ? last.winner === me.seat : result ? result.winner === "A" : false;
  const mine = cultureColor(general.culture);
  const hisCC = b ? cultureColor(b.foeGeneral.culture) : mine;
  const myWins = v.record[me.seat], hisWins = v.record[me.seat === "host" ? "guest" : "host"];
  const tp = result && !iWon ? turningPoint(beats) : null;
  const decisive = result && iWon ? beats.filter((x) => x.kind !== "result" && (x.broke.him.length || x.routed)).pop() ?? null : null;
  const headline = claimed
    ? iWon ? `${him?.name ?? "He"} left the field.` : "You left the field."
    : iWon ? `${decisive?.short ?? ""} ${beats[beats.length - 1]?.narration ?? ""}`.trim() : tp?.text ?? "";
  const shape = (dep: readonly (string | null)[] | null | undefined) => ["L", "C", "R"].map((f) => dep?.filter((x) => x === f).length ?? 0).join(" | ");
  const shareLines = [
    `Warlord Draft · 1v1 · ${v.code}`,
    `${me.name.padEnd(8)} ${shape(me.line)}   ${general.name}`,
    him && b ? `${him.name.padEnd(8)} ${shape(him.line)}   ${b.foeGeneral.name}` : "",
    claimed ? (iWon ? "he left the field" : "I left the field") : (decisive?.short ?? tp?.text ?? "").replace(/\.$/, "").toLowerCase(),
    `${iWon ? "won" : "lost"} · record ${myWins}–${hisWins}`,
  ].filter(Boolean);
  const shareText = shareLines.join("\n");
  const share = async () => {
    try {
      if (navigator.share) { await navigator.share({ text: shareText }); return; }
      await navigator.clipboard.writeText(shareText); setCopied(true); setTimeout(() => setCopied(false), 1600);
    } catch { /* cancelled */ }
  };
  const rematch = async () => { setBusy(true); try { await duel.rematch(); router.push(`/v/${v.code}`); } catch { setBusy(false); } };
  const leave = async () => { try { await duel.leave(); } catch { /* gone */ } device.forget(v.code); router.push("/versus"); };
  const offerOpen = v.status === "ready" && v.rematch;

  return (
    <Screen>
      <RunHeader close="/versus" label={`Room ${v.code}${v.ground ? ` · ${TERRAIN_WORD[v.ground]}` : ""}`} right={result ? <HeaderLink href="/battle/1">Replay</HeaderLink> : null} />
      <main className="flex grow flex-col gap-5 px-5 pb-4">
        <div className="flex items-stretch gap-3 rounded-lg border border-rule bg-panel px-4 py-3.5">
          <div className="flex min-w-0 grow basis-0 flex-col gap-1">
            <span className="label truncate" style={{ color: mine.bright }}>YOU · {shortGeneralName(general.name).toUpperCase()}</span>
            <span className="display text-[28px] leading-tight">{me.name}</span>
            <span className="label text-bone">{iWon ? "THE FIELD IS YOURS" : "THE FIELD IS HIS"}</span>
          </div>
          <div className="flex shrink-0 flex-col items-center justify-center gap-1">
            <span className="font-mono text-[26px] text-bone">{myWins} – {hisWins}</span>
            <span className="label text-faint">RECORD</span>
          </div>
          <div className="flex min-w-0 grow basis-0 flex-col items-end gap-1 text-right">
            <span className="label truncate" style={{ color: hisCC.bright }}>{(him?.name ?? "HIM").toUpperCase()}{b ? ` · ${shortGeneralName(b.foeGeneral.name).toUpperCase()}` : ""}</span>
            <span className="display text-[28px] leading-tight">{him?.name ?? "—"}</span>
            <span className="label text-dim">{claimed ? "LEFT" : result ? endedLabel(result.brokeInPhase) : ""}</span>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <span className="label" style={{ color: iWon ? mine.bright : "var(--rust)" }}>{claimed ? "CLAIMED" : "THE TURNING POINT"}</span>
          <h1 className="display m-0 text-[30px] leading-[1.14]">{headline}</h1>
          {tp?.trait && <p className="m-0 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[15px] text-dim"><TraitChip rule={traitDef(engine, tp.trait === "furor_spent" ? "furor" : tp.trait).kind === "rule"}>{traitWord(tp.trait)}</TraitChip><span>did it.</span></p>}
          {claimed && <p className="m-0 text-[15px] text-dim">{iWon ? "A player gone for a minute forfeits. The record counts it." : "You were gone for a minute. The record counts it."}</p>}
        </div>
        {result && (
          <>
            <div className="flex flex-col">
              <span className="label pb-2 text-faint">HOW IT WENT</span>
              {chronicle(beats).map((l, k) => (
                <div key={k} className="flex gap-4 border-t border-rule py-2.5">
                  <span className="label w-[60px] shrink-0 pt-0.5" style={{ color: l.key ? "var(--bone)" : "var(--faint)" }}>{l.label}</span>
                  <span className="text-[15px] leading-snug" style={{ color: l.key ? "var(--bone)" : "var(--dim)" }}>{l.text}</span>
                </div>
              ))}
              {(me.auto.length > 0 || (him?.auto.length ?? 0) > 0) && (
                <span className="pt-2 text-[13px] text-faint">{[me.auto.length ? `The game picked ${me.auto.length} step${me.auto.length > 1 ? "s" : ""} for you` : "", him?.auto.length ? `${him.name}'s ${him.auto.includes("line") ? "line was set for him" : "picks were made for him"}` : ""].filter(Boolean).join(" · ")}.</span>
              )}
            </div>
            {b && (
              <div className="flex flex-col gap-2.5">
                <div className="flex items-baseline justify-between"><span className="label text-faint">BOTH LINES, REVEALED</span><span className="label text-dim">FRONT FOR FRONT</span></div>
                <LineReveal engine={engine} mine={{ ...army, deployment: b.play.deployment as Front[] }} his={b.foe} result={result} size={40} mineColor={mine.bright} hisColor={hisCC.bright} />
                <span className="text-[15px] leading-snug text-dim">{whyLine(engine.data, result, beats)}</span>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              {[{ k: "YOU LOST", v: `${(result.casualties.A * 100).toFixed(0)}%` }, { k: "HE LOST", v: `${(result.casualties.B * 100).toFixed(0)}%` }].map((o) => (
                <div key={o.k} className="flex flex-col gap-1 rounded-md border border-rule bg-panel px-3.5 py-3"><span className="label text-faint">{o.k}</span><span className="font-mono text-[17px] text-bone">{o.v}</span></div>
              ))}
            </div>
          </>
        )}
        <div className="flex flex-col gap-1.5 rounded-md border border-dashed border-rule-btn bg-sunk px-4 py-3">
          <div className="flex items-baseline justify-between"><span className="label text-faint">WHAT GETS SHARED</span><span className="label text-faint">NO SPOILERS</span></div>
          <pre className="m-0 font-mono text-[13px] leading-relaxed whitespace-pre-wrap text-dim">{shareText}</pre>
        </div>
        {offerOpen && <span className="text-[15px] text-bone">{v.rematch!.by === me.seat ? "Rematch asked. Waiting for him in the room." : `${him?.name ?? "He"} wants a rematch.`} <Link href={`/v/${v.code}`} className="text-bone">Go to the room</Link></span>}
        <span className="text-[13px] text-faint">{cultureShort(engine, general.culture)} against {b ? cultureShort(engine, b.foeGeneral.culture) : "—"}, match {last?.matchNo ?? v.matchNo}.</span>
      </main>
      <div className="sticky bottom-0 z-30 mt-auto flex shrink-0 flex-col gap-2 border-t border-raised bg-sunk px-5 pt-3 pb-[calc(14px+env(safe-area-inset-bottom,14px))]">
        <div className="flex gap-2.5">
          <button type="button" onClick={rematch} disabled={busy || v.status === "closed"} className="box-border min-h-12 grow rounded-[3px] border border-bone bg-bone px-4 py-[15px] text-[17px] font-semibold text-ink disabled:opacity-60">{busy ? "Opening…" : offerOpen ? "To the room" : "Rematch"}</button>
          <button type="button" onClick={share} className="box-border min-h-12 w-24 rounded-[3px] border border-rule-btn bg-transparent text-[15px] font-semibold text-bone">{copied ? "Copied" : "Share"}</button>
        </div>
        <div className="flex justify-between">
          <Link href="/" className="flex min-h-10 items-center py-2 text-[15px] text-dim no-underline">Back to today</Link>
          <button type="button" onClick={leave} className="min-h-10 border-0 bg-transparent py-2 text-[15px] text-dim">Leave the room</button>
        </div>
      </div>
    </Screen>
  );
}
