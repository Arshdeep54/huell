"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";

function SubmitButton({ hasFile }: { hasFile: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={!hasFile || pending}
      className="hover-fg"
      style={{
        height: 31,
        padding: "0 12px",
        border: "1px solid var(--line2)",
        borderRadius: 8,
        background: "transparent",
        color: "var(--fg2)",
        font: "500 12px/31px 'IBM Plex Sans', sans-serif",
        flex: "none",
        opacity: !hasFile || pending ? 0.5 : 1,
      }}
    >
      {pending ? "Uploading…" : "Upload & build"}
    </button>
  );
}

export function UploadDocsForm({ action }: { action: (formData: FormData) => Promise<void> }) {
  const [fileName, setFileName] = useState<string | null>(null);

  return (
    <form
      action={action}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        border: "1px dashed var(--line2)",
        borderRadius: 12,
        padding: "14px 16px",
      }}
    >
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ font: "500 12.5px/1.3 'IBM Plex Sans', sans-serif", color: "var(--fg2)" }}>
          {fileName ?? (
            <>
              Drop a <span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>docs.zip</span> here
            </>
          )}
        </div>
        <div style={{ font: "400 11.5px/1.5 'IBM Plex Mono', monospace", color: "var(--fg3)", marginTop: 4 }}>
          {fileName ? "Ready to upload" : "docs.json + .mdx + images · 20MB max · replaces the repo as source"}
        </div>
      </div>
      <input
        id="docsZip"
        name="docsZip"
        type="file"
        accept=".zip"
        required
        onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
        style={{ display: "none" }}
      />
      <label
        htmlFor="docsZip"
        className="hover-fg"
        style={{
          height: 31,
          padding: "0 12px",
          border: "1px solid var(--line2)",
          borderRadius: 8,
          background: "transparent",
          color: "var(--fg2)",
          font: "500 12px/31px 'IBM Plex Sans', sans-serif",
          flex: "none",
        }}
      >
        {fileName ? "Change file" : "Choose file"}
      </label>
      <SubmitButton hasFile={fileName !== null} />
    </form>
  );
}
