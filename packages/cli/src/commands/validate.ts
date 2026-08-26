import path from "node:path";
import { validateDocs } from "@huell/docs-core";

export function runValidate(targetDir: string, options: { strict?: boolean } = {}) {
  const docsDir = path.resolve(targetDir);
  const result = validateDocs(docsDir);

  if (!result.valid) {
    console.error(`✗ ${docsDir} is not valid:`);
    for (const error of result.errors) console.error(`  - ${error}`);
    process.exitCode = 1;
    return;
  }

  if (result.warnings.length > 0) {
    console.log(`⚠ ${docsDir} is valid, with ${result.warnings.length} warning(s):`);
    for (const warning of result.warnings) console.log(`  - ${warning}`);
    if (options.strict) process.exitCode = 1;
  } else {
    console.log(`✓ ${docsDir} is valid.`);
  }
}
