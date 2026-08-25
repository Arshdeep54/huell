"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { signOutAction } from "@/lib/actions";

const PROJECT_TABS = [
  { value: "overview", label: "Overview" },
  { value: "source", label: "Source & settings" },
  { value: "builds", label: "Builds" },
  { value: "members", label: "Members" },
] as const;

export function AppSidebar({
  user,
  isOrgAdmin,
  orgDomain,
  projects,
  githubConnected,
}: {
  user: { name?: string | null; email?: string | null; image?: string | null };
  isOrgAdmin: boolean;
  orgDomain: string;
  projects: { slug: string; name: string }[];
  githubConnected: boolean;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab") ?? "overview";

  const onMembers = pathname === "/dashboard/members";
  const onGithub = pathname === "/dashboard/settings/github";
  const projectMatch = pathname.match(/^\/dashboard\/projects\/([^/]+)/);
  const onProjectsRoot = pathname === "/dashboard";
  const activeProject = projectMatch ? projects.find((p) => p.slug === projectMatch[1]) : undefined;

  const initials = (user.name ?? user.email ?? "?")
    .split(" ")
    .map((p) => p.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <aside
      style={{
        background: "var(--rail)",
        borderRight: "1px solid var(--line)",
        display: "flex",
        flexDirection: "column",
        padding: "18px 14px",
        gap: 26,
        position: "sticky",
        top: 0,
        height: "100vh",
        width: 250,
        flex: "none",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 6px" }}>
        <div
          style={{
            width: 26,
            height: 26,
            borderRadius: 8,
            background: "var(--acc)",
            display: "grid",
            placeItems: "center",
            color: "var(--accfg)",
            font: "600 12px/1 'IBM Plex Mono', monospace",
          }}
        >
          D
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ font: "600 13px/1.2 'IBM Plex Sans', sans-serif" }}>Doctor</div>
          <div style={{ font: "400 10.5px/1.2 'IBM Plex Mono', monospace", color: "var(--fg3)", marginTop: 2 }}>
            {orgDomain}
          </div>
        </div>
      </div>

      <nav style={{ display: "flex", flexDirection: "column", gap: 22 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <div
            style={{
              font: "500 10px/1 'IBM Plex Mono', monospace",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--fg3)",
              padding: "0 8px 7px",
            }}
          >
            Workspace
          </div>
          <RailLink href="/dashboard" active={onProjectsRoot}>
            <span style={{ width: 6, height: 6, borderRadius: 2, background: "currentColor", opacity: 0.8 }} />
            Projects
            <span style={{ marginLeft: "auto", font: "500 11px/1 'IBM Plex Mono', monospace", color: "var(--fg3)" }}>
              {projects.length}
            </span>
          </RailLink>

          {activeProject && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 2,
                margin: "4px 0 6px 16px",
                paddingLeft: 11,
                borderLeft: "1px solid var(--line)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  padding: "5px 8px",
                  font: "600 11.5px/1 'IBM Plex Mono', monospace",
                  color: "var(--fg2)",
                }}
              >
                {activeProject.name}
              </div>
              {PROJECT_TABS.map((tab) => {
                const active = pathname === `/dashboard/projects/${activeProject.slug}` && activeTab === tab.value;
                return (
                  <Link
                    key={tab.value}
                    href={`/dashboard/projects/${activeProject.slug}?tab=${tab.value}`}
                    className="hover-fg"
                    style={{
                      textAlign: "left",
                      padding: "6px 8px",
                      border: "none",
                      borderRadius: 7,
                      background: active ? "var(--bg3)" : "transparent",
                      color: active ? "var(--fg)" : "var(--fg3)",
                      font: "500 12px/1 'IBM Plex Sans', sans-serif",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    {tab.label}
                  </Link>
                );
              })}
            </div>
          )}

          {isOrgAdmin && (
            <RailLink href="/dashboard/members" active={onMembers}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor", opacity: 0.8 }} />
              Members
            </RailLink>
          )}
        </div>

        {isOrgAdmin && (
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <div
              style={{
                font: "500 10px/1 'IBM Plex Mono', monospace",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--fg3)",
                padding: "0 8px 7px",
              }}
            >
              Organization
            </div>
            <RailLink href="/dashboard/settings/github" active={onGithub}>
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 1,
                  transform: "rotate(45deg)",
                  background: "currentColor",
                  opacity: 0.8,
                }}
              />
              GitHub connection
              <span
                style={{
                  marginLeft: "auto",
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: githubConnected ? "var(--ok)" : "var(--fg3)",
                }}
              />
            </RailLink>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 9px",
                borderRadius: 8,
                color: "var(--fg3)",
                font: "500 13px/1 'IBM Plex Sans', sans-serif",
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: 2, background: "currentColor", opacity: 0.5 }} />
              Instance &amp; domain
              <span style={{ marginLeft: "auto", font: "400 10px/1 'IBM Plex Mono', monospace", opacity: 0.7 }}>
                soon
              </span>
            </div>
          </div>
        )}
      </nav>

      <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 12 }}>
        <ThemeToggle style={{ width: "100%" }} />
        <div
          style={{
            borderTop: "1px solid var(--line)",
            paddingTop: 13,
            display: "flex",
            alignItems: "center",
            gap: 9,
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: "var(--accsoft)",
              color: "var(--acc)",
              display: "grid",
              placeItems: "center",
              font: "600 11px/1 'IBM Plex Mono', monospace",
              flex: "none",
            }}
          >
            {initials}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div
              style={{
                font: "500 12px/1.2 'IBM Plex Sans', sans-serif",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {user.name}
            </div>
            <div
              style={{
                font: "400 10.5px/1.3 'IBM Plex Mono', monospace",
                color: "var(--fg3)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {isOrgAdmin ? "org admin" : "member"}
            </div>
          </div>
          <form action={signOutAction}>
            <button
              type="submit"
              className="hover-fg"
              style={{
                border: "none",
                background: "transparent",
                color: "var(--fg3)",
                font: "500 11px/1 'IBM Plex Sans', sans-serif",
                padding: 4,
              }}
            >
              Exit
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}

function RailLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="hover-line"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 9px",
        borderRadius: 8,
        border: "1px solid transparent",
        background: active ? "var(--bg3)" : "transparent",
        color: active ? "var(--fg)" : "var(--fg2)",
        font: "500 13px/1 'IBM Plex Sans', sans-serif",
        textAlign: "left",
      }}
    >
      {children}
    </Link>
  );
}
