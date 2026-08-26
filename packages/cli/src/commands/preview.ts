import { spawn } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { copyDir, migrateDocs } from "@huell/docs-core";

// Resolves where to run `astro dev` from, and which astro binary to use.
// Two cases:
//  - Inside this monorepo (dev, or `pnpm --filter huellup dev`): run
//    directly against the real templates/docs-site workspace package,
//    already `pnpm install`-ed — no copying needed.
//  - A standalone install (`npm install -g huellup`, `npx huellup`): the
//    template ships bundled inside this package (see
//    scripts/bundle-template.mjs), and astro/starlight are real
//    dependencies of huellup itself. Copy the bundled template into a work
//    directory nested under this package's own install root — Node
//    resolves astro.config.mjs's imports by walking up parent directories
//    for node_modules, so nesting under huellup's own root means it finds
//    huellup's own node_modules with no NODE_PATH tricks needed.
function resolvePreviewEnvironment(): { templateDir: string; astroBin: string } {
  const monorepoTemplate = fileURLToPath(new URL("../../../../templates/docs-site", import.meta.url));
  if (existsSync(path.join(monorepoTemplate, "package.json"))) {
    return { templateDir: monorepoTemplate, astroBin: path.join(monorepoTemplate, "node_modules", ".bin", "astro") };
  }

  const packageRoot = fileURLToPath(new URL("..", import.meta.url)); // dist/../ -> package root
  const bundledTemplate = path.join(packageRoot, "docs-site-template");
  if (!existsSync(bundledTemplate)) {
    throw new Error("Could not find huellup's bundled docs-site template. This install may be corrupted — try reinstalling huellup.");
  }

  const workDir = path.join(packageRoot, ".preview-workdir");
  rmSync(workDir, { recursive: true, force: true });
  copyDir(bundledTemplate, workDir);

  const astroBin = path.join(packageRoot, "node_modules", ".bin", "astro");
  if (!existsSync(astroBin)) {
    throw new Error("Could not find astro in huellup's own dependencies. Try reinstalling huellup.");
  }
  return { templateDir: workDir, astroBin };
}

export function runPreview(targetDir: string) {
  const docsDir = path.resolve(targetDir);
  if (!existsSync(path.join(docsDir, "docs.json"))) {
    console.error(`No docs.json found in ${docsDir}. Run "huellup init" first.`);
    process.exitCode = 1;
    return;
  }

  const { templateDir, astroBin } = resolvePreviewEnvironment();

  console.log(`Migrating ${docsDir} into the preview site...`);
  const { warnings } = migrateDocs({
    sourceDocsDir: docsDir,
    destSiteDir: templateDir,
    siteUrl: "http://localhost:4321",
    projectName: path.basename(docsDir),
  });
  for (const warning of warnings) console.log(`  warning: ${warning}`);

  console.log("Starting the preview server (hot-reloading — edit your .mdx and it updates live)...\n");
  const child = spawn(astroBin, ["dev"], { cwd: templateDir, stdio: "inherit" });
  child.on("exit", (code) => {
    process.exitCode = code ?? 0;
  });
}
