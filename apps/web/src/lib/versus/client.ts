"use client";
// The browser side of a room: the device's seats, the API calls, and a polling hook (docs/versus-plan.md §6).

import { useCallback, useEffect, useRef, useState } from "react";
import type { Front, PlanName } from "@warlord/engine";
import type { RoomView, Seat } from "./room";

export interface DeviceSeat { code: string; seat: Seat; token: string; hisName?: string; updatedAt: number }

const SEATS_KEY = "wd.rooms.v1";
const NAME_KEY = "wd.name.v1";

function readJson<T>(key: string, fallback: T): T {
  try { const raw = localStorage.getItem(key); return raw ? (JSON.parse(raw) as T) : fallback; } catch { return fallback; }
}
function writeJson(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* private mode */ }
}

export const device = {
  seats: (): DeviceSeat[] => readJson<DeviceSeat[]>(SEATS_KEY, []),
  seat: (code: string): DeviceSeat | null => device.seats().find((s) => s.code === code.toUpperCase()) ?? null,
  remember: (s: DeviceSeat) => writeJson(SEATS_KEY, [s, ...device.seats().filter((x) => x.code !== s.code)].slice(0, 20)),
  forget: (code: string) => writeJson(SEATS_KEY, device.seats().filter((x) => x.code !== code)),
  name: (): string => { try { return localStorage.getItem(NAME_KEY) ?? ""; } catch { return ""; } },
  setName: (name: string) => { try { localStorage.setItem(NAME_KEY, name.trim().slice(0, 16)); } catch { /* ignore */ } },
};

export class ApiError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

async function call<T>(path: string, init: RequestInit, token?: string | null): Promise<T> {
  const res = await fetch(`/api/rooms${path}`, { ...init, headers: { "content-type": "application/json", ...(token ? { "x-room-token": token } : {}) }, cache: "no-store" });
  const body = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new ApiError(body.error ?? `request failed (${res.status})`, res.status);
  return body as T;
}
type Reply = { view: RoomView };
type SeatReply = Reply & { code: string; token: string; seat: Seat };

export const api = {
  create: (name: string) => call<SeatReply>("", { method: "POST", body: JSON.stringify({ name }) }),
  join: (code: string, name: string, token?: string | null) => call<SeatReply>(`/${code}/join`, { method: "POST", body: JSON.stringify({ name }) }, token),
  get: (code: string, token: string) => call<Reply>(`/${code}`, { method: "GET" }, token),
  ready: (code: string, token: string, ready = true) => call<Reply>(`/${code}/ready`, { method: "POST", body: JSON.stringify({ ready }) }, token),
  pick: (code: string, token: string, action: { general: number } | { card: number } | { reroll: true }) => call<Reply>(`/${code}/pick`, { method: "POST", body: JSON.stringify(action) }, token),
  line: (code: string, token: string, input: { plan?: PlanName; deployment?: (Front | null)[]; locked?: boolean }) => call<Reply>(`/${code}/line`, { method: "POST", body: JSON.stringify(input) }, token),
  presence: (code: string, token: string, input: { beat?: number; done?: boolean }) => call<Reply>(`/${code}/presence`, { method: "POST", body: JSON.stringify(input) }, token),
  claim: (code: string, token: string) => call<Reply>(`/${code}/claim`, { method: "POST", body: "{}" }, token),
  rematch: (code: string, token: string) => call<Reply>(`/${code}/rematch`, { method: "POST", body: "{}" }, token),
  leave: (code: string, token: string) => call<Reply>(`/${code}/leave`, { method: "POST", body: "{}" }, token),
};

/** Poll a room this device holds a seat in. `everyMs` is the poll interval; the heartbeat rides on the read. */
export function useRoom(code: string | null, everyMs = 2000) {
  const [view, setView] = useState<RoomView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0); // server now − client now
  const seatRef = useRef<DeviceSeat | null>(null);
  const apply = useCallback((v: RoomView) => {
    setView(v);
    setOffset(v.now - Date.now());
    setError(null);
  }, []);
  useEffect(() => {
    if (!code) return;
    seatRef.current = device.seat(code);
    if (!seatRef.current) { setError("no seat"); return; }
    let alive = true;
    const tick = async () => {
      try { const r = await api.get(seatRef.current!.code, seatRef.current!.token); if (alive) apply(r.view); }
      catch (e) { if (alive) setError(e instanceof Error ? e.message : String(e)); }
    };
    tick();
    const id = setInterval(tick, everyMs);
    return () => { alive = false; clearInterval(id); };
  }, [code, everyMs, apply]);
  /** Run an action and apply the view it returns. */
  const act = useCallback(async (fn: (code: string, token: string) => Promise<Reply>) => {
    const s = seatRef.current;
    if (!s) throw new ApiError("no seat", 403);
    const r = await fn(s.code, s.token);
    apply(r.view);
    return r.view;
  }, [apply]);
  const serverNow = useCallback(() => Date.now() + offset, [offset]);
  return { view, error, act, apply, serverNow };
}

/** m:ss for a countdown, never below zero. */
export function countdown(deadline: number | null, now: number): { text: string; ms: number } {
  if (deadline === null) return { text: "", ms: 0 };
  const ms = Math.max(0, deadline - now);
  const s = Math.ceil(ms / 1000);
  return { text: `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`, ms };
}

/** A ticking clock in server time, once a second. */
export function useServerClock(serverNow: () => number): number {
  const [now, setNow] = useState(() => serverNow());
  useEffect(() => {
    const id = setInterval(() => setNow(serverNow()), 250);
    return () => clearInterval(id);
  }, [serverNow]);
  return now;
}
