// Where a duel's step lives in the run screens (docs/versus-plan.md §6.2).
import type { RoomView } from "./room";

export function routeForDuel(v: RoomView): string {
  const step = v.me.step;
  if (v.status === "ready" || v.status === "waiting" || v.status === "closed") return `/v/${v.code}`;
  if (step === "general") return "/general";
  if (step.startsWith("row-")) return `/draft/${Number(step.slice(4)) + 1}`;
  if (step === "drafted" || step === "line" || step === "locked") return "/deploy/1";
  if (step === "watching") return "/battle/1";
  return "/result";
}
