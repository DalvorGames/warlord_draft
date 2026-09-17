// Route-handler plumbing: parse the body, find the seat by token, settle the clock, apply, save, answer with the
// seat's view. Every mutation goes through `mutate`, so settle runs before every change and every read.

import { NextResponse } from "next/server";
import { RoomError, seatOf, settle, viewFor, type Room, type RoomView, type Seat } from "./room";
import { roomStore } from "./store";
import { serverEngine } from "./serverEngine";

export const TOKEN_HEADER = "x-room-token";

export async function body(req: Request): Promise<Record<string, unknown>> {
  try { return ((await req.json()) as Record<string, unknown>) ?? {}; } catch { return {}; }
}

export function fail(e: unknown): NextResponse {
  if (e instanceof RoomError) return NextResponse.json({ error: e.message }, { status: e.status });
  console.error(e);
  return NextResponse.json({ error: "something went wrong on the server" }, { status: 500 });
}

export function reply(view: RoomView, extra: Record<string, unknown> = {}): NextResponse {
  return NextResponse.json({ ...extra, view }, { headers: { "Cache-Control": "no-store" } });
}

/** Read the room for the caller's seat, settling deadlines first (and saving them if any fired). */
export async function read(code: string, token: string | null): Promise<{ room: Room; seat: Seat; view: RoomView }> {
  const engine = serverEngine();
  const store = roomStore();
  const now = Date.now();
  let room = await store.get(code.toUpperCase());
  if (!room) throw new RoomError("no such room", 404);
  const seat = seatOf(room, token);
  if (!seat) throw new RoomError("not your room", 403);
  // One write at most: settle the clock and record the heartbeat together, and skip it when nothing moved and
  // the seat was seen in the last five seconds (a poll every two seconds would otherwise write every time).
  const settled = settle(engine, room, now);
  const fresh = now - room[seat]!.lastSeenAt < 5000;
  if (settled !== room || !fresh) room = await store.update(room.code, (cur) => { const s = settle(engine, cur, now); return { ...s, [seat]: { ...s[seat]!, lastSeenAt: now } }; });
  return { room, seat, view: viewFor(engine, room, seat, now) };
}

/** Apply a transition for the caller's seat. `fn` gets the settled room. */
export async function mutate(code: string, token: string | null, fn: (room: Room, seat: Seat, now: number) => Room): Promise<{ room: Room; seat: Seat; view: RoomView }> {
  const engine = serverEngine();
  const store = roomStore();
  const now = Date.now();
  const existing = await store.get(code.toUpperCase());
  if (!existing) throw new RoomError("no such room", 404);
  const seat = seatOf(existing, token);
  if (!seat) throw new RoomError("not your room", 403);
  const room = await store.update(existing.code, (cur) => {
    const settled = settle(engine, cur, now);
    const next = fn(settled, seat, now);
    return settle(engine, { ...next, [seat]: { ...next[seat]!, lastSeenAt: now } }, now);
  });
  return { room, seat, view: viewFor(engine, room, seat, now) };
}
