"use client";

import { usePathname } from "next/navigation";

export function Breadcrumb({
  orgDomain,
  projects,
}: {
  orgDomain: string;
  projects: { slug: string; name: string }[];
}) {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  let crumb = "projects";
  if (segments[1] === "members") crumb = "members";
  else if (segments[1] === "settings" && segments[2] === "github") crumb = "settings / github";
  else if (segments[1] === "projects" && segments[2] === "new") crumb = "projects / new";
  else if (segments[1] === "projects" && segments[2]) {
    const project = projects.find((p) => p.slug === segments[2]);
    crumb = `projects / ${project?.name ?? segments[2]}`;
  }

  return (
    <div
      style={{
        font: "400 12px/1 'IBM Plex Mono', monospace",
        color: "var(--fg3)",
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}
    >
      <span>{orgDomain}</span>
      <span style={{ opacity: 0.5 }}>/</span>
      <span style={{ color: "var(--fg2)" }}>{crumb}</span>
    </div>
  );
}
