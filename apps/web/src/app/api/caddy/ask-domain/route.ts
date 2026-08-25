import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@huell/db";

// Caddy's on-demand TLS calls this before issuing a certificate for any
// hostname — without it, anyone could point DNS at this server and get a
// free cert issued for an arbitrary name. Only project subdomains that
// actually exist get a 200; everything else is refused.
export async function GET(request: NextRequest) {
  const domain = request.nextUrl.searchParams.get("domain");
  const orgDomain = process.env.ORG_DOMAIN;
  if (!domain || !orgDomain) return new NextResponse("Forbidden", { status: 403 });

  const separator = process.env.DOCS_SUBDOMAIN_SEPARATOR === "-" ? "-" : ".";
  const suffix = `${separator}docs.${orgDomain}`;
  if (!domain.endsWith(suffix)) return new NextResponse("Forbidden", { status: 403 });

  const slug = domain.slice(0, -suffix.length);
  const project = db.select().from(schema.projects).where(eq(schema.projects.slug, slug)).get();
  if (!project) return new NextResponse("Forbidden", { status: 403 });

  return new NextResponse("OK", { status: 200 });
}
