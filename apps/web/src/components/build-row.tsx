"use client";

import { useState } from "react";
import type { BuildStatus, schema } from "@doctor/db";
import { formatRelativeTime } from "@/lib/format";
import { BuildLog } from "@/components/build-log";

const STATUS_COLOR: Record<BuildStatus, string> = {
  succeeded: "var(--ok)",
  running: "var(--acc)",
  queued: "var(--fg3)",
  failed: "var(--bad)",
};

export function StatusDot({ status }: { status: BuildStatus }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        font: "500 11.5px/1.4 'IBM Plex Mono', monospace",
        color: STATUS_COLOR[status],
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor", flex: "none" }} />
      {status}
    </span>
  );
}

export function BuildRow({
  build,
  defaultExpanded = false,
}: {
  build: typeof schema.builds.$inferSelect;
  defaultExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const durationSeconds =
    build.startedAt && build.finishedAt
      ? Math.round((build.finishedAt.getTime() - build.startedAt.getTime()) / 1000)
      : null;

  return (
    <div style={{ borderBottom: "1px solid var(--line)" }}>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="hover-line"
        style={{
          display: "grid",
          width: "100%",
          gridTemplateColumns: "96px 74px minmax(0,1fr) auto",
          alignItems: "start",
          gap: 14,
          padding: "12px 20px",
          textAlign: "left",
          background: "transparent",
          border: "none",
          borderTop: "1px solid transparent",
        }}
      >
        <StatusDot status={build.status} />
        <span style={{ font: "500 11.5px/1.4 'IBM Plex Mono', monospace", color: "var(--fg2)" }}>
          {build.commitSha.slice(0, 7)}
        </span>
        <span style={{ minWidth: 0 }}>
          <span style={{ display: "block", font: "400 12.5px/1.4 'IBM Plex Sans', sans-serif", textWrap: "pretty" }}>
            {build.source === "upload" ? "manual upload" : "push to " + build.commitSha.slice(0, 7)}
          </span>
          <span
            style={{
              display: "block",
              font: "400 11px/1.5 'IBM Plex Mono', monospace",
              color: build.status === "failed" ? "var(--bad)" : "var(--fg3)",
              marginTop: 3,
              textWrap: "pretty",
            }}
          >
            {build.source} · {expanded ? "hide log" : "view log"}
          </span>
        </span>
        <span
          style={{
            textAlign: "right",
            whiteSpace: "nowrap",
            font: "400 11.5px/1.4 'IBM Plex Mono', monospace",
            color: "var(--fg3)",
          }}
        >
          {formatRelativeTime(build.createdAt)}
          {durationSeconds !== null && (
            <span style={{ display: "block", marginTop: 3, opacity: 0.75 }}>{durationSeconds}s</span>
          )}
        </span>
      </button>
      {expanded && (
        <div style={{ padding: "0 20px 14px" }}>
          <BuildLog buildId={build.id} initialStatus={build.status} initialLog={build.log} />
        </div>
      )}
    </div>
  );
}
