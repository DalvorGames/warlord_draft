"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { Screen } from "@/components/Screen";
import { TabBar } from "@/components/TabBar";
import { NamePrompt } from "@/components/versus/NamePrompt";
import { ApiError, api, device, type DeviceSeat } from "@/lib/versus/client";
import { useInvite } from "@/lib/versus/invite";

export default function VersusPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState<"create" | "join" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [askName, setAskName] = useState<null | ((name: string) => void)>(null);
  const [name, setName] = useState("");
  const [seats, setSeats] = useState<DeviceSeat[]>([]);
  const invite = useInvite();
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- device storage, once after mount
    setName(device.name());
    setSeats(device.seats());
  }, []);

  const withName = (then: (name: string) => void) => {
    const n = device.name();
    if (n) then(n);
    else setAskName(() => then);
  };
  const create = () => withName(async (n) => {
    setBusy("create"); setError(null);
    try {
      const r = await api.create(n);
      device.remember({ code: r.code, seat: r.seat, token: r.token, updatedAt: Date.now() });
      router.push(`/v/${r.code}`);
    } catch (e) { setError(e instanceof ApiError && e.status === 503 ? "The room server is not set up yet." : e instanceof Error ? e.message : String(e)); setBusy(null); }
  });
  const join = () => {
    const c = code.trim().toUpperCase();
    if (c.length !== 6) { setError("A code is six letters."); return; }
    setBusy("join");
    router.push(`/v/${c}`);
  };

  return (
    <Screen>
      <AppHeader />
      <main className="flex grow flex-col gap-5 px-5 pb-5">
        <div className="flex flex-col gap-1 pt-2">
          <span className="label text-faint">VERSUS</span>
          <h1 className="display m-0 text-[30px] leading-[1.1]">One board, two generals.</h1>
          <p className="m-0 text-[15px] leading-snug text-dim">You both draft from the same eight rows, hidden from each other. You see his army when you set your line, never where he stands. One battle. Live: pick timers, and the game picks for whoever runs out.</p>
        </div>
        <section className="flex flex-col gap-3 rounded-lg border border-rule bg-panel px-4 py-4">
          <span className="label text-faint">A NEW ROOM</span>
          <span className="text-[15px] leading-snug text-dim">You get a code and a link. The ground is drawn when the second player joins.</span>
          <button type="button" onClick={create} disabled={busy !== null} className="box-border min-h-12 w-full rounded-[3px] border border-bone bg-bone px-4 py-3.5 text-[17px] font-semibold text-ink disabled:opacity-60">{busy === "create" ? "Opening…" : "Create a room"}</button>
        </section>
        <section className="flex flex-col gap-3 rounded-lg border border-rule bg-panel px-4 py-4">
          <span className="label text-faint">JOIN A ROOM</span>
          <span className="text-[15px] leading-snug text-dim">Six letters from a friend, or open their link.</span>
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); join(); }}>
            <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))} placeholder="KJ4M7Q" aria-label="Room code" autoCapitalize="characters" autoCorrect="off" spellCheck={false} className="box-border min-w-0 grow rounded-[3px] border border-rule-btn bg-sunk px-3 py-3 font-mono text-[22px] tracking-[0.3em] text-bone outline-none placeholder:text-faint" />
            <button type="submit" disabled={busy !== null} className="box-border min-h-12 shrink-0 rounded-[3px] border border-rule-btn bg-transparent px-5 text-[17px] font-semibold text-bone disabled:opacity-60">Join</button>
          </form>
        </section>
        {error && <span className="text-[13px] text-rust">{error}</span>}
        {invite && (
          <Link href={`/v/${invite.code}`} className="flex items-center gap-3 rounded-lg border border-rule bg-panel px-4 py-3 no-underline" style={{ borderLeft: "3px solid var(--rust)" }}>
            <span className="flex h-9 w-9 items-center justify-center rounded-full border border-rule-btn bg-raised font-mono text-[15px] text-bone">{(invite.hisName || "?").charAt(0).toUpperCase()}</span>
            <span className="flex min-w-0 grow flex-col"><span className="text-[15px] text-bone">{invite.hisName || "A friend"} is waiting for you.</span><span className="label text-faint">ROOM {invite.code} · {invite.left}</span></span>
            <span className="text-[15px] font-semibold text-bone">Join</span>
          </Link>
        )}
        <div className="flex flex-col gap-2">
          <span className="label border-b border-rule pb-2 text-faint">HEAD TO HEAD</span>
          {seats.length ? seats.map((s) => (
            <div key={s.code} className="flex items-center justify-between py-1.5">
              <span className="text-[17px] text-bone">{s.hisName ?? `Room ${s.code}`}</span>
              <Link href={`/v/${s.code}`} className="py-2 text-[15px] text-bone no-underline">Play again</Link>
            </div>
          )) : <span className="text-[13px] text-dim">No rooms yet on this phone.</span>}
          <span className="text-[13px] text-dim">A rematch keeps the room and draws a new board.</span>
        </div>
        {name && <span className="text-[13px] text-faint">You play as {name}. <button type="button" onClick={() => setAskName(() => () => {})} className="border-0 bg-transparent p-0 text-[13px] underline" style={{ color: "var(--link)" }}>Change</button></span>}
      </main>
      <TabBar invite={!!invite} />
      <NamePrompt open={askName !== null} initial={name} onClose={() => setAskName(null)} onDone={(n) => { device.setName(n); setName(n); const then = askName; setAskName(null); then?.(n); }} />
    </Screen>
  );
}
