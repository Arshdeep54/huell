import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { SUPPORTED_MDX_COMPONENTS, validateDocs } from "@doctor/docs-core";

const DOCS_JSON_SCHEMA_DESCRIPTION = {
  description:
    "Doctor's docs.json — Mintlify-compatible. Lives at the root of a docs/ folder alongside .mdx pages.",
  fields: {
    name: "string, optional — site name shown in the nav. Falls back to the project name.",
    navigation:
      "either an array of {group, pages[]} objects (flat, single tab), or {tabs: [{tab, groups: [{group, pages[]}]}]} for multiple top-level tabs. `pages` entries are page paths without an extension, relative to the docs/ folder root (e.g. \"getting-started/installation\" maps to getting-started/installation.mdx). Nested groups inside a group's pages[] get flattened with a warning — keep groups one level deep.",
    "colors.primary": "optional hex color string, used as the site's accent color.",
    logo: "optional — either a single path string (e.g. \"/logo/mark.svg\"), or {light, dark} for theme-specific variants. Shown top-left on every page. The referenced file must live under an images/, logo/, or assets/ folder (or loose at the docs root) alongside docs.json — those are the only paths copied into the built site.",
    favicon: "optional path string (e.g. \"/favicon.svg\"), shown as the browser tab icon. Same file-location rule as logo. Defaults to /favicon.svg if a file with that exact name exists at the docs root, even with this field unset.",
    "navbar.links": "optional array of {label, href} shown in the top nav.",
    "navbar.primary": "optional single {label, href} shown as the primary/highlighted nav button.",
  },
  example: {
    name: "My Project",
    logo: "/logo/mark.svg",
    favicon: "/favicon.svg",
    navigation: {
      tabs: [
        {
          tab: "Documentation",
          groups: [{ group: "Getting Started", pages: ["introduction", "getting-started/installation"] }],
        },
      ],
    },
  },
};

const COMPONENT_NOTES: Record<string, string> = {
  CodeGroup: "Renders, but does not yet actually tab-switch between code blocks — known limitation, avoid relying on interactive tab-switching for CodeGroup specifically.",
  Tabs: "Full interactive tab-switching works.",
};

export async function runMcp() {
  const server = new McpServer({ name: "doctor-docs", version: "0.1.0" });

  server.resource("docs-json-schema", "doctor://docs-json-schema", async () => ({
    contents: [
      {
        uri: "doctor://docs-json-schema",
        mimeType: "application/json",
        text: JSON.stringify(DOCS_JSON_SCHEMA_DESCRIPTION, null, 2),
      },
    ],
  }));

  server.resource("components", "doctor://components", async () => ({
    contents: [
      {
        uri: "doctor://components",
        mimeType: "application/json",
        text: JSON.stringify(
          {
            description:
              "MDX components available in any Doctor .mdx page with no import needed — Doctor injects the import automatically for whichever of these you actually use.",
            supported: SUPPORTED_MDX_COMPONENTS.map((name) => ({
              name,
              note: COMPONENT_NOTES[name] ?? null,
            })),
          },
          null,
          2,
        ),
      },
    ],
  }));

  server.tool(
    "validate_docs",
    "Validates a Doctor docs/ folder (docs.json + .mdx pages) by running the exact same migration Doctor's build worker runs, against a scratch directory. Returns errors (which block a real build) and warnings (which don't).",
    { path: z.string().describe("Absolute or relative path to the docs/ folder to validate.") },
    async ({ path: docsDir }) => {
      const result = validateDocs(docsDir);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        isError: !result.valid,
      };
    },
  );

  await server.connect(new StdioServerTransport());
}
