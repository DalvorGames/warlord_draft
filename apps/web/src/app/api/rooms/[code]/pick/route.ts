import { RoomError, applyPick, type PickAction } from "@/lib/versus/room";
import { serverEngine } from "@/lib/versus/serverEngine";
import { TOKEN_HEADER, body, fail, mutate, reply } from "@/lib/versus/api";

export const runtime = "nodejs";

/** `{ general: i }` · `{ card: i }` · `{ reroll: true }`, validated against the seat's step and the board. */
export async function POST(req: Request, ctx: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await ctx.params;
    const b = await body(req);
    let action: PickAction;
    if (typeof b.general === "number") action = { general: b.general };
    else if (typeof b.card === "number") action = { card: b.card };
    else if (b.reroll === true) action = { reroll: true };
    else throw new RoomError("say what to pick", 400);
    const { view } = await mutate(code, req.headers.get(TOKEN_HEADER), (room, seat, now) => {
      try { return applyPick(serverEngine(), room, seat, action, now); } catch (e) { throw e instanceof RoomError ? e : new RoomError(String((e as Error).message), 400); }
    });
    return reply(view);
  } catch (e) { return fail(e); }
}
