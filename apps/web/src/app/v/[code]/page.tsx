"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BottomBar, OutlineButton } from "@/components/BottomBar";
import { RunHeader } from "@/components/RunHeader";
import { Screen } from "@/components/Screen";
import { NamePrompt } from "@/components/versus/NamePrompt";
import { useCampaign } from "@/lib/campaign/CampaignProvider";
import { ApiError, api, countdown, device, useRoom, useServerClock } from "@/lib/versus/client";
import { routeForDuel } from "@/lib/versus/duel";
import { GROUND_NOTE, TERRAIN_WORD, cultureColor } from "@/lib/text";

export default function RoomPage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const code = (params.code ?? "").toUpperCase();
  const { engine, hydrated, save, startDuel } = useCampaign();
  const [seated, setSeated] = useState<boolean | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [askName, setAskName] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const { view, error, act, serverNow } = useRoom(seated ? code : null);
  const now = useServerClock(serverNow);

  // Take a seat if this device has none: the invite link is the room.
  useEffect(() => {
    if (!code || seated !== null) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the device's seat is read once after mount
    if (device.seat(code)) { setSeated(true); return; }
    if (!device.name()) { setAskName(true); return; }
    let alive = true;
    api.join(code, device.name()).then((r) => { device.remember({ code: r.code, seat: r.seat, token: r.token, updatedAt: Date.now() }); if (alive) setSeated(true); })
      .catch((e: unknown) => { if (alive) { setJoinError(e instanceof ApiError ? e.message : String(e)); setSeated(false); } });
    return () => { alive = false; };
  }, [code, seated, askName]);

  // Past the ready-up: make sure the run save is this match's, then go where the step says.
  useEffect(() => {
    if (!engine || !hydrated || !view) return;
    if (view.status === "drafting" || view.status === "deploying" || view.status === "battle" || view.status === "done") {
      const same = save?.kind === "duel" && save.duel?.code === view.code && save.duel.matchNo === view.matchNo;
      if (!same) startDuel(view, device.seat(code)!.token);
      router.replace(routeForDuel(view));
    }
  }, [engine, hydrated, view, save, code, startDuel, router]);

  if (!code) return <Screen />;
  const link = typeof window !== "undefined" ? `${window.location.origin}/v/${code}` : `/v/${code}`;
  const share = async () => {
    try {
      if (navigator.share) { await navigator.share({ title: "Warlord Draft", text: `Play me. Room ${code}`, url: link }); return; }
      await navigator.clipboard.writeText(link); setCopied("link"); setTimeout(() => setCopied(null), 1600);
    } catch { /* cancelled */ }
  };
  const copyCode = async () => { try { await navigator.clipboard.writeText(code); setCopied("code"); setTimeout(() => setCopied(null), 1600); } catch { /* blocked */ } };
  const leaveRoom = async () => { try { await act((c, t) => api.leave(c, t)); } catch { /* gone already */ } device.forget(code); router.push("/versus"); };

  const nameSheet = (
    <NamePrompt open={askName} initial="" onClose={() => { setAskName(false); router.push("/versus"); }} onDone={(n) => { device.setName(n); setAskName(false); }} />
  );
  if (joinError || error === "no seat") {
    return (
      <Screen>
        <RunHeader back="/versus" label={`Room · ${code}`} />
        <main className="flex grow flex-col gap-3 px-5 pt-6">
          <span className="display text-[26px]">{joinError?.includes("full") ? "That room is full." : joinError?.includes("not waiting") ? "That room has started without you." : "That room is not open."}</span>
          <span className="text-[15px] text-dim">{joinError ?? "This phone has no seat in it."}</span>
          <Link href="/versus" className="mt-2 text-[15px] text-bone">Back to Versus</Link>
        </main>
        {nameSheet}
      </Screen>
    );
  }
  if (!view) {
    return (
      <Screen>
        <RunHeader back="/versus" label={`Room · ${code}`} />
        <main className="flex grow items-center justify-center px-5 text-[15px] text-dim">{askName ? "" : "Opening the room…"}</main>
        {nameSheet}
      </Screen>
    );
  }
  const me = view.me, him = view.him;
  const initial = (n: string) => n.charAt(0).toUpperCase();
  const myCulture = engine && view.record.history.length ? null : null; // no culture before a general is drawn
  void myCulture;
  const lastFor = (seat: "host" | "guest") => {
    const h = [...view.record.history].reverse().find((x) => (seat === "host" ? x.hostRun : x.guestRun));
    if (!h || !engine) return null;
    const run = seat === "host" ? h.hostRun : h.guestRun;
    try { const a = engine.replayDraft(run!, { rerolls: 2 }).army; return a ? engine.data.generalById.get(a.generalId)!.culture : null; } catch { return null; }
  };
  const myFill = lastFor(me.seat), hisFill = him ? lastFor(me.seat === "host" ? "guest" : "host") : null;

  if (view.status === "closed") {
    return (
      <Screen>
        <RunHeader back="/versus" label={`Room · ${code}`} />
        <main className="flex grow flex-col gap-3 px-5 pt-6">
          <span className="display text-[26px]">The room is closed.</span>
          <span className="text-[15px] text-dim">{view.record.history.length ? `The record stands at ${view.record.host} – ${view.record.guest}.` : "Nobody came, or someone left."}</span>
          <Link href="/versus" className="mt-2 text-[15px] text-bone" onClick={() => device.forget(code)}>Back to Versus</Link>
        </main>
      </Screen>
    );
  }

  if (view.status === "waiting") {
    const left = countdown(view.expiresAt, now);
    return (
      <Screen>
        <RunHeader back="/versus" label={`Room · ${code}`} />
        <main className="flex grow flex-col items-center gap-5 px-5 pt-8">
          <span className="label text-faint">YOUR ROOM</span>
          <div className="flex gap-2">{code.split("").map((ch, i) => <span key={i} className="flex h-14 w-11 items-center justify-center rounded-md border border-rule-btn bg-sunk font-mono text-[26px] text-bone">{ch}</span>)}</div>
          <span className="text-[15px] text-dim">Read it out, or send the link.</span>
          <div className="flex w-full gap-3">
            <button type="button" onClick={share} className="box-border min-h-12 grow rounded-[3px] border border-rule-btn bg-transparent px-3 text-[17px] font-semibold text-bone">{copied === "link" ? "Link copied" : "Share the link"}</button>
            <button type="button" onClick={copyCode} className="box-border min-h-12 grow rounded-[3px] border border-rule-btn bg-transparent px-3 text-[17px] font-semibold text-bone">{copied === "code" ? "Copied" : "Copy code"}</button>
          </div>
          <div className="flex items-center gap-5 pt-6">
            <span className="display flex h-[116px] w-[116px] items-center justify-center rounded-full text-[44px] text-bone" style={{ background: myFill ? cultureColor(myFill).deep : "var(--raised)", border: `2px solid ${myFill ? cultureColor(myFill).bright : "var(--rule-btn)"}` }}>{initial(me.name)}</span>
            <span className="label text-faint">VS</span>
            <span className="flex h-[116px] w-[116px] items-center justify-center rounded-full border-2 border-dashed border-rule-btn text-[26px] text-faint">—</span>
          </div>
          <span className="text-[20px] text-bone">Waiting for a second player</span>
          <span className="text-[15px] text-dim">The room stays open for ten minutes{left.ms > 0 ? `, ${left.text} left` : ""}.</span>
        </main>
        <BottomBar><OutlineButton onClick={leaveRoom}>Leave the room</OutlineButton></BottomBar>
      </Screen>
    );
  }

  // ready: the ground is drawn, both are in, the split ready-up.
  const t = view.timers;
  const ready = () => act((c, tk) => api.ready(c, tk, !me.ready));
  return (
    <Screen>
      <RunHeader back="/versus" label={`Room · ${code} · 2 of 2`} />
      <main className="flex grow flex-col gap-4 px-5 pb-4">
        <div className="flex items-baseline justify-between"><span className="label text-faint">THE GROUND, DRAWN</span><span className="label text-bone">{view.ground ? TERRAIN_WORD[view.ground] : ""}</span></div>
        <span className="text-[15px] leading-snug text-dim">{view.ground ? GROUND_NOTE[view.ground] : ""}</span>
        <div className="flex items-baseline justify-between gap-3"><span className="label text-faint">TIMERS</span><span className="label text-bone">GENERAL {t.general / 1000}S · ROW {t.row / 1000}S · LINE {t.line / 1000}S</span></div>
        <span className="text-[15px] leading-snug text-dim">At zero the game picks for you. Leave for a minute and the other player may claim the field.</span>
        {view.rematch && him && (
          <span className="text-[15px] text-bone">{view.rematch.by === me.seat ? "You asked for a rematch. Waiting for him to ready up." : `${him.name} wants a rematch. Match ${view.matchNo}; the record is ${view.record.host} – ${view.record.guest}.`}</span>
        )}
        <div className="grid min-h-[300px] grow grid-cols-2 gap-3">
          <div className="flex flex-col justify-between rounded-lg px-4 py-4" style={{ background: myFill ? cultureColor(myFill).deep : "var(--panel)", border: `2px solid ${myFill ? cultureColor(myFill).bright : "var(--rule-btn)"}` }}>
            <div className="flex flex-col gap-1">
              <span className="label text-bone" style={{ opacity: 0.8 }}>YOU</span>
              <span className="display text-[30px] leading-tight text-bone">{me.name}</span>
              <span className="text-[15px] text-bone" style={{ opacity: 0.85 }}>{me.ready ? "Ready" : "Getting ready…"}</span>
            </div>
            <button type="button" onClick={ready} className="box-border min-h-11 rounded-[3px] border px-3 text-[15px] font-semibold" style={me.ready ? { borderColor: "var(--bone)", background: "transparent", color: "var(--bone)" } : { borderColor: "var(--bone)", background: "var(--bone)", color: "var(--ink)" }}>{me.ready ? "✓ Ready" : "Ready"}</button>
          </div>
          <div className="flex flex-col justify-between rounded-lg px-4 py-4" style={{ background: hisFill ? cultureColor(hisFill).deep : "var(--panel)", border: `1px solid ${hisFill ? cultureColor(hisFill).bright : "var(--rule)"}`, opacity: him?.dot === "left" ? 0.6 : 1 }}>
            <div className="flex flex-col gap-1">
              <span className="label text-bone" style={{ opacity: 0.8 }}>{me.seat === "host" ? "GUEST" : "HOST"}</span>
              <span className="display text-[30px] leading-tight text-bone">{him?.name ?? "—"}</span>
              <span className="text-[15px] text-bone" style={{ opacity: 0.85 }}>{him?.ready ? "Ready" : him?.dot === "left" ? "Left the room" : "Getting ready…"}</span>
            </div>
            <span className="label text-bone" style={{ opacity: 0.8 }}>{him?.ready ? "✓ READY" : "WAITING"}</span>
          </div>
        </div>
        <span className="label text-center text-faint">STARTS WHEN BOTH ARE READY</span>
      </main>
      <BottomBar><OutlineButton onClick={leaveRoom}>Leave the room</OutlineButton></BottomBar>
    </Screen>
  );
}
