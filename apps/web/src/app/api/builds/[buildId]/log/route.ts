import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@doctor/db";
import { requireSession } from "@/lib/session";
import { getProjectRole } from "@/lib/permissions";

export async function GET(_request: Request, { params }: { params: Promise<{ buildId: string }> }) {
  const session = await requireSession();
  const { buildId } = await params;

  const build = db.select().from(schema.builds).where(eq(schema.builds.id, buildId)).get();
  if (!build) return new NextResponse("Not found", { status: 404 });

  const role = getProjectRole(session.user.id, build.projectId);
  if (!role && !session.user.isOrgAdmin) return new NextResponse("Not found", { status: 404 });

  return NextResponse.json({ status: build.status, log: build.log ?? "" });
}
