"use client";

import { useEffect, useRef, useState } from "react";
import type { BuildStatus } from "@doctor/db";

const LIVE_STATUSES: BuildStatus[] = ["queued", "running"];
const POLL_INTERVAL_MS = 2000;

export function BuildLog({
  buildId,
  initialStatus,
  initialLog,
}: {
  buildId: string;
  initialStatus: BuildStatus;
  initialLog: string | null;
}) {
  const [status, setStatus] = useState(initialStatus);
  const [log, setLog] = useState(initialLog ?? "");
  const preRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    if (!LIVE_STATUSES.includes(status)) return;
    let cancelled = false;

    const poll = async () => {
      try {
        const res = await fetch(`/api/builds/${buildId}/log`, { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const data: { status: BuildStatus; log: string } = await res.json();
        if (cancelled) return;
        setStatus(data.status);
        setLog(data.log);
      } catch {
        // transient network error — next poll will retry
      }
    };

    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [buildId, status]);

  useEffect(() => {
    const el = preRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [log]);

  const isLive = LIVE_STATUSES.includes(status);

  return (
    <div style={{ border: "1px solid var(--line)", borderRadius: 9, background: "var(--bg)", overflow: "hidden" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 12px",
          borderBottom: "1px solid var(--line)",
          font: "500 10.5px/1 'IBM Plex Mono', monospace",
          color: isLive ? "var(--acc)" : "var(--fg3)",
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "currentColor",
            animation: isLive ? "dpulse 1.6s ease-out infinite" : "none",
          }}
        />
        {isLive ? "live · polling worker" : "log"}
      </div>
      <pre
        ref={preRef}
        style={{
          margin: 0,
          padding: "11px 13px",
          maxHeight: 280,
          overflowY: "auto",
          font: "400 11.5px/1.6 'IBM Plex Mono', monospace",
          color: "var(--fg2)",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {log.trim() ? log : isLive ? "Waiting for output…" : "No log for this build."}
      </pre>
    </div>
  );
}
