"use client";

import { useEffect, useRef, useState } from "react";
import type { BuildStatus } from "@doctor/db";

const LIVE_STATUSES: BuildStatus[] = ["queued", "running"];
const POLL_INTERVAL_MS = 1000;

const STATUS_STYLE: Record<BuildStatus, { color: string; soft: string; label: string }> = {
  queued: { color: "var(--fg3)", soft: "var(--bg3)", label: "queued" },
  running: { color: "var(--acc)", soft: "var(--accsoft)", label: "running" },
  succeeded: { color: "var(--ok)", soft: "var(--oksoft)", label: "succeeded" },
  failed: { color: "var(--bad)", soft: "var(--badsoft)", label: "failed" },
};

function parseLine(raw: string): { time: string | null; text: string; color: string } {
  const match = raw.match(/^\[(\d{2}:\d{2})\] (.*)$/);
  const time = match ? match[1] : null;
  const text = match ? match[2] : raw;
  const color = text.startsWith("warning:")
    ? "var(--acc)"
    : /error|failed|✗/i.test(text)
      ? "var(--bad)"
      : "var(--fg2)";
  return { time, text, color };
}

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
  const scrollRef = useRef<HTMLDivElement>(null);

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
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [log]);

  const isLive = LIVE_STATUSES.includes(status);
  const s = STATUS_STYLE[status];
  const lines = log.split("\n").filter(Boolean).map(parseLine);

  return (
    <div style={{ border: "1px solid var(--line)", borderRadius: 9, background: "var(--bg)", overflow: "hidden" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 12px",
          borderBottom: "1px solid var(--line)",
        }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            font: "500 10.5px/1 'IBM Plex Mono', monospace",
            color: s.color,
            background: s.soft,
            padding: "4px 8px",
            borderRadius: 6,
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "currentColor",
              animation: isLive ? "dpulse 1.4s ease-out infinite" : "none",
            }}
          />
          {s.label}
        </span>
        {isLive && (
          <span style={{ marginLeft: "auto", font: "400 10.5px/1 'IBM Plex Mono', monospace", color: "var(--fg3)" }}>
            live · polling worker
          </span>
        )}
      </div>
      {isLive && (
        <div style={{ height: 3, background: "var(--bg3)", overflow: "hidden" }}>
          <div
            style={{
              height: "100%",
              width: "100%",
              background: `repeating-linear-gradient(115deg, ${s.color} 0 8px, ${s.soft} 8px 16px)`,
              backgroundSize: "24px 100%",
              animation: "barber 900ms linear infinite",
            }}
          />
        </div>
      )}
      <div
        ref={scrollRef}
        style={{
          padding: "11px 13px",
          maxHeight: 280,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 4,
        }}
      >
        {lines.length === 0 ? (
          <span style={{ font: "400 11.5px/1.6 'IBM Plex Mono', monospace", color: "var(--fg3)" }}>
            {isLive ? "Waiting for output…" : "No log for this build."}
          </span>
        ) : (
          lines.map((line, i) => (
            <div key={i} style={{ display: "flex", gap: 10, font: "400 11.5px/1.6 'IBM Plex Mono', monospace", animation: "rise 200ms ease-out backwards" }}>
              {line.time && <span style={{ color: "var(--fg3)", flex: "none" }}>{line.time}</span>}
              <span style={{ color: line.color, minWidth: 0, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{line.text}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
