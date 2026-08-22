import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

const SKIP = new Set(["node_modules", "dist", ".astro"]);

/** Recursively copies a directory, skipping build artifacts and dependencies. */
export function copyDir(source: string, dest: string) {
  if (!existsSync(source)) throw new Error(`Source directory not found: ${source}`);
  for (const entry of readdirSync(source)) {
    if (SKIP.has(entry)) continue;
    const sourcePath = path.join(source, entry);
    const destPath = path.join(dest, entry);
    if (statSync(sourcePath).isDirectory()) {
      mkdirSync(destPath, { recursive: true });
      copyDir(sourcePath, destPath);
    } else {
      mkdirSync(path.dirname(destPath), { recursive: true });
      writeFileSync(destPath, readFileSync(sourcePath));
    }
  }
}
