import { readFileSync } from "node:fs";
import type { HuellNavTab } from "./migrate-docs";

// A link to localhost (or any loopback/private address) can never resolve
// for a real reader in any environment — local dev, CI, or production — so
// it doesn't get the benefit of the doubt a merely-missing page does. It's
// always wrong, most often a link copy-pasted from a local preview URL.
const LOCAL_HOST_PATTERN = /^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\]|::1)(:\d+)?$/i;

// Markdown links `[text](url)` and JSX `href="url"` — covers both prose
// links and component props like <Card href="...">.
const LINK_PATTERNS = [/\[[^\]]*\]\(([^)\s]+)\)/g, /href=["']([^"']+)["']/g];

function extractLinks(content: string): string[] {
  const links: string[] = [];
  for (const pattern of LINK_PATTERNS) {
    for (const match of content.matchAll(pattern)) links.push(match[1]);
  }
  return links;
}

// Checks every internal/local link found in a project's pages against the
// set of pages docs.json actually declares. Runs on source content (not a
// built site), so it works identically in a real build and in `huellup
// validate` — no astro build required either way.
export function checkLinks(
  sourceDocsDir: string,
  tabs: HuellNavTab[],
  findSourceFileImpl: (dir: string, page: string) => string | null,
): { warnings: string[]; errors: string[] } {
  const warnings: string[] = [];
  const errors: string[] = [];
  const knownPages = new Set(tabs.flatMap((tab) => tab.groups.flatMap((group) => group.pages)));

  for (const tab of tabs) {
    for (const group of tab.groups) {
      for (const page of group.pages) {
        const sourceFile = findSourceFileImpl(sourceDocsDir, page);
        if (!sourceFile) continue;
        const content = readFileSync(sourceFile, "utf-8");

        for (const rawLink of extractLinks(content)) {
          if (rawLink.startsWith("#") || rawLink.startsWith("mailto:") || rawLink.startsWith("tel:")) continue;

          let hostname: string | null = null;
          if (/^https?:\/\//i.test(rawLink)) {
            try {
              hostname = new URL(rawLink).hostname;
            } catch {
              continue;
            }
            if (!LOCAL_HOST_PATTERN.test(hostname) && !/^\[?::1\]?$/.test(hostname)) continue; // real external link — out of scope
            errors.push(`Page "${page}" links to "${rawLink}", a local address that will never resolve for readers.`);
            continue;
          }

          // Internal link — normalize and check against the known page set.
          const withoutHash = rawLink.split("#")[0];
          const normalized = withoutHash.replace(/^\//, "").replace(/\.(mdx|md)$/, "");
          if (!normalized) continue; // "/" or "#..." on its own
          if (!knownPages.has(normalized)) {
            warnings.push(`broken link: Page "${page}" links to "${rawLink}", which doesn't match any known page.`);
          }
        }
      }
    }
  }

  return { warnings, errors };
}
