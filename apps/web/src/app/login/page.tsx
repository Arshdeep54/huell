import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";
import { ThemeToggle } from "@/components/theme-toggle";

const WHAT_IS_HUELL_URL = "https://huell-docs.hiesenbug.dev";

const EXAMPLE_ACTIVITY = [
  { name: "acme-docs", detail: "deployed · 128 pages", when: "12m ago", state: "live" as const },
  { name: "internal-wiki", detail: "building · astro build, step 4 of 6", state: "building" as const, progress: 62 },
  { name: "release-notes", detail: "upload source · 22 pages", when: "yesterday", state: "live" as const },
];

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; waitlisted?: string }>;
}) {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  const orgDomain = process.env.ORG_DOMAIN ?? "your-org.com";

  return (
    <main style={{ minHeight: "100vh", display: "grid", gridTemplateColumns: "1.15fr 1fr", background: "var(--bg)" }}>
      <div
        style={{
          position: "relative",
          overflow: "hidden",
          padding: "56px 64px",
          display: "flex",
          flexDirection: "column",
          background: "radial-gradient(120% 100% at 0% 0%, var(--bg3), var(--bg) 68%)",
          borderRight: "1px solid var(--line)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: 9,
              background: "var(--acc)",
              display: "grid",
              placeItems: "center",
              color: "var(--accfg)",
              font: "600 14px/1 'IBM Plex Mono', monospace",
            }}
          >
            D
          </div>
          <div style={{ font: "600 17px/1 'IBM Plex Sans', sans-serif", letterSpacing: "-0.01em" }}>Huell</div>
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <div style={{ maxWidth: 480 }}>
          <div
            style={{
              font: "500 11px/1 'IBM Plex Mono', monospace",
              color: "var(--acc)",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            self&#8209;hosted docs platform
          </div>
          <h1 style={{ margin: "16px 0 0", font: "600 40px/1.18 'IBM Plex Sans', sans-serif", letterSpacing: "-0.02em", textWrap: "pretty" }}>
            Push to a repo. Get a docs site.
          </h1>
          <p style={{ margin: "16px 0 0", font: "400 14.5px/1.65 'IBM Plex Sans', sans-serif", color: "var(--fg2)", textWrap: "pretty" }}>
            One instance for your whole org. Connect a GitHub repo or upload a docs.zip, and every project gets a
            live, searchable site on its own subdomain.
          </p>
        </div>

        <div style={{ marginTop: 34, display: "flex", flexDirection: "column", gap: 10, maxWidth: 480 }}>
          {EXAMPLE_ACTIVITY.map((item, i) => (
            <div
              key={item.name}
              className="animate-rise"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                border: `1px solid ${item.state === "building" ? "var(--accline)" : "var(--line)"}`,
                borderRadius: 11,
                background: "var(--bg2)",
                padding: "12px 14px",
                boxShadow: "var(--dc-shadow)",
                animationDelay: `${i * 90}ms`,
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: item.state === "building" ? "var(--acc)" : "var(--ok)",
                  animation: item.state === "building" ? "dpulse 1.4s ease-out infinite" : "none",
                  flex: "none",
                }}
              />
              <span style={{ font: "500 12.5px/1 'IBM Plex Mono', monospace", flex: "none" }}>{item.name}</span>
              <span
                style={{
                  font: "400 11.5px/1.4 'IBM Plex Sans', sans-serif",
                  color: item.state === "building" ? "var(--fg2)" : "var(--fg3)",
                  minWidth: 0,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {item.detail}
              </span>
              {item.state === "building" ? (
                <span
                  style={{
                    marginLeft: "auto",
                    height: 4,
                    width: 64,
                    borderRadius: 99,
                    background: "var(--bg3)",
                    overflow: "hidden",
                    flex: "none",
                  }}
                >
                  <span style={{ display: "block", height: "100%", width: `${item.progress}%`, background: "var(--acc)" }} />
                </span>
              ) : (
                <span style={{ marginLeft: "auto", font: "400 11px/1 'IBM Plex Mono', monospace", color: "var(--fg3)", flex: "none" }}>
                  {item.when}
                </span>
              )}
            </div>
          ))}
        </div>
        </div>
      </div>

      <div
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "64px 40px",
          background: "radial-gradient(60% 50% at 50% 45%, var(--bg3), var(--bg) 70%)",
        }}
      >
        <ThemeToggle iconOnly style={{ position: "absolute", top: 20, right: 20 }} />
        <div style={{ width: "100%", maxWidth: 392, display: "flex", flexDirection: "column", gap: 18 }}>
          <div
            style={{
              background: "var(--bg2)",
              border: "1px solid var(--line)",
              borderRadius: 14,
              padding: 28,
              boxShadow: "var(--dc-shadow)",
              display: "flex",
              flexDirection: "column",
              gap: 18,
            }}
          >
            <LoginError searchParams={searchParams} />
            <div>
              <div style={{ font: "600 17px/1.2 'IBM Plex Sans', sans-serif" }}>Welcome back</div>
              <div
                style={{
                  font: "400 13px/1.55 'IBM Plex Sans', sans-serif",
                  color: "var(--fg2)",
                  marginTop: 6,
                  textWrap: "pretty",
                }}
              >
                Access is invite&#8209;only. An org admin invites your email, then you sign in with the matching
                Google account.
              </div>
            </div>
            <form
              action={async () => {
                "use server";
                await signIn("google", { redirectTo: "/dashboard" });
              }}
            >
              <button
                type="submit"
                className="hover-brighten"
                style={{
                  width: "100%",
                  height: 42,
                  border: "none",
                  borderRadius: 10,
                  background: "var(--acc)",
                  color: "var(--accfg)",
                  font: "600 13.5px/1 'IBM Plex Sans', sans-serif",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 9,
                }}
              >
                <span
                  style={{
                    width: 15,
                    height: 15,
                    borderRadius: "50%",
                    background: "var(--accfg)",
                    opacity: 0.85,
                    display: "inline-block",
                  }}
                />
                Continue with Google
              </button>
            </form>
            <div
              style={{
                borderTop: "1px solid var(--line)",
                paddingTop: 14,
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                font: "400 11.5px/1.5 'IBM Plex Sans', sans-serif",
                color: "var(--fg3)",
              }}
            >
              <span>No password, no signup form.</span>
              <a href={WHAT_IS_HUELL_URL} target="_blank" rel="noreferrer">
                What is Huell?
              </a>
            </div>
          </div>

          <div style={{ font: "400 11.5px/1 'IBM Plex Mono', monospace", color: "var(--fg3)", textAlign: "center" }}>
            {orgDomain} &#183; one instance, one org
          </div>
        </div>
      </div>
    </main>
  );
}

async function LoginError({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; waitlisted?: string }>;
}) {
  const { error, waitlisted } = await searchParams;

  if (waitlisted) {
    return (
      <div
        style={{
          display: "flex",
          gap: 11,
          alignItems: "flex-start",
          padding: "13px 14px",
          borderRadius: 10,
          background: "var(--oksoft)",
          border: "1px solid var(--ok)",
        }}
      >
        <div style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--ok)", marginTop: 5, flex: "none" }} />
        <div>
          <div style={{ font: "600 13px/1.3 'IBM Plex Sans', sans-serif", color: "var(--fg)" }}>
            Request received
          </div>
          <div style={{ font: "400 12.5px/1.5 'IBM Plex Sans', sans-serif", color: "var(--fg2)", marginTop: 3 }}>
            An org admin needs to approve your access before you can sign in — you'll be able to try again once
            they do.
          </div>
        </div>
      </div>
    );
  }

  if (!error) return null;
  return (
    <div
      style={{
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
      <div>
        <div style={{ font: "600 13px/1.3 'IBM Plex Sans', sans-serif", color: "var(--fg)" }}>
          {error === "AccessDenied" ? "This email isn't on the invite list" : "Sign-in failed"}
        </div>
        <div style={{ font: "400 12.5px/1.5 'IBM Plex Sans', sans-serif", color: "var(--fg2)", marginTop: 3 }}>
          {error === "AccessDenied"
            ? `Ask an org admin at ${process.env.ORG_DOMAIN ?? "your-org.com"} to invite this address, then try again.`
            : "Please try again."}
        </div>
      </div>
    </div>
  );
}
