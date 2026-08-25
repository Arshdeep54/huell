"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 24,
        background: "var(--bg)",
        color: "var(--fg)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 440,
          background: "var(--bg2)",
          border: "1px solid var(--bad)",
          borderRadius: 14,
          padding: 26,
          boxShadow: "var(--dc-shadow)",
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        <div style={{ display: "flex", gap: 11, alignItems: "flex-start" }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--bad)", marginTop: 6, flex: "none" }} />
          <div>
            <div style={{ font: "600 15px/1.3 'IBM Plex Sans', sans-serif" }}>Something went wrong</div>
            <div style={{ font: "400 13px/1.5 'IBM Plex Sans', sans-serif", color: "var(--fg2)", marginTop: 4, textWrap: "pretty" }}>
              {error.message || "An unexpected error occurred."}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => reset()}
          className="hover-brighten"
          style={{
            alignSelf: "flex-start",
            height: 34,
            padding: "0 14px",
            border: "none",
            borderRadius: 9,
            background: "var(--acc)",
            color: "var(--accfg)",
            font: "600 12.5px/1 'IBM Plex Sans', sans-serif",
          }}
        >
          Try again
        </button>
      </div>
    </main>
  );
}
