// A campaign is data (design/gdd/campaign.md): one seed fixes the board, three foes, three grounds, three battle
// seeds and each foe's line. The save stores only the player's inputs; everything else is recomputed from here.

import { mulberry32 } from "./rng.js";
import { startDraft, setDeployment, toArmy, toRunString } from "./draft.js";
import { greedyDraftState } from "./batch/drafters.js";
import { blindLine, FRONTS } from "./deploy.js";
import type { Front, GameData, TerrainName } from "./types.js";

export const TERRAINS: readonly TerrainName[] = ["plains", "hills", "forest", "river"];

export interface CampaignBattleSpec {
  /** The foe's draft as a run string, its line included (`dep=`); rebuild with replayDraft. */
  foe: string;
  terrain: TerrainName;
  battleSeed: number;
  /** The foe's line, chosen player-blind (deploy.ts `blindLine`). Same as the run string's `dep`. */
  line: Front[];
  /** 0, 1, 2: which difficulty band the foe was drawn from. */
  tier: number;
}
export interface CampaignSpec {
  /** Daily date key, or `free-<seed>`. */
  id: string;
  seed: number;
  dataVersion: number;
  battles: CampaignBattleSpec[];
}

const statSum = (s: { command: number; tactics: number; logistics: number; charisma: number }) => s.command + s.tactics + s.logistics + s.charisma;

/**
 * Deterministic: the same seed gives the same three generals, grounds, lines and battle seeds on every device.
 * Foes climb: battle i's general comes from `campaign.generalBands[i]` (summed stats) and its army from a greedy
 * draft under `costCeilings[i]`. No foe shares a general with another foe or with the seed's offered pool, so
 * the board stays shared whoever the player picks.
 */
export function campaignFromSeed(data: GameData, seed: number, id: string): CampaignSpec {
  const cfg = data.rules.campaign;
  const pool = new Set(startDraft(data, seed).generalPool);
  const rng = mulberry32(seed ^ 0x2545f491);
  const grounds = [...TERRAINS];
  const used = new Set<string>();
  const battles: CampaignBattleSpec[] = [];
  for (let i = 0; i < cfg.battles; i++) {
    const [lo, hi] = cfg.generalBands[i] ?? [0, 9999];
    const inBand = (gid: string) => { const g = data.generalById.get(gid)!; const s = statSum(g.stats); return s >= lo && s <= hi; };
    const legal = (gid: string) => !pool.has(gid) && !used.has(gid);
    const terrain = grounds.splice(rng.int(grounds.length), 1)[0];
    const battleSeed = rng.int(2147483647);
    let chosen: ReturnType<typeof greedyDraftState> | null = null;
    for (let attempt = 0; attempt < 60 && !chosen; attempt++) {
      const foeSeed = rng.int(2147483647);
      const strict = attempt < 50;
      const st = greedyDraftState(data, foeSeed, foeSeed ^ 0x9e3779b9, {
        budget: cfg.costCeilings[i] ?? null,
        chooseGeneral: (p) => { const k = p.findIndex((gid) => legal(gid) && (!strict || inBand(gid))); return k < 0 ? null : k; },
      });
      const gid = st.generalPool[st.generalIndex!];
      if (!legal(gid) || (strict && !inBand(gid))) continue;
      chosen = st;
      used.add(gid);
    }
    if (!chosen) throw new Error(`campaign ${id}: no foe for battle ${i + 1}`);
    const line = blindLine(data, toArmy(data, chosen), terrain, rng.fork());
    const withLine = setDeployment(chosen, line);
    battles.push({ foe: toRunString(withLine), terrain, battleSeed, line, tier: i });
  }
  return { id, seed, dataVersion: data.rules.dataVersion, battles };
}

/** Scouts: which of his fronts is heaviest, from the line he actually chose ("L", "C", "R" or a tie). */
export function heaviestFront(line: Front[]): { fronts: Front[]; count: number } {
  const counts = FRONTS.map((f) => line.filter((x) => x === f).length);
  const top = Math.max(...counts);
  return { fronts: FRONTS.filter((_, i) => counts[i] === top), count: top };
}
