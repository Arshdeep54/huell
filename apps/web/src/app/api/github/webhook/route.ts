import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { Webhooks } from "@octokit/webhooks";
import { eq } from "drizzle-orm";
import { db, schema } from "@huell/db";
import { getGithubAppConfig } from "@/lib/github-app";

export async function POST(request: NextRequest) {
  const config = getGithubAppConfig();
  if (!config) return new NextResponse("GitHub App not configured", { status: 503 });

  const body = await request.text();
  const signature = request.headers.get("x-hub-signature-256") ?? "";
  const event = request.headers.get("x-github-event") ?? "";

  const webhooks = new Webhooks({ secret: config.webhookSecret });
  const valid = await webhooks.verify(body, signature);
  if (!valid) return new NextResponse("Invalid signature", { status: 401 });

  if (event !== "push") return NextResponse.json({ ok: true });

  const payload = JSON.parse(body) as {
    ref: string;
    after: string;
    repository: { full_name: string };
  };
  const branch = payload.ref.replace("refs/heads/", "");

  const project = db
    .select()
    .from(schema.projects)
    .where(eq(schema.projects.repoFullName, payload.repository.full_name))
    .get();
  if (!project || project.branch !== branch) return NextResponse.json({ ok: true, skipped: true });

  db.insert(schema.builds)
    .values({
      id: randomUUID(),
      projectId: project.id,
      commitSha: payload.after,
      status: "queued",
      createdAt: new Date(),
    })
    .run();

  return NextResponse.json({ ok: true });
}
