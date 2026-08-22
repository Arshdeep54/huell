import { readFileSync } from "node:fs";
import { eq } from "drizzle-orm";

export interface GithubAppConfig {
  appId: number;
  slug: string;
  privateKey: string;
}

/**
 * Mirrors apps/web's github-app.ts — both read the same DB row / env fallback.
 * Imports @doctor/db dynamically so callers can load .env first (its module
 * body reads DATA_DIR at import time).
 */
export async function getGithubAppConfig(): Promise<GithubAppConfig | null> {
  const { db, schema } = await import("@doctor/db");
  const row = db.select().from(schema.githubAppConfig).where(eq(schema.githubAppConfig.id, "1")).get();
  if (row) return { appId: row.appId, slug: row.slug, privateKey: row.privateKey };

  const { GITHUB_APP_ID, GITHUB_APP_SLUG, GITHUB_APP_PRIVATE_KEY_PATH } = process.env;
  if (!GITHUB_APP_ID || !GITHUB_APP_SLUG || !GITHUB_APP_PRIVATE_KEY_PATH) return null;

  return {
    appId: Number(GITHUB_APP_ID),
    slug: GITHUB_APP_SLUG,
    privateKey: readFileSync(GITHUB_APP_PRIVATE_KEY_PATH, "utf-8"),
  };
}
