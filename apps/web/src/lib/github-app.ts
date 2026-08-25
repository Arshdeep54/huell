import { readFileSync } from "node:fs";
import { eq } from "drizzle-orm";
import { db, schema } from "@huell/db";

export type GithubAppConfig = {
  appId: number;
  slug: string;
  clientId: string;
  clientSecret: string;
  webhookSecret: string;
  privateKey: string;
};

export function getGithubAppConfig(): GithubAppConfig | null {
  const row = db.select().from(schema.githubAppConfig).where(eq(schema.githubAppConfig.id, "1")).get();
  if (row) {
    return {
      appId: row.appId,
      slug: row.slug,
      clientId: row.clientId,
      clientSecret: row.clientSecret,
      webhookSecret: row.webhookSecret,
      privateKey: row.privateKey,
    };
  }

  const { GITHUB_APP_ID, GITHUB_APP_SLUG, GITHUB_APP_CLIENT_ID, GITHUB_APP_CLIENT_SECRET, GITHUB_WEBHOOK_SECRET, GITHUB_APP_PRIVATE_KEY_PATH } =
    process.env;
  if (
    !GITHUB_APP_ID ||
    !GITHUB_APP_SLUG ||
    !GITHUB_APP_CLIENT_ID ||
    !GITHUB_APP_CLIENT_SECRET ||
    !GITHUB_WEBHOOK_SECRET ||
    !GITHUB_APP_PRIVATE_KEY_PATH
  ) {
    return null;
  }

  return {
    appId: Number(GITHUB_APP_ID),
    slug: GITHUB_APP_SLUG,
    clientId: GITHUB_APP_CLIENT_ID,
    clientSecret: GITHUB_APP_CLIENT_SECRET,
    webhookSecret: GITHUB_WEBHOOK_SECRET,
    privateKey: readFileSync(GITHUB_APP_PRIVATE_KEY_PATH, "utf-8"),
  };
}
