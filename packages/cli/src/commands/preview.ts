import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { migrateDocs } from "@huell/docs-core";

// Resolves the docs-site template this CLI ships against. Inside this
// monorepo (dev, or `pnpm --filter huell dev`) that's the real
// templates/docs-site workspace package, already `pnpm install`-ed.
//
// TODO(publish): a standalone `npm install -g huell` doesn't have this
// monorepo around it — before actually publishing, bundle a copy of
// templates/docs-site into this package's own `files` and point this at that
// bundled copy instead. Nothing else in this command needs to change.
function resolveTemplateDir(): string {
  const monorepoTemplate = fileURLToPath(new URL("../../../../templates/docs-site", import.meta.url));
  if (existsSync(path.join(monorepoTemplate, "package.json"))) return monorepoTemplate;
  throw new Error(
    "Could not find the docs-site template. This build of huell doesn't yet bundle it standalone — " +
      "run it from within the Huell monorepo (pnpm --filter huell dev preview) for now.",
  );
}

export function runPreview(targetDir: string) {
  const docsDir = path.resolve(targetDir);
  if (!existsSync(path.join(docsDir, "docs.json"))) {
    console.error(`No docs.json found in ${docsDir}. Run "huell init" first.`);
    process.exitCode = 1;
    return;
  }

  const templateDir = resolveTemplateDir();

  console.log(`Migrating ${docsDir} into the preview site...`);
  const { warnings } = migrateDocs({
    sourceDocsDir: docsDir,
    destSiteDir: templateDir,
    siteUrl: "http://localhost:4321",
    projectName: path.basename(docsDir),
  });
  for (const warning of warnings) console.log(`  warning: ${warning}`);

  console.log("Starting the preview server (hot-reloading — edit your .mdx and it updates live)...\n");
  const astroBin = path.join(templateDir, "node_modules", ".bin", "astro");
  const child = spawn(astroBin, ["dev"], { cwd: templateDir, stdio: "inherit" });
  child.on("exit", (code) => {
    process.exitCode = code ?? 0;
  });
}
