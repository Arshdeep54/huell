import { existsSync } from "node:fs";
import path from "node:path";
import { notFound } from "next/navigation";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db, schema } from "@doctor/db";
import { requireSession } from "@/lib/session";
import { getProjectRole } from "@/lib/permissions";
import { formatRelativeTime } from "@/lib/format";
import {
  addProjectMember,
  disconnectProjectRepo,
  removeProjectMember,
  revokeInvite,
  triggerBuild,
  updateProjectSettings,
  uploadDocsZip,
  type AddProjectMemberState,
} from "@/lib/actions";
import { StatusDot, BuildRow } from "@/components/build-row";
import { BuildLog } from "@/components/build-log";
import { UploadDocsForm } from "@/components/upload-docs-form";
import { SubmitButton } from "@/components/submit-button";
import { AddProjectMemberForm } from "@/components/add-project-member-form";
import type { ProjectRole } from "@doctor/db";

const TABS = ["overview", "source", "builds", "members"] as const;
type Tab = (typeof TABS)[number];

function roleBadge(role: ProjectRole) {
  const styles: Record<ProjectRole, { fg: string; bg: string }> = {
    owner: { fg: "var(--ok)", bg: "var(--oksoft)" },
    editor: { fg: "var(--fg2)", bg: "var(--bg3)" },
    viewer: { fg: "var(--fg3)", bg: "var(--bg3)" },
  };
  const s = styles[role];
  return (
    <span
      style={{
        font: "500 10.5px/1 'IBM Plex Mono', monospace",
        color: s.fg,
        background: s.bg,
        padding: "4px 8px",
        borderRadius: 6,
      }}
    >
      {role}
    </span>
  );
}

function initialsOf(name: string) {
  return name
    .split(" ")
    .map((p) => p.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default async function ProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await requireSession();
  const { slug } = await params;
  const { tab: tabParam } = await searchParams;
  const tab: Tab = TABS.includes(tabParam as Tab) ? (tabParam as Tab) : "overview";

  const project = db.select().from(schema.projects).where(eq(schema.projects.slug, slug)).get();
  if (!project) notFound();

  const role = getProjectRole(session.user.id, project.id);
  if (!role && !session.user.isOrgAdmin) notFound();
  const canEdit = session.user.isOrgAdmin || role === "owner" || role === "editor";
  const canManageMembers = session.user.isOrgAdmin || role === "owner";
  const displayRole: ProjectRole = role ?? "owner";

  const members = db
    .select({ member: schema.members, role: schema.projectMembers.role })
    .from(schema.projectMembers)
    .innerJoin(schema.members, eq(schema.projectMembers.memberId, schema.members.id))
    .where(eq(schema.projectMembers.projectId, project.id))
    .all();

  const pendingInvites = db
    .select()
    .from(schema.invites)
    .where(and(eq(schema.invites.projectId, project.id), isNull(schema.invites.redeemedAt)))
    .all();

  const allBuilds = db
    .select()
    .from(schema.builds)
    .where(eq(schema.builds.projectId, project.id))
    .orderBy(desc(schema.builds.createdAt))
    .all();
  const totalBuildCount = allBuilds.length;
  const builds = allBuilds.slice(0, 20);
  const latestBuild = allBuilds[0];
  const latestSucceeded = allBuilds.find((b) => b.status === "succeeded");
  const dataDir = process.env.DATA_DIR ?? "./data";
  const hasPersistedUpload = existsSync(path.join(dataDir, "uploads", project.id, "docs.json"));
  const canRebuild = Boolean(project.repoFullName) || hasPersistedUpload;

  const orgDomain = process.env.ORG_DOMAIN ?? "example.com";
  const docsSubdomainSeparator = process.env.DOCS_SUBDOMAIN_SEPARATOR === "-" ? "-" : ".";
  const docsHost = `${project.slug}${docsSubdomainSeparator}docs.${orgDomain}`;
  const boundUpdateSettings = updateProjectSettings.bind(null, project.id);
  const boundAddMember = addProjectMember.bind(null, project.id);
  const boundTriggerBuild = triggerBuild.bind(null, project.id);
  const boundUploadDocsZip = uploadDocsZip.bind(null, project.id);
  const boundDisconnectRepo = disconnectProjectRepo.bind(null, project.id);

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 20,
          paddingBottom: 22,
          borderBottom: "1px solid var(--line)",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h1 style={{ margin: 0, font: "600 23px/1.15 'IBM Plex Sans', sans-serif", letterSpacing: "-0.015em" }}>
              {project.name}
            </h1>
            {roleBadge(displayRole)}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 9, flexWrap: "wrap" }}>
            <a
              href={`https://${docsHost}`}
              target="_blank"
              rel="noreferrer"
              style={{
                font: "400 12.5px/1 'IBM Plex Mono', monospace",
                display: "flex",
                alignItems: "center",
                gap: 7,
                color: "var(--acc)",
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: latestSucceeded ? "var(--ok)" : "var(--fg3)",
                }}
              />
              {docsHost}
            </a>
            <span style={{ font: "400 12px/1 'IBM Plex Mono', monospace", color: "var(--fg3)" }}>
              {latestSucceeded
                ? `${latestSucceeded.commitSha.slice(0, 7)} · deployed ${formatRelativeTime(latestSucceeded.createdAt)}`
                : "not built yet"}
            </span>
          </div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 9 }}>
          <a
            href={`https://${docsHost}`}
            target="_blank"
            rel="noreferrer"
            className="hover-fg3-line"
            style={{
              height: 34,
              padding: "0 13px",
              border: "1px solid var(--line2)",
              borderRadius: 9,
              background: "transparent",
              color: "var(--fg)",
              font: "500 12.5px/34px 'IBM Plex Sans', sans-serif",
            }}
          >
            Visit site
          </a>
          {canEdit && (
            <form action={boundTriggerBuild}>
              <SubmitButton
                disabled={!canRebuild}
                pendingLabel="Queuing…"
                className="hover-brighten"
                style={{
                  height: 34,
                  padding: "0 14px",
                  border: "none",
                  borderRadius: 9,
                  background: "var(--acc)",
                  color: "var(--accfg)",
                  font: "600 12.5px/1 'IBM Plex Sans', sans-serif",
                }}
              >
                Rebuild
              </SubmitButton>
            </form>
          )}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 12, marginTop: 20 }}>
        <StatCard label="SITE">
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              font: "500 13px/1 'IBM Plex Sans', sans-serif",
              color: latestSucceeded ? "var(--ok)" : "var(--fg3)",
            }}
          >
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "currentColor" }} />
            {latestSucceeded ? "live" : "no builds"}
          </span>
        </StatCard>
        <StatCard label="CURRENT BUILD">
          {latestBuild ? <StatusDot status={latestBuild.status} /> : <span style={{ color: "var(--fg3)" }}>—</span>}
        </StatCard>
        <StatCard label="SOURCE">
          <span
            style={{
              font: "400 12.5px/1 'IBM Plex Mono', monospace",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              display: "block",
            }}
          >
            {project.repoFullName ? `${project.repoFullName}@${project.branch}` : "docs.zip upload"}
          </span>
        </StatCard>
        <StatCard label="DOCS PATH">
          <span style={{ font: "400 12.5px/1 'IBM Plex Mono', monospace" }}>{project.docsPath}</span>
        </StatCard>
      </div>

      {tab === "overview" && (
        <OverviewTab
          project={project}
          canEdit={canEdit}
          latestBuild={latestBuild}
          builds={builds.slice(0, 3)}
          totalBuildCount={totalBuildCount}
          members={members}
          docsSubdomainSeparator={docsSubdomainSeparator}
        />
      )}

      {tab === "source" && (
        <SourceTab
          project={project}
          canEdit={canEdit}
          canManageMembers={canManageMembers}
          docsHost={docsHost}
          docsSubdomainSeparator={docsSubdomainSeparator}
          boundUpdateSettings={boundUpdateSettings}
          boundUploadDocsZip={boundUploadDocsZip}
          boundDisconnectRepo={boundDisconnectRepo}
        />
      )}

      {tab === "builds" && <BuildsTab builds={builds} totalBuildCount={totalBuildCount} />}

      {tab === "members" && (
        <MembersTab
          project={project}
          members={members}
          pendingInvites={pendingInvites}
          canManageMembers={canManageMembers}
          boundAddMember={boundAddMember}
          orgDomain={orgDomain}
        />
      )}
    </div>
  );
}

function StatCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ border: "1px solid var(--line)", borderRadius: 11, background: "var(--bg2)", padding: "13px 15px" }}>
      <div style={{ font: "500 10px/1 'IBM Plex Mono', monospace", letterSpacing: "0.1em", color: "var(--fg3)" }}>
        {label}
      </div>
      <div style={{ marginTop: 9 }}>{children}</div>
    </div>
  );
}

function Section({
  title,
  meta,
  right,
  children,
}: {
  title: string;
  meta?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section
      style={{
        border: "1px solid var(--line)",
        borderRadius: 14,
        background: "var(--bg2)",
        boxShadow: "var(--dc-shadow)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "16px 20px",
          borderBottom: "1px solid var(--line)",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <h2 style={{ margin: 0, font: "600 13.5px/1 'IBM Plex Sans', sans-serif" }}>{title}</h2>
        {meta && <span style={{ font: "400 11.5px/1 'IBM Plex Mono', monospace", color: "var(--fg3)" }}>{meta}</span>}
        {right && <div style={{ marginLeft: "auto" }}>{right}</div>}
      </div>
      {children}
    </section>
  );
}

function OverviewTab({
  project,
  canEdit,
  latestBuild,
  builds,
  totalBuildCount,
  members,
  docsSubdomainSeparator,
}: {
  project: typeof schema.projects.$inferSelect;
  canEdit: boolean;
  latestBuild?: typeof schema.builds.$inferSelect;
  builds: (typeof schema.builds.$inferSelect)[];
  totalBuildCount: number;
  members: { member: typeof schema.members.$inferSelect; role: ProjectRole }[];
  docsSubdomainSeparator: string;
}) {
  const owners = members.filter((m) => m.role === "owner").length;
  const editors = members.filter((m) => m.role === "editor").length;
  const viewers = members.filter((m) => m.role === "viewer").length;

  return (
    <div style={{ marginTop: 22, display: "grid", gridTemplateColumns: "minmax(0,1.45fr) minmax(300px,1fr)", gap: 22, alignItems: "start" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 22, minWidth: 0 }}>
        {latestBuild && (
          <section style={{ border: "1px solid var(--line)", borderRadius: 14, background: "var(--bg2)", boxShadow: "var(--dc-shadow)", padding: "18px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 11, flexWrap: "wrap" }}>
              <h2 style={{ margin: 0, font: "600 13.5px/1 'IBM Plex Sans', sans-serif" }}>Current build</h2>
              <StatusDot status={latestBuild.status} />
              <span style={{ marginLeft: "auto", font: "400 11.5px/1 'IBM Plex Mono', monospace", color: "var(--fg3)" }}>
                {formatRelativeTime(latestBuild.createdAt)}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
              <span style={{ font: "500 12.5px/1.4 'IBM Plex Mono', monospace" }}>{latestBuild.commitSha.slice(0, 7)}</span>
              <span style={{ font: "400 12.5px/1.4 'IBM Plex Sans', sans-serif", color: "var(--fg2)" }}>
                {latestBuild.source === "upload" ? "manual upload" : `push to ${project.branch}`}
              </span>
            </div>
            <div style={{ marginTop: 14 }}>
              <BuildLog buildId={latestBuild.id} initialStatus={latestBuild.status} initialLog={latestBuild.log} />
            </div>
          </section>
        )}

        <Section title="Recent builds" right={<a href={`?tab=builds`} className="hover-fg" style={{ color: "var(--acc)", font: "500 11.5px/1 'IBM Plex Sans', sans-serif" }}>All {totalBuildCount} builds</a>}>
          {builds.length === 0 ? (
            <p style={{ margin: 0, padding: "16px 20px", font: "400 12.5px/1.5 'IBM Plex Sans', sans-serif", color: "var(--fg3)" }}>
              No builds yet.
            </p>
          ) : (
            builds.map((b) => <BuildRow key={b.id} build={b} />)
          )}
        </Section>

        <section style={{ border: "1px solid var(--line)", borderRadius: 14, background: "var(--bg2)", boxShadow: "var(--dc-shadow)", padding: "17px 20px", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ font: "600 12.5px/1.3 'IBM Plex Sans', sans-serif" }}>
              Source: {project.repoFullName ?? "docs.zip upload"}
            </div>
            <div style={{ font: "400 11.5px/1.5 'IBM Plex Mono', monospace", color: "var(--fg3)", marginTop: 4 }}>
              {project.repoFullName ? `${project.branch} · ${project.docsPath}/` : "no repository connected"}
            </div>
          </div>
          <a
            href="?tab=source"
            className="hover-fg3-line"
            style={{
              height: 32,
              padding: "0 12px",
              border: "1px solid var(--line2)",
              borderRadius: 8,
              background: "transparent",
              color: "var(--fg)",
              font: "500 12px/32px 'IBM Plex Sans', sans-serif",
              flex: "none",
            }}
          >
            Source &amp; settings
          </a>
        </section>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 22, minWidth: 0 }}>
        <section style={{ border: "1px solid var(--line)", borderRadius: 14, background: "var(--bg2)", boxShadow: "var(--dc-shadow)", padding: "18px 19px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--ok)" }} />
            <h2 style={{ margin: 0, font: "600 13.5px/1 'IBM Plex Sans', sans-serif" }}>Live deployment</h2>
          </div>
          <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 11 }}>
            <Kv k="commit" v={latestBuild ? latestBuild.commitSha.slice(0, 7) : "—"} />
            <Kv
              k="built"
              v={latestBuild ? formatRelativeTime(latestBuild.createdAt) : "—"}
            />
            <Kv k="branch" v={project.branch} />
            <Kv k="docs subdomain" v={docsSubdomainSeparator === "-" ? "single-route" : "wildcard"} />
          </div>
          <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--line)", font: "400 11.5px/1.6 'IBM Plex Sans', sans-serif", color: "var(--fg2)" }}>
            A running build never takes the site down — the new output swaps in only after it succeeds.
          </div>
        </section>

        <Section title="Access" meta={`${members.length} members`}>
          <div style={{ padding: "14px 19px", display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ display: "flex" }}>
              {members.slice(0, 3).map((m, i) => (
                <div
                  key={m.member.id}
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: "50%",
                    background: "var(--bg3)",
                    color: "var(--fg2)",
                    display: "grid",
                    placeItems: "center",
                    font: "600 10px/1 'IBM Plex Mono', monospace",
                    border: "2px solid var(--bg2)",
                    marginLeft: i === 0 ? 0 : -8,
                  }}
                >
                  {initialsOf(m.member.name)}
                </div>
              ))}
            </div>
            <span style={{ font: "400 11.5px/1.4 'IBM Plex Mono', monospace", color: "var(--fg3)", minWidth: 0 }}>
              {owners} owner · {editors} editor · {viewers} viewer
            </span>
            <a
              href="?tab=members"
              className="hover-fg"
              style={{
                marginLeft: "auto",
                border: "1px solid var(--line2)",
                background: "transparent",
                color: "var(--fg2)",
                borderRadius: 8,
                font: "500 11.5px/1 'IBM Plex Sans', sans-serif",
                padding: "7px 10px",
                flex: "none",
              }}
            >
              Manage
            </a>
          </div>
        </Section>
      </div>
    </div>
  );
}

function Kv({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, font: "400 12px/1.4 'IBM Plex Mono', monospace" }}>
      <span style={{ color: "var(--fg3)" }}>{k}</span>
      <span>{v}</span>
    </div>
  );
}

function SourceTab({
  project,
  canEdit,
  canManageMembers,
  docsSubdomainSeparator,
  docsHost,
  boundUpdateSettings,
  boundUploadDocsZip,
  boundDisconnectRepo,
}: {
  project: typeof schema.projects.$inferSelect;
  canEdit: boolean;
  canManageMembers: boolean;
  docsSubdomainSeparator: string;
  docsHost: string;
  boundUpdateSettings: (formData: FormData) => Promise<void>;
  boundUploadDocsZip: (formData: FormData) => Promise<void>;
  boundDisconnectRepo: () => Promise<void>;
}) {
  return (
    <div style={{ marginTop: 22, maxWidth: 940 }}>
      {canEdit && docsSubdomainSeparator === "-" && (
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 22, padding: "14px 16px", border: "1px solid var(--line)", borderRadius: 11, background: "var(--bg3)" }}>
          <span style={{ font: "500 10px/1.6 'IBM Plex Mono', monospace", color: "var(--fg3)", letterSpacing: "0.08em", textTransform: "uppercase", flex: "none", paddingTop: 1 }}>
            one&#8209;time
          </span>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ font: "500 12.5px/1.4 'IBM Plex Sans', sans-serif" }}>
              This instance routes docs one subdomain at a time, so this host needs a DNS route once.
            </div>
            <div style={{ marginTop: 9, display: "flex", alignItems: "center", gap: 10, background: "var(--bg)", border: "1px solid var(--line)", borderRadius: 8, padding: "9px 11px" }}>
              <code style={{ font: "400 11.5px/1.4 'IBM Plex Mono', monospace", color: "var(--fg2)", overflowX: "auto", whiteSpace: "nowrap", flex: 1 }}>
                {`cloudflared tunnel route dns <your-tunnel-name> ${docsHost}`}
              </code>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
        <section style={{ border: "1px solid var(--line)", borderRadius: 14, background: "var(--bg2)", boxShadow: "var(--dc-shadow)", overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 10 }}>
            <h2 style={{ margin: 0, font: "600 13.5px/1 'IBM Plex Sans', sans-serif" }}>Source</h2>
            <span style={{ font: "400 11.5px/1 'IBM Plex Mono', monospace", color: "var(--fg3)" }}>where the docs come from</span>
          </div>
          <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
            {project.repoFullName ? (
              <div style={{ border: "1px solid var(--accline)", borderRadius: 12, background: "var(--bg3)", padding: "16px 17px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 11, flexWrap: "wrap" }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--ok)" }} />
                  <span style={{ font: "500 13.5px/1 'IBM Plex Mono', monospace" }}>{project.repoFullName}</span>
                  <span style={{ font: "500 10.5px/1 'IBM Plex Mono', monospace", color: "var(--acc)", background: "var(--accsoft)", padding: "4px 8px", borderRadius: 6 }}>
                    active source
                  </span>
                </div>
                {canEdit && (
                  <form action={boundUpdateSettings}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 16 }}>
                      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <span style={{ font: "500 11px/1 'IBM Plex Mono', monospace", color: "var(--fg3)", letterSpacing: "0.04em" }}>BRANCH</span>
                        <input
                          name="branch"
                          defaultValue={project.branch}
                          style={{ height: 34, borderRadius: 8, border: "1px solid var(--line2)", background: "var(--bg)", color: "var(--fg)", padding: "0 11px", font: "400 12.5px/1 'IBM Plex Mono', monospace" }}
                        />
                      </label>
                      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <span style={{ font: "500 11px/1 'IBM Plex Mono', monospace", color: "var(--fg3)", letterSpacing: "0.04em" }}>DOCS PATH</span>
                        <input
                          name="docsPath"
                          defaultValue={project.docsPath}
                          style={{ height: 34, borderRadius: 8, border: "1px solid var(--line2)", background: "var(--bg)", color: "var(--fg)", padding: "0 11px", font: "400 12.5px/1 'IBM Plex Mono', monospace" }}
                        />
                      </label>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 15 }}>
                      <SubmitButton
                        pendingLabel="Saving…"
                        className="hover-brighten"
                        style={{ height: 32, padding: "0 13px", border: "none", borderRadius: 8, background: "var(--acc)", color: "var(--accfg)", font: "600 12px/1 'IBM Plex Sans', sans-serif" }}
                      >
                        Save
                      </SubmitButton>
                    </div>
                  </form>
                )}
                {canManageMembers && (
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
                    <a href={`/api/github/install?project=${project.slug}`} className="hover-fg" style={{ height: 32, padding: "0 12px", border: "1px solid var(--line2)", borderRadius: 8, background: "transparent", color: "var(--fg2)", font: "500 12px/32px 'IBM Plex Sans', sans-serif" }}>
                      Change repo
                    </a>
                    <form action={boundDisconnectRepo} style={{ marginLeft: "auto" }}>
                      <button type="submit" className="hover-bad" style={{ border: "none", background: "transparent", color: "var(--fg3)", font: "500 11.5px/1 'IBM Plex Sans', sans-serif" }}>
                        Disconnect
                      </button>
                    </form>
                  </div>
                )}
              </div>
            ) : (
              canManageMembers && (
                <a
                  href={`/api/github/install?project=${project.slug}`}
                  className="hover-fg3-line"
                  style={{
                    display: "inline-flex",
                    height: 34,
                    padding: "0 14px",
                    border: "1px solid var(--line2)",
                    borderRadius: 9,
                    background: "transparent",
                    color: "var(--fg)",
                    font: "500 12.5px/34px 'IBM Plex Sans', sans-serif",
                    alignSelf: "flex-start",
                  }}
                >
                  Connect repository
                </a>
              )
            )}

            {canEdit && (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ height: 1, background: "var(--line)", flex: 1 }} />
                  <span style={{ font: "500 10px/1 'IBM Plex Mono', monospace", color: "var(--fg3)", letterSpacing: "0.12em" }}>
                    OR REPLACE WITH AN UPLOAD
                  </span>
                  <span style={{ height: 1, background: "var(--line)", flex: 1 }} />
                </div>

                <UploadDocsForm action={boundUploadDocsZip} />
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function BuildsTab({ builds, totalBuildCount }: { builds: (typeof schema.builds.$inferSelect)[]; totalBuildCount: number }) {
  return (
    <div style={{ marginTop: 22, maxWidth: 1040 }}>
      <Section title="Build history" meta={`last ${builds.length} builds`}>
        {builds.length === 0 ? (
          <p style={{ margin: 0, padding: "16px 20px", font: "400 12.5px/1.5 'IBM Plex Sans', sans-serif", color: "var(--fg3)" }}>
            No builds yet.
          </p>
        ) : (
          builds.map((b, i) => <BuildRow key={b.id} build={b} defaultExpanded={i === 0 && (b.status === "running" || b.status === "queued")} />)
        )}
        <div style={{ padding: "12px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ font: "400 11px/1 'IBM Plex Mono', monospace", color: "var(--fg3)" }}>
            showing {builds.length} of {totalBuildCount} builds
          </span>
        </div>
      </Section>
    </div>
  );
}

function MembersTab({
  project,
  members,
  pendingInvites,
  canManageMembers,
  boundAddMember,
  orgDomain,
}: {
  project: typeof schema.projects.$inferSelect;
  members: { member: typeof schema.members.$inferSelect; role: ProjectRole }[];
  pendingInvites: (typeof schema.invites.$inferSelect)[];
  canManageMembers: boolean;
  boundAddMember: (prevState: AddProjectMemberState, formData: FormData) => Promise<AddProjectMemberState>;
  orgDomain: string;
}) {
  return (
    <div style={{ marginTop: 22, maxWidth: 640 }}>
      <Section title="Project members" meta={String(members.length)}>
        <div>
          {members.map(({ member, role }) => {
            const styles: Record<ProjectRole, { fg: string; bg: string }> = {
              owner: { fg: "var(--acc)", bg: "var(--accsoft)" },
              editor: { fg: "var(--fg2)", bg: "var(--bg3)" },
              viewer: { fg: "var(--fg3)", bg: "var(--bg3)" },
            };
            const s = styles[role];
            return (
              <div key={member.id} style={{ display: "flex", alignItems: "center", gap: 11, padding: "12px 19px", borderBottom: "1px solid var(--line)" }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--bg3)", color: "var(--fg2)", display: "grid", placeItems: "center", font: "600 10.5px/1 'IBM Plex Mono', monospace", flex: "none" }}>
                  {initialsOf(member.name)}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ font: "500 12.5px/1.2 'IBM Plex Sans', sans-serif", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {member.name}
                  </div>
                  <div style={{ font: "400 10.5px/1.4 'IBM Plex Mono', monospace", color: "var(--fg3)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {member.email}
                  </div>
                </div>
                <span style={{ font: "500 10.5px/1 'IBM Plex Mono', monospace", color: s.fg, background: s.bg, padding: "4px 8px", borderRadius: 6, flex: "none" }}>
                  {role}
                </span>
                {canManageMembers && (
                  <form action={removeProjectMember.bind(null, project.id, member.id)}>
                    <button type="submit" className="hover-bad" style={{ border: "none", background: "transparent", color: "var(--fg3)", font: "500 11.5px/1 'IBM Plex Sans', sans-serif" }}>
                      Remove
                    </button>
                  </form>
                )}
              </div>
            );
          })}
          {pendingInvites.map((invite) => (
            <div
              key={invite.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 11,
                padding: "12px 19px",
                borderBottom: "1px solid var(--line)",
                background: "var(--bg3)",
              }}
            >
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--acc)", flex: "none" }} />
              <div style={{ minWidth: 0, flex: 1, font: "400 12.5px/1.4 'IBM Plex Mono', monospace", color: "var(--fg2)" }}>
                {invite.email}
              </div>
              <span
                style={{
                  font: "500 10.5px/1 'IBM Plex Mono', monospace",
                  color: "var(--acc)",
                  background: "var(--accsoft)",
                  padding: "4px 8px",
                  borderRadius: 6,
                  flex: "none",
                }}
              >
                invite pending &#183; {invite.role}
              </span>
              <span style={{ font: "400 11px/1 'IBM Plex Mono', monospace", color: "var(--fg3)", flex: "none" }}>
                sent {formatRelativeTime(invite.createdAt)}
              </span>
              {canManageMembers && (
                <form action={revokeInvite}>
                  <input type="hidden" name="inviteId" value={invite.id} />
                  <button type="submit" className="hover-bad" style={{ border: "none", background: "transparent", color: "var(--fg3)", font: "500 11.5px/1 'IBM Plex Sans', sans-serif", flex: "none" }}>
                    Revoke
                  </button>
                </form>
              )}
            </div>
          ))}
        </div>
        {canManageMembers && (
          <AddProjectMemberForm action={boundAddMember} projectId={project.id} orgDomain={orgDomain} />
        )}
        <div style={{ padding: "0 19px 15px", font: "400 11px/1.6 'IBM Plex Mono', monospace", color: "var(--fg3)" }}>
          Org admins can act on this project regardless of membership.
        </div>
      </Section>
    </div>
  );
}
