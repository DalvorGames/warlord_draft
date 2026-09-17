// Build the engine package and copy its data files to public/data/v<dataVersion>/.
// Runs before `next dev` and `next build` so the app always ships the engine it imports.
import { execSync } from "node:child_process";
import { cpSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const engineDir = path.resolve(here, "../../../packages/engine");
execSync("npm run build", { cwd: engineDir, stdio: "inherit" });

const rules = JSON.parse(readFileSync(path.join(engineDir, "data/rules.json"), "utf8"));
const dest = path.resolve(here, `../public/data/v${rules.dataVersion}`);
rmSync(path.resolve(here, "../public/data"), { recursive: true, force: true });
mkdirSync(dest, { recursive: true });
for (const f of ["units.json", "generals.json", "cultures.json", "rules.json"]) {
  cpSync(path.join(engineDir, "data", f), path.join(dest, f));
}
console.log(`engine built; data v${rules.dataVersion} copied to public/data/v${rules.dataVersion}/`);
