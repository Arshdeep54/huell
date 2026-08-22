import path from "node:path";
import { fileURLToPath } from "node:url";
import { copyDir } from "./copy-dir";
import { migrateMintlifyDocs } from "./migrate-mintlify";

// Standalone migration preview: copies the docs-site template, then converts a
// Mintlify-format docs/ folder into it, so it can be built and eyeballed on its own.
//
// Usage: pnpm --filter @doctor/builder migrate-mintlify <sourceDocsDir> <destDir> [projectName]

const [sourceDocsDir, destDir, projectName] = process.argv.slice(2);

if (!sourceDocsDir || !destDir) {
  console.error("Usage: migrate-mintlify <sourceDocsDir> <destDir> [projectName]");
  process.exit(1);
}

const templateDir = fileURLToPath(new URL("../../../templates/docs-site", import.meta.url));

copyDir(templateDir, destDir);

const { warnings } = migrateMintlifyDocs({
  sourceDocsDir: path.resolve(sourceDocsDir),
  destSiteDir: path.resolve(destDir),
  siteUrl: "http://localhost:4321",
  projectName: projectName ?? path.basename(destDir),
});

console.log(`Migrated "${sourceDocsDir}" into "${destDir}".`);
if (warnings.length > 0) {
  console.log("\nWarnings:");
  for (const warning of warnings) console.log(`  - ${warning}`);
}
console.log(`\nNext: cd ${destDir} && pnpm install && pnpm dev`);
