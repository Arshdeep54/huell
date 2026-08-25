import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db, schema } from "@huell/db";
import { requireSession } from "@/lib/session";
import { formatRelativeTime } from "@/lib/format";

export default async function ProjectsPage() {
  const session = await requireSession();
  const orgDomain = process.env.ORG_DOMAIN ?? "example.com";
  const docsSubdomainSeparator = process.env.DOCS_SUBDOMAIN_SEPARATOR === "-" ? "-" : ".";

  const projects = session.user.isOrgAdmin
    ? db.select().from(schema.projects).all()
    : db
        .select({ project: schema.projects })
        .from(schema.projectMembers)
        .innerJoin(schema.projects, eq(schema.projectMembers.projectId, schema.projects.id))
        .where(eq(schema.projectMembers.memberId, session.user.id))
        .all()
        .map((row) => row.project);

  const rows = projects.map((project) => {
    const latestBuild = db
      .select()
      .from(schema.builds)
      .where(eq(schema.builds.projectId, project.id))
      .orderBy(desc(schema.builds.createdAt))
      .limit(1)
      .get();

    const status = !latestBuild
      ? "no builds"
      : latestBuild.status === "succeeded"
        ? "live"
        : latestBuild.status === "failed"
          ? "failed"
          : latestBuild.status;
    const accent = status === "live" ? "var(--ok)" : status === "failed" ? "var(--bad)" : "var(--fg3)";
    const detail = latestBuild
      ? `${latestBuild.commitSha.slice(0, 7)} · ${latestBuild.status}`
      : "not built yet";
    const when = latestBuild ? formatRelativeTime(latestBuild.createdAt) : "—";
    const host = `${project.slug}${docsSubdomainSeparator}docs.${orgDomain}`;

    return {
      ...project,
      sourceLabel: project.repoFullName ?? "docs.zip upload",
      host,
      status,
      accent,
      detail,
      when,
    };
  });

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 20, marginBottom: 26 }}>
        <div>
          <h1 style={{ margin: 0, font: "600 22px/1.2 'IBM Plex Sans', sans-serif", letterSpacing: "-0.015em" }}>
            Projects
          </h1>
          <p style={{ margin: "7px 0 0", font: "400 13px/1.5 'IBM Plex Sans', sans-serif", color: "var(--fg2)" }}>
            Every docs site this instance builds and serves.
          </p>
        </div>
        <Link
          href="/dashboard/projects/new"
          className="hover-brighten"
          style={{
            marginLeft: "auto",
            height: 36,
            padding: "0 15px",
            border: "none",
            borderRadius: 9,
            background: "var(--acc)",
            color: "var(--accfg)",
            font: "600 12.5px/36px 'IBM Plex Sans', sans-serif",
          }}
        >
          New project
        </Link>
      </div>

      {rows.length === 0 ? (
        <div
          style={{
            border: "1px dashed var(--line2)",
            borderRadius: 16,
            padding: "56px 40px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            gap: 8,
            background: "var(--bg2)",
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: "var(--bg3)",
              border: "1px solid var(--line)",
              display: "grid",
              placeItems: "center",
              color: "var(--fg3)",
              font: "600 15px/1 'IBM Plex Mono', monospace",
              marginBottom: 6,
            }}
          >
            +
          </div>
          <div style={{ font: "600 15px/1.3 'IBM Plex Sans', sans-serif" }}>No projects yet</div>
          <div
            style={{
              maxWidth: 420,
              font: "400 13px/1.6 'IBM Plex Sans', sans-serif",
              color: "var(--fg2)",
              textWrap: "pretty",
            }}
          >
            A project points at a docs source and gets its own subdomain. Connect a GitHub repo for rebuilds on
            every push, or upload a docs.zip if you&apos;d rather not connect GitHub at all.
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
            <Link
              href="/dashboard/projects/new"
              className="hover-brighten"
              style={{
                height: 34,
                padding: "0 14px",
                border: "none",
                borderRadius: 9,
                background: "var(--acc)",
                color: "var(--accfg)",
                font: "600 12.5px/34px 'IBM Plex Sans', sans-serif",
              }}
            >
              Create first project
            </Link>
            <Link
              href="/dashboard/settings/github"
              className="hover-fg3-line"
              style={{
                height: 34,
                padding: "0 14px",
                border: "1px solid var(--line2)",
                borderRadius: 9,
                background: "transparent",
                color: "var(--fg)",
                font: "500 12.5px/34px 'IBM Plex Sans', sans-serif",
              }}
            >
              Set up GitHub first
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div style={{ display: "grid", gap: 14 }}>
            {rows.map((p) => (
              <Link
                key={p.id}
                href={`/dashboard/projects/${p.slug}`}
                className="row-hover"
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(200px,1.6fr) minmax(88px,0.55fr) minmax(0,1.1fr) minmax(70px,0.5fr)",
                  alignItems: "center",
                  gap: 18,
                  textAlign: "left",
                  padding: "17px 20px",
                  border: "1px solid var(--line)",
                  borderLeft: `3px solid ${p.accent}`,
                  borderRadius: 12,
                  background: "var(--bg2)",
                  color: "var(--fg)",
                  boxShadow: "var(--dc-shadow)",
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
                    <span style={{ font: "600 14.5px/1.2 'IBM Plex Sans', sans-serif", flex: "none" }}>
                      {p.name}
                    </span>
                    <span
                      style={{
                        font: "400 11px/1 'IBM Plex Mono', monospace",
                        color: "var(--fg3)",
                        padding: "3px 6px",
                        borderRadius: 5,
                        background: "var(--bg3)",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        minWidth: 0,
                      }}
                    >
                      {p.sourceLabel}
                    </span>
                  </div>
                  <div
                    style={{
                      font: "400 11.5px/1.4 'IBM Plex Mono', monospace",
                      color: "var(--fg3)",
                      marginTop: 6,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {p.host}
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 7,
                    font: "500 11.5px/1 'IBM Plex Mono', monospace",
                    color: p.accent,
                    minWidth: 0,
                    whiteSpace: "nowrap",
                  }}
                >
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: "currentColor" }} />
                  {p.status}
                </div>
                <div
                  style={{
                    font: "400 11.5px/1.5 'IBM Plex Mono', monospace",
                    color: "var(--fg2)",
                    minWidth: 0,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {p.detail}
                </div>
                <div style={{ font: "400 11.5px/1 'IBM Plex Mono', monospace", color: "var(--fg3)", textAlign: "right" }}>
                  {p.when}
                </div>
              </Link>
            ))}
          </div>
          <p style={{ margin: "18px 0 0", font: "400 11.5px/1.6 'IBM Plex Mono', monospace", color: "var(--fg3)" }}>
            Rebuilds trigger on push to the configured branch. Org admins see every project.
          </p>
        </>
      )}
    </div>
  );
}
