import { setLine } from "@/lib/versus/room";
import { serverEngine } from "@/lib/versus/serverEngine";
import { TOKEN_HEADER, body, fail, mutate, reply } from "@/lib/versus/api";
import type { Front, PlanName } from "@warlord/engine";

export const runtime = "nodejs";

export async function POST(req: Request, ctx: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await ctx.params;
    const b = await body(req);
    const input = {
      plan: typeof b.plan === "string" ? (b.plan as PlanName) : undefined,
      deployment: Array.isArray(b.deployment) ? (b.deployment as (Front | null)[]) : undefined,
      locked: typeof b.locked === "boolean" ? b.locked : undefined,
    };
    const { view } = await mutate(code, req.headers.get(TOKEN_HEADER), (room, seat, now) => setLine(serverEngine(), room, seat, input, now));
    return reply(view);
  } catch (e) { return fail(e); }
}
