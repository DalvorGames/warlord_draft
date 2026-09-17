import { setReady } from "@/lib/versus/room";
import { serverEngine } from "@/lib/versus/serverEngine";
import { TOKEN_HEADER, body, fail, mutate, reply } from "@/lib/versus/api";

export const runtime = "nodejs";

export async function POST(req: Request, ctx: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await ctx.params;
    const b = await body(req);
    const { view } = await mutate(code, req.headers.get(TOKEN_HEADER), (room, seat, now) => setReady(serverEngine(), room, seat, b.ready !== false, now));
    return reply(view);
  } catch (e) { return fail(e); }
}
