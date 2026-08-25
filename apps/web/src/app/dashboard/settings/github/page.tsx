import { requireOrgAdmin } from "@/lib/session";
import { getGithubAppConfig } from "@/lib/github-app";

export default async function GithubSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireOrgAdmin();
  const config = getGithubAppConfig();
  const { error } = await searchParams;

  const dashboardUrl = process.env.DASHBOARD_URL ?? "http://localhost:3000";
  const manifest = {
    name: `Doctor (${new URL(dashboardUrl).hostname})`,
    url: dashboardUrl,
    hook_attributes: { url: `${dashboardUrl}/api/github/webhook` },
    redirect_url: `${dashboardUrl}/api/github/manifest-callback`,
    setup_url: `${dashboardUrl}/api/github/install/callback`,
    setup_on_update: true,
    public: false,
    default_permissions: { contents: "read", metadata: "read", pull_requests: "read" },
    default_events: ["push"],
  };

  return (
    <div>
      <h1 style={{ margin: 0, font: "600 22px/1.2 'IBM Plex Sans', sans-serif", letterSpacing: "-0.015em" }}>
        GitHub connection
      </h1>
      <p style={{ margin: "7px 0 0", maxWidth: 640, font: "400 13px/1.6 'IBM Plex Sans', sans-serif", color: "var(--fg2)", textWrap: "pretty" }}>
        One GitHub App belongs to this instance. Projects connect individual repos through it — create it once,
        and every project&apos;s repo picker works.
      </p>

      {error && (
        <div
          style={{
            marginTop: 24,
            display: "flex",
            gap: 11,
            alignItems: "flex-start",
            padding: "13px 14px",
            borderRadius: 10,
            background: "var(--badsoft)",
            border: "1px solid var(--bad)",
          }}
        >
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--bad)", marginTop: 5, flex: "none" }} />
          <div style={{ font: "400 12.5px/1.5 'IBM Plex Sans', sans-serif", color: "var(--fg2)" }}>
            Couldn&apos;t finish creating the GitHub App. Try again.
          </div>
        </div>
      )}

      {config ? (
        <div style={{ marginTop: 24, border: "1px solid var(--line)", borderRadius: 14, background: "var(--bg2)", boxShadow: "var(--dc-shadow)", overflow: "hidden" }}>
          <div style={{ padding: "18px 20px", display: "flex", alignItems: "center", gap: 12, background: "var(--oksoft)", borderBottom: "1px solid var(--line)" }}>
            <span style={{ width: 9, height: 9, borderRadius: "50%", background: "var(--ok)", flex: "none" }} />
            <div>
              <div style={{ font: "600 14px/1.2 'IBM Plex Sans', sans-serif" }}>Connected</div>
              <div style={{ font: "400 12px/1.4 'IBM Plex Sans', sans-serif", color: "var(--fg2)", marginTop: 3 }}>
                Doctor ({new URL(dashboardUrl).hostname}) · app slug {config.slug}
              </div>
            </div>
          </div>
          <div style={{ padding: 20, display: "grid", gridTemplateColumns: "repeat(4,minmax(140px,1fr))", gap: 18 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <span style={{ font: "500 10.5px/1 'IBM Plex Mono', monospace", color: "var(--fg3)", letterSpacing: "0.06em" }}>APP</span>
              <span style={{ font: "400 12.5px/1.4 'IBM Plex Mono', monospace" }}>{config.slug}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <span style={{ font: "500 10.5px/1 'IBM Plex Mono', monospace", color: "var(--fg3)", letterSpacing: "0.06em" }}>APP ID</span>
              <span style={{ font: "400 12.5px/1.4 'IBM Plex Mono', monospace" }}>{config.appId}</span>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ marginTop: 24, border: "1px solid var(--line)", borderRadius: 14, background: "var(--bg2)", boxShadow: "var(--dc-shadow)", overflow: "hidden" }}>
          <div style={{ padding: "18px 20px", display: "flex", alignItems: "center", gap: 12, borderBottom: "1px solid var(--line)" }}>
            <span style={{ width: 9, height: 9, borderRadius: "50%", background: "var(--fg3)", flex: "none" }} />
            <div>
              <div style={{ font: "600 14px/1.2 'IBM Plex Sans', sans-serif" }}>Not connected yet</div>
              <div style={{ font: "400 12px/1.4 'IBM Plex Sans', sans-serif", color: "var(--fg2)", marginTop: 3 }}>
                Projects can still build from a docs.zip upload without this.
              </div>
            </div>
          </div>
          <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
            <Step n={1}>Doctor sends a pre&#8209;filled App manifest to GitHub — nothing to configure by hand.</Step>
            <Step n={2}>You approve it on GitHub and choose which repositories it can read.</Step>
            <Step n={3}>GitHub returns the credentials here. Push events start rebuilding projects.</Step>
            <div style={{ marginTop: 4, display: "flex", alignItems: "center", gap: 12 }}>
              <form method="post" action="https://github.com/settings/apps/new">
                <input type="hidden" name="manifest" value={JSON.stringify(manifest)} />
                <button
                  type="submit"
                  className="hover-brighten"
                  style={{ height: 36, padding: "0 15px", border: "none", borderRadius: 9, background: "var(--acc)", color: "var(--accfg)", font: "600 12.5px/1 'IBM Plex Sans', sans-serif" }}
                >
                  Create GitHub App
                </button>
              </form>
              <span style={{ font: "400 11.5px/1.5 'IBM Plex Mono', monospace", color: "var(--fg3)" }}>
                read&#8209;only: contents, metadata, pull requests
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", gap: 12 }}>
      <span style={{ width: 20, height: 20, borderRadius: "50%", background: "var(--bg3)", color: "var(--fg2)", display: "grid", placeItems: "center", font: "600 10.5px/1 'IBM Plex Mono', monospace", flex: "none" }}>
        {n}
      </span>
      <div style={{ font: "400 12.5px/1.5 'IBM Plex Sans', sans-serif", color: "var(--fg2)" }}>{children}</div>
    </div>
  );
}
