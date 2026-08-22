import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

// tsx doesn't auto-load .env the way Next.js does — load the repo-root one
// ourselves when present (local dev); in Docker, env vars come from compose
// and this file won't exist, which is fine since it's an opt-in load.
const rootEnvPath = fileURLToPath(new URL("../../../.env", import.meta.url));
if (existsSync(rootEnvPath)) process.loadEnvFile(rootEnvPath);

const { db } = await import("./client");

migrate(db, { migrationsFolder: new URL("../migrations", import.meta.url).pathname });
console.log("Migrations applied.");
