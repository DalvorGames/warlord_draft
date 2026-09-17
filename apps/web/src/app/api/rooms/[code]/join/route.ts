import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { RoomError, joinRoom, seatOf, settle, viewFor } from "@/lib/versus/room";
import { roomStore } from "@/lib/versus/store";
import { serverEngine } from "@/lib/versus/serverEngine";
import { TOKEN_HEADER, body, fail, reply } from "@/lib/versus/api";

export const runtime = "nodejs";

/** Take the guest seat. A device that already holds a seat gets its seat back instead. */
export async function POST(req: Request, ctx: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await ctx.params;
    const b = await body(req);
    const engine = serverEngine();
    const store = roomStore();
    const now = Date.now();
    const existing = await store.get(code.toUpperCase());
    if (!existing) throw new RoomError("no such room", 404);
    const mine = seatOf(existing, req.headers.get(TOKEN_HEADER));
    if (mine) return reply(viewFor(engine, existing, mine, now), { code: existing.code, token: existing[mine]!.token, seat: mine });
    const token = randomBytes(16).toString("hex");
    const room = await store.update(existing.code, (cur) => joinRoom(settle(engine, cur, now), token, typeof b.name === "string" ? b.name : undefined, now));
    return reply(viewFor(engine, room, "guest", now), { code: room.code, token, seat: "guest" });
  } catch (e) {
    if (e instanceof RoomError) return NextResponse.json({ error: e.message }, { status: e.status });
    return fail(e);
  }
}
