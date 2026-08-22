import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { db } from "./client";

migrate(db, { migrationsFolder: new URL("../migrations", import.meta.url).pathname });
console.log("Migrations applied.");
