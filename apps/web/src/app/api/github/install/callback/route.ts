import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@doctor/db";
import { requireSession } from "@/lib/session";

export async function GET(request: NextRequest) {
  await requireSession();

  const installationId = request.nextUrl.searchParams.get("installation_id");
  const projectId = request.nextUrl.searchParams.get("state");
  if (!installationId || !projectId) {
    return new NextResponse("Missing installation_id or state", { status: 400 });
  }

  const project = db.select().from(schema.projects).where(eq(schema.projects.id, projectId)).get();
  if (!project) return new NextResponse("Project not found", { status: 404 });

  db.insert(schema.githubInstallations)
    .values({
      id: randomUUID(),
      projectId,
      installationId: Number(installationId),
      createdAt: new Date(),
    })
    .onConflictDoUpdate({
      target: schema.githubInstallations.projectId,
      set: { installationId: Number(installationId) },
    })
    .run();

  return NextResponse.redirect(new URL(`/dashboard/projects/${project.slug}/select-repo`, process.env.DASHBOARD_URL));
}
