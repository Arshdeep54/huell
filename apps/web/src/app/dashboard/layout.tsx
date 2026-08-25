import { eq } from "drizzle-orm";
import { db, schema } from "@doctor/db";
import { requireSession } from "@/lib/session";
import { getGithubAppConfig } from "@/lib/github-app";
import { AppSidebar } from "@/components/app-sidebar";
import { Breadcrumb } from "@/components/breadcrumb";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  const orgDomain = process.env.ORG_DOMAIN ?? "your-org.com";

  const projects = session.user.isOrgAdmin
    ? db.select({ slug: schema.projects.slug, name: schema.projects.name }).from(schema.projects).all()
    : db
        .select({ slug: schema.projects.slug, name: schema.projects.name })
        .from(schema.projectMembers)
        .innerJoin(schema.projects, eq(schema.projectMembers.projectId, schema.projects.id))
        .where(eq(schema.projectMembers.memberId, session.user.id))
        .all();

  const githubConnected = getGithubAppConfig() !== null;

  return (
    <div style={{ minHeight: "100vh", display: "grid", gridTemplateColumns: "250px 1fr" }}>
      <AppSidebar
        user={session.user}
        isOrgAdmin={session.user.isOrgAdmin}
        orgDomain={orgDomain}
        projects={projects}
        githubConnected={githubConnected}
      />
      <main style={{ minWidth: 0 }}>
        <div
          style={{
            height: 56,
            borderBottom: "1px solid var(--line)",
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "0 32px",
            background: "var(--bg)",
            position: "sticky",
            top: 0,
            zIndex: 5,
          }}
        >
          <Breadcrumb orgDomain={orgDomain} projects={projects} />
        </div>
        <div style={{ padding: "34px 32px 72px" }}>{children}</div>
      </main>
    </div>
  );
}
