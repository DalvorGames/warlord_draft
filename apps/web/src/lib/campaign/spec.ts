// A campaign is data: the engine derives it from a seed (packages/engine/src/campaign.ts). Phase B will serve
// the same object from a `dailies` row.
import type { CampaignBattleSpec, CampaignSpec, Engine } from "@warlord/engine";

export type { CampaignBattleSpec, CampaignSpec };
export const BATTLES_PER_CAMPAIGN = 3;

export function campaignFromSeed(engine: Engine, seed: number, id: string): CampaignSpec {
  return engine.campaign(seed, id);
}
