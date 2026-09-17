// The persisted campaign: inputs only. Everything else (armies, battle results) is recomputed from these
// with the engine, so a save is small, deterministic and cannot carry a forged result.

import type { DraftState, Front, PlanName } from "@warlord/engine";
import type { CampaignSpec } from "./spec";

export type Stage = "general" | "draft" | "deploy" | "battle" | "between" | "result";

export interface BattlePlay {
  plan: PlanName | null;
  deployment: Front[] | null;
  /** Set once "Give battle" is pressed; the result is recomputed from inputs. */
  fought: boolean;
}

export interface CampaignSave {
  v: 1;
  kind: "daily" | "free";
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
  kind: "daily" | "free";
  general: string;
  won: number;
  played: number;
  lossPct: number;
  headline: string;
  finishedAt: string;
  /** Run strings, one per battle played, for sharing and later verification. */
  runs: string[];
}

const SAVE_KEY = "wd.campaign.v1";
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
  loadSave: () => read<CampaignSave>(SAVE_KEY),
  writeSave: (s: CampaignSave | null) => write(SAVE_KEY, s),
  loadHistory: () => read<HistoryEntry[]>(HISTORY_KEY) ?? [],
  pushHistory: (e: HistoryEntry) => {
    const h = [e, ...(read<HistoryEntry[]>(HISTORY_KEY) ?? []).filter((x) => x.id !== e.id)].slice(0, 50);
    write(HISTORY_KEY, h);
    return h;
  },
};
