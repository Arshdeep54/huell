import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@doctor/db";
import { requireSession } from "@/lib/session";
import { hasProjectRole } from "@/lib/permissions";
import { getGithubAppConfig } from "@/lib/github-app";

export async function GET(request: NextRequest) {
  const session = await requireSession();
  const projectSlug = request.nextUrl.searchParams.get("project");
  if (!projectSlug) return new NextResponse("Missing project", { status: 400 });

  const project = db.select().from(schema.projects).where(eq(schema.projects.slug, projectSlug)).get();
  if (!project) return new NextResponse("Project not found", { status: 404 });

  if (!hasProjectRole(session.user.id, project.id, "owner", session.user.isOrgAdmin)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const config = getGithubAppConfig();
  if (!config) {
    return NextResponse.redirect(new URL("/dashboard/settings/github", process.env.DASHBOARD_URL));
  }

  const installUrl = new URL(`https://github.com/apps/${config.slug}/installations/new`);
  installUrl.searchParams.set("state", project.id);
  return NextResponse.redirect(installUrl);
}
