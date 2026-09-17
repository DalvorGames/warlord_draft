// The persisted campaign: inputs only. Everything else (armies, battle results) is recomputed from these
// with the engine, so a save is small, deterministic and cannot carry a forged result.

import type { DraftState, Front, PlanName } from "@warlord/engine";
import type { CampaignSpec } from "./spec";

export type Stage = "general" | "draft" | "deploy" | "battle" | "between" | "result";

export interface BattlePlay {
  plan: PlanName | null;
  /** One entry per slot; null = not yet placed. All set before "Give battle". */
  deployment: (Front | null)[] | null;
  /** Set once "Give battle" is pressed; the result is recomputed from inputs. */
  fought: boolean;
}

/** A 1v1 room this save plays in (docs/versus-plan.md §6.2). */
export interface DuelRef {
  code: string;
  seat: "host" | "guest";
  token: string;
  matchNo: number;
}

export interface CampaignSave {
  v: 2;
  /** The engine data version the save was made with; a different one means the run cannot be replayed. */
  dataVersion: number;
  kind: "daily" | "free" | "duel";
  /** Present when kind is "duel": the room the server mirrors this save into. */
  duel?: DuelRef;
  spec: CampaignSpec;
  draft: DraftState;
  /** Draft row the player is looking at (phone: one row per screen). */
  row: number;
  battles: BattlePlay[];
  /** Index of the battle being prepared or watched. */
  battleIndex: number;
  stage: Stage;
  startedAt: string;
  finishedAt: string | null;
}

export interface HistoryEntry {
  id: string;
  kind: "daily" | "free" | "duel";
  general: string;
  won: number;
  played: number;
  lossPct: number;
  headline: string;
  finishedAt: string;
  /** Your shape in the last battle, "2·4·2", for the last-five cells. */
  shape?: string;
  /** Run strings, one per battle played, for sharing and later verification. */
  runs: string[];
}

const SAVE_KEY = "wd.campaign.v2";
const OLD_SAVE_KEYS = ["wd.campaign.v1"];
const HISTORY_KEY = "wd.history.v1";

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
function write(key: string, value: unknown) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* private mode or quota: the run still works in memory */
  }
}

export const storage = {
  /** The save, or null; `stale` when a save from another data version (or an older shape) had to be dropped. */
  loadSave: (dataVersion: number): { save: CampaignSave | null; stale: boolean } => {
    let stale = false;
    for (const k of OLD_SAVE_KEYS) if (localStorage.getItem(k)) { write(k, null); stale = true; }
    const s = read<CampaignSave>(SAVE_KEY);
    if (s && (s.v !== 2 || s.dataVersion !== dataVersion)) { write(SAVE_KEY, null); return { save: null, stale: true }; }
    return { save: s, stale };
  },
  writeSave: (s: CampaignSave | null) => write(SAVE_KEY, s),
  loadHistory: () => read<HistoryEntry[]>(HISTORY_KEY) ?? [],
  pushHistory: (e: HistoryEntry) => {
    const h = [e, ...(read<HistoryEntry[]>(HISTORY_KEY) ?? []).filter((x) => x.id !== e.id)].slice(0, 50);
    write(HISTORY_KEY, h);
    return h;
  },
};
