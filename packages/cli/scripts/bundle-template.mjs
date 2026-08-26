// Snapshots templates/docs-site into this package before publish, so a
// standalone `npm install -g huellup` (or `npx huellup`) ships the Astro
// template alongside the CLI itself — no monorepo clone required to preview.
// Run as part of the "build" script, before esbuild.
//
// Plain node (no loader) runs this, and @huell/docs-core's own source uses
// extensionless TS imports node can't resolve without one — so this copy is
// inlined rather than importing copyDir from there.
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SKIP = new Set(["node_modules", "dist", ".astro"]);

function copyDir(source, dest) {
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

const source = fileURLToPath(new URL("../../../templates/docs-site", import.meta.url));
const dest = fileURLToPath(new URL("../docs-site-template", import.meta.url));

if (!existsSync(source)) throw new Error(`Source template not found: ${source}`);
rmSync(dest, { recursive: true, force: true });
mkdirSync(dest, { recursive: true });
copyDir(source, dest);
console.log(`Bundled docs-site template into ${dest}`);
