import { TOKEN_HEADER, fail, read, reply } from "@/lib/versus/api";

export const runtime = "nodejs";

/** The room as this seat may see it, deadlines settled. Also the heartbeat: every read touches lastSeenAt. */
export async function GET(req: Request, ctx: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await ctx.params;
    const { view } = await read(code, req.headers.get(TOKEN_HEADER));
    return reply(view);
  } catch (e) { return fail(e); }
}
