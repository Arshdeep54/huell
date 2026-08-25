import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const EXAMPLE_DOCS_JSON = {
  name: "My Project",
  navigation: {
    tabs: [
      {
        tab: "Documentation",
        groups: [
          {
            group: "Getting Started",
            pages: ["introduction", "getting-started/installation"],
          },
        ],
      },
    ],
  },
};

const EXAMPLE_INTRO = `---
title: Introduction
---

Welcome! This page is served at your docs site's root.

Use \`<Note>\`, \`<Warning>\`, \`<Tip>\`, \`<Steps>\`, \`<Card>\`, \`<CardGroup>\`, \`<Tabs>\`, and
\`<CodeGroup>\` right in this MDX — no import needed, Huell wires them in automatically.

Run \`huell validate\` to check this folder, or \`huell preview\` to see it rendered.
`;

const EXAMPLE_INSTALL = `---
title: Installation
---

Describe how to install your project here.
`;

export function runInit(targetDir: string) {
  const docsDir = path.resolve(targetDir);
  if (existsSync(path.join(docsDir, "docs.json"))) {
    console.error(`docs.json already exists at ${docsDir} — nothing to do.`);
    process.exitCode = 1;
    return;
  }

  mkdirSync(path.join(docsDir, "getting-started"), { recursive: true });
  writeFileSync(path.join(docsDir, "docs.json"), JSON.stringify(EXAMPLE_DOCS_JSON, null, 2) + "\n");
  writeFileSync(path.join(docsDir, "introduction.mdx"), EXAMPLE_INTRO);
  writeFileSync(path.join(docsDir, "getting-started", "installation.mdx"), EXAMPLE_INSTALL);

  console.log(`Created a docs/ folder at ${docsDir}:`);
  console.log("  docs.json");
  console.log("  introduction.mdx");
  console.log("  getting-started/installation.mdx");
  console.log("");
  console.log("Next: huell preview   (see it rendered, hot-reloading)");
  console.log("      huell validate  (check it before publishing)");
  console.log("");
  console.log('Tip: add a logo by setting "logo" (and "favicon") in docs.json, with the');
  console.log("     file placed under a logo/, images/, or assets/ folder here.");
}
