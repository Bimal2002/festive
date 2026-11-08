// Lists the real recordings in public/sounds/diwali/ so the app only requests
// files that exist (no 404s). Runs automatically before `dev` and `build`.
import { readdirSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const dir = join(process.cwd(), "public", "sounds", "diwali");
if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
const files = readdirSync(dir)
  .filter((f) => f.toLowerCase().endsWith(".mp3"))
  .map((f) => f.slice(0, -4))
  .sort();
writeFileSync(join(dir, "manifest.json"), JSON.stringify({ files }, null, 2) + "\n");
console.log(`[sounds] ${files.length} recording(s) found${files.length ? ": " + files.join(", ") : " — using synthesized audio"}`);
