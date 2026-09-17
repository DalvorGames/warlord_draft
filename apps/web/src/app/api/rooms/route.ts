import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { createRoom, newCode, viewFor } from "@/lib/versus/room";
import { roomStore, serverConfigured } from "@/lib/versus/store";
import { serverEngine } from "@/lib/versus/serverEngine";
import { body, fail, reply } from "@/lib/versus/api";

export const runtime = "nodejs";

/** Create a room: the caller takes the host seat and gets its token. */
export async function POST(req: Request) {
  try {
    if (!serverConfigured()) return NextResponse.json({ error: "the room server is not set up" }, { status: 503 });
    const b = await body(req);
    const engine = serverEngine();
    const store = roomStore();
    const now = Date.now();
    const token = randomBytes(16).toString("hex");
    let room = createRoom(engine, newCode(), token, typeof b.name === "string" ? b.name : undefined, now);
    for (let tries = 0; (await store.get(room.code)) && tries < 5; tries++) room = { ...room, code: newCode() };
    await store.insert(room);
    return reply(viewFor(engine, room, "host", now), { code: room.code, token, seat: "host" });
  } catch (e) { return fail(e); }
}
