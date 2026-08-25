import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";
import { ThemeToggle } from "@/components/theme-toggle";

const WHAT_IS_DOCTOR_URL = "https://doctor-docs.hiesenbug.dev";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  const orgDomain = process.env.ORG_DOMAIN ?? "your-org.com";

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "64px 24px",
        background: "radial-gradient(120% 80% at 50% 0%, var(--bg3), var(--bg) 62%)",
        position: "relative",
      }}
    >
      <ThemeToggle style={{ position: "absolute", top: 20, right: 20 }} />
      <div style={{ width: "100%", maxWidth: 392, display: "flex", flexDirection: "column", gap: 22 }}>
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
          <div style={{ font: "600 17px/1 'IBM Plex Sans', sans-serif", letterSpacing: "-0.01em" }}>Doctor</div>
          <div
            style={{
              marginLeft: "auto",
              font: "500 10.5px/1 'IBM Plex Mono', monospace",
              color: "var(--fg3)",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            self&#8209;hosted
          </div>
        </div>

        <div
          style={{
            background: "var(--bg2)",
            border: "1px solid var(--line)",
            borderRadius: 14,
            padding: 26,
            boxShadow: "var(--dc-shadow)",
            display: "flex",
            flexDirection: "column",
            gap: 18,
          }}
        >
          <LoginError searchParams={searchParams} />
          <div>
            <div style={{ font: "600 16px/1.2 'IBM Plex Sans', sans-serif" }}>Sign in</div>
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
            <a href={WHAT_IS_DOCTOR_URL} target="_blank" rel="noreferrer">
              What is Doctor?
            </a>
          </div>
        </div>

        <div style={{ font: "400 11.5px/1 'IBM Plex Mono', monospace", color: "var(--fg3)", textAlign: "center" }}>
          {orgDomain} &#183; one instance, one org
        </div>
      </div>
    </main>
  );
}

async function LoginError({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
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
