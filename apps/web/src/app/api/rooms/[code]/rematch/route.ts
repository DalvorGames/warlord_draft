import { rematch } from "@/lib/versus/room";
import { TOKEN_HEADER, fail, mutate, reply } from "@/lib/versus/api";

export const runtime = "nodejs";

export async function POST(req: Request, ctx: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await ctx.params;
    const { view } = await mutate(code, req.headers.get(TOKEN_HEADER), (room, seat, now) => rematch(room, seat, now));
    return reply(view);
  } catch (e) { return fail(e); }
}
