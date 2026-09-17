"use client";
// "A friend is waiting" (v3 §3.1): the newest open room this device holds a seat in where the other player is
// present and waiting. Asked once on load, then every 20 seconds while the tab screen is open.

import { useEffect, useState } from "react";
import { api, device } from "./client";
import type { RoomView } from "./room";

export interface Invite { code: string; hisName: string; left: string; view: RoomView }

function waitingOn(v: RoomView): boolean {
  if (!v.him) return false;
  if (v.status === "ready" && v.him.ready && !v.me.ready) return true;
  if ((v.status === "drafting" || v.status === "deploying") && v.him.dot !== "left") return true;
  return false;
}

export function useInvite(): Invite | null {
  const [invite, setInvite] = useState<Invite | null>(null);
  useEffect(() => {
    let alive = true;
    const look = async () => {
      const seats = device.seats().slice(0, 5);
      for (const s of seats) {
        try {
          const { view } = await api.get(s.code, s.token);
          if (view.him?.name) device.remember({ ...s, hisName: view.him.name, updatedAt: s.updatedAt });
          if (waitingOn(view)) {
            const mins = Math.max(0, Math.round((view.expiresAt - view.now) / 60000));
            const left = view.status === "ready" ? "READY TO START" : view.status === "waiting" ? `${mins} MIN LEFT` : "IN PLAY";
            if (alive) setInvite({ code: s.code, hisName: view.him!.name, left, view });
            return;
          }
        } catch { /* closed or gone */ }
      }
      if (alive) setInvite(null);
    };
    look();
    const id = setInterval(look, 20_000);
    return () => { alive = false; clearInterval(id); };
  }, []);
  return invite;
}
