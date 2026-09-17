// A campaign is data: three enemy run strings, a ground and a battle seed each (docs/mvp-plan.md §4).
// Phase A derives it from a seed on the client; Phase B serves the same object from a `dailies` row.

import { mulberry32, type Engine, type TerrainName } from "@warlord/engine";

export const TERRAINS: readonly TerrainName[] = ["plains", "hills", "forest", "river"];
export const BATTLES_PER_CAMPAIGN = 3;

export interface CampaignBattleSpec {
  /** The enemy's draft as a run string; rebuilt with replayDraft. */
  foe: string;
  terrain: TerrainName;
  battleSeed: number;
}
export interface CampaignSpec {
  /** Daily date key, or `free-<seed>`. */
  id: string;
  seed: number;
  battles: CampaignBattleSpec[];
}

/** Deterministic: the same seed gives the same three generals, grounds and battle seeds on every device. */
export function campaignFromSeed(engine: Engine, seed: number, id: string): CampaignSpec {
  const rng = mulberry32(seed ^ 0x2545f491);
  const grounds = [...TERRAINS];
  const battles: CampaignBattleSpec[] = [];
  for (let i = 0; i < BATTLES_PER_CAMPAIGN; i++) {
    const foeSeed = rng.int(2147483647);
    const terrain = grounds.splice(rng.int(grounds.length), 1)[0];
    const battleSeed = rng.int(2147483647);
    const foe = engine.toRunString(engine.aiDraftState(foeSeed, "greedy"));
    battles.push({ foe, terrain, battleSeed });
  }
  return { id, seed, battles };
}
