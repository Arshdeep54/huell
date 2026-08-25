"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { useTheme } from "next-themes";

export function ThemeToggle({
  className,
  style,
  iconOnly,
}: {
  className?: string;
  style?: CSSProperties;
  iconOnly?: boolean;
}) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isLight = mounted && resolvedTheme === "light";

  return (
    <button
      type="button"
      className={`hover-fg hover-line${className ? ` ${className}` : ""}`}
      aria-label="Toggle theme"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 9,
        padding: iconOnly ? 8 : "8px 9px",
        borderRadius: 8,
        border: "1px solid var(--line)",
        background: "transparent",
        color: "var(--fg2)",
        font: "500 12px/1 'IBM Plex Sans', sans-serif",
        ...style,
      }}
    >
      <span
        style={{
          width: 12,
          height: 12,
          borderRadius: "50%",
          border: "1.5px solid currentColor",
          background: "linear-gradient(90deg, currentColor 50%, transparent 50%)",
          flex: "none",
        }}
      />
      {!iconOnly && (isLight ? "Light" : "Dark")}
    </button>
  );
}
