import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { migrateDocs } from "./migrate-docs";

// Runs the exact same migration the builder and `preview` use, into a
// throwaway directory, so "is this docs/ folder valid" always means the same
// thing everywhere — never a second, hand-rolled check that can drift.
export function validateDocs(sourceDocsDir: string): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];

  if (!existsSync(sourceDocsDir)) {
    return { valid: false, errors: [`No such directory: ${sourceDocsDir}`], warnings: [] };
  }
  if (!existsSync(path.join(sourceDocsDir, "docs.json"))) {
    return { valid: false, errors: [`No docs.json found in ${sourceDocsDir}`], warnings: [] };
  }

  const scratchDir = mkdtempSync(path.join(tmpdir(), "huellup-validate-"));
  try {
    const { warnings } = migrateDocs({
      sourceDocsDir,
      destSiteDir: scratchDir,
      siteUrl: "http://localhost:4321",
      projectName: "validation",
    });
    return { valid: true, errors, warnings };
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
    return { valid: false, errors, warnings: [] };
  } finally {
    rmSync(scratchDir, { recursive: true, force: true });
  }
}
