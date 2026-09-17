// The engine on the server, built once from the data the package ships. Same code and data as the browser.
import { createEngine, type Engine, type RawData } from "@warlord/engine";
import units from "@warlord/engine/data/units.json";
import generals from "@warlord/engine/data/generals.json";
import cultures from "@warlord/engine/data/cultures.json";
import rules from "@warlord/engine/data/rules.json";

let engine: Engine | null = null;
export function serverEngine(): Engine {
  if (!engine) engine = createEngine({ units, generals, cultures, rules } as unknown as RawData);
  return engine;
}
