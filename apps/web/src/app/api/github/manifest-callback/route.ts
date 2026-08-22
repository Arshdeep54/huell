import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@doctor/db";
import { requireOrgAdmin } from "@/lib/session";

export async function GET(request: NextRequest) {
  await requireOrgAdmin();

  const code = request.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.redirect(new URL("/dashboard/settings/github?error=missing_code", request.url));
  }

  const response = await fetch(`https://api.github.com/app-manifests/${code}/conversions`, {
    method: "POST",
    headers: { Accept: "application/vnd.github+json" },
  });

  if (!response.ok) {
    return NextResponse.redirect(new URL("/dashboard/settings/github?error=exchange_failed", request.url));
  }

  const app = (await response.json()) as {
    id: number;
    slug: string;
    client_id: string;
    client_secret: string;
    webhook_secret: string;
    pem: string;
  };

  db.insert(schema.githubAppConfig)
    .values({
      id: "1",
      appId: app.id,
      slug: app.slug,
      clientId: app.client_id,
      clientSecret: app.client_secret,
      webhookSecret: app.webhook_secret,
      privateKey: app.pem,
      createdAt: new Date(),
    })
    .onConflictDoUpdate({
      target: schema.githubAppConfig.id,
      set: {
        appId: app.id,
        slug: app.slug,
        clientId: app.client_id,
        clientSecret: app.client_secret,
        webhookSecret: app.webhook_secret,
        privateKey: app.pem,
      },
    })
    .run();

  return NextResponse.redirect(new URL("/dashboard/settings/github", request.url));
}
