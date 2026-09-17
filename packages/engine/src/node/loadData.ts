// Node-only: read the JSON files in ./data. Browser clients fetch the same files and call buildData().
import { readFileSync } from "node:fs";
import { buildData } from "../data.js";
import type { GameData } from "../types.js";

export function loadData(dir = new URL("../../data/", import.meta.url)): GameData {
  const read = (f: string) => JSON.parse(readFileSync(new URL(f, dir), "utf8"));
  return buildData({ units: read("units.json"), generals: read("generals.json"), cultures: read("cultures.json"), rules: read("rules.json") });
}
