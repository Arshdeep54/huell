import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import matter from "gray-matter";

export interface DoctorNavGroup {
  label: string;
  pages: string[];
}

export interface DoctorNavTab {
  label: string;
  slug: string;
  groups: DoctorNavGroup[];
}

export interface DoctorNavLink {
  label: string;
  href: string;
}

export interface DoctorNav {
  name: string;
  siteUrl: string;
  accentColor?: string;
  navLinks: DoctorNavLink[];
  navPrimary?: DoctorNavLink;
  tabs: DoctorNavTab[];
}

type SourcePage = string | { group: string; pages: SourcePage[] };
interface SourceGroup {
  group: string;
  pages: SourcePage[];
}
interface SourceTab {
  tab: string;
  groups: SourceGroup[];
}
interface SourceDocsJson {
  name?: string;
  navigation: { tabs?: SourceTab[]; groups?: SourceGroup[] } | SourceGroup[];
  colors?: { primary?: string };
  navbar?: {
    links?: { label: string; href: string }[];
    primary?: { label: string; href: string };
  };
}

export const SUPPORTED_MDX_COMPONENTS = [
  "Note",
  "Info",
  "Tip",
  "Check",
  "Warning",
  "Danger",
  "Card",
  "CardGroup",
  "Tabs",
  "Tab",
  "Steps",
  "Step",
  "CodeGroup",
  "Expandable",
  "ParamField",
  "ResponseField",
] as const;

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function flattenPages(pages: SourcePage[], warnings: string[]): string[] {
  return pages.flatMap((page) => {
    if (typeof page === "string") return [page];
    warnings.push(`Nested group "${page.group}" was flattened into its parent group.`);
    return flattenPages(page.pages, warnings);
  });
}

function normalizeTabs(docsJson: SourceDocsJson, warnings: string[]): DoctorNavTab[] {
  const { navigation } = docsJson;

  const toTab = (label: string, groups: SourceGroup[]): DoctorNavTab => ({
    label,
    slug: slugify(label),
    groups: groups.map((g) => ({ label: g.group, pages: flattenPages(g.pages, warnings) })),
  });

  if (Array.isArray(navigation)) {
    return [toTab("Documentation", navigation)];
  }
  if (navigation.tabs) {
    return navigation.tabs.map((tab) => toTab(tab.tab, tab.groups));
  }
  if (navigation.groups) {
    return [toTab("Documentation", navigation.groups)];
  }
  throw new Error("Unrecognized docs.json navigation shape.");
}

function findSourceFile(docsDir: string, page: string): string | null {
  for (const ext of [".mdx", ".md"]) {
    const candidate = path.join(docsDir, `${page}${ext}`);
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

function injectComponentImport(mdxSource: string, relativeImportPath: string): string {
  const usedComponents = SUPPORTED_MDX_COMPONENTS.filter((name) =>
    new RegExp(`<${name}[\\s>]`).test(mdxSource),
  );
  if (usedComponents.length === 0) return mdxSource;

  const importLine = `import { ${usedComponents.join(", ")} } from '${relativeImportPath}';\n\n`;
  const frontmatterMatch = mdxSource.match(/^---\n[\s\S]*?\n---\n/);
  if (!frontmatterMatch) return importLine + mdxSource;

  const end = frontmatterMatch[0].length;
  return mdxSource.slice(0, end) + "\n" + importLine + mdxSource.slice(end);
}

function copyStaticAssets(sourceDocsDir: string, publicDir: string, warnings: string[]) {
  if (!existsSync(sourceDocsDir)) return;
  for (const entry of readdirSync(sourceDocsDir)) {
    const sourcePath = path.join(sourceDocsDir, entry);
    if (statSync(sourcePath).isDirectory() && !["images", "logo", "assets"].includes(entry)) continue;
    if (entry === "docs.json") continue;
    if (statSync(sourcePath).isFile() && /\.(mdx?|json)$/.test(entry)) continue;
    copyRecursive(sourcePath, path.join(publicDir, entry), warnings);
  }
}

function copyRecursive(source: string, dest: string, warnings: string[]) {
  const stat = statSync(source);
  if (stat.isDirectory()) {
    mkdirSync(dest, { recursive: true });
    for (const entry of readdirSync(source)) {
      copyRecursive(path.join(source, entry), path.join(dest, entry), warnings);
    }
  } else {
    mkdirSync(path.dirname(dest), { recursive: true });
    writeFileSync(dest, readFileSync(source));
  }
}

/**
 * Converts a a docs/ folder (docs.json + .mdx pages + images/)
 * into the docs-site template's nav.config.json + src/content/docs tree.
 * Callout tags (<Note>, <Info>, etc.) are left untouched in the MDX —
 * only one import line is injected per file, so content stays a near-straight copy.
 */
export function migrateDocs(options: {
  sourceDocsDir: string;
  destSiteDir: string;
  siteUrl: string;
  projectName: string;
}): { warnings: string[] } {
  const { sourceDocsDir, destSiteDir, siteUrl, projectName } = options;
  const warnings: string[] = [];

  const docsJsonPath = path.join(sourceDocsDir, "docs.json");
  if (!existsSync(docsJsonPath)) {
    throw new Error(`No docs.json found at ${docsJsonPath}`);
  }
  const docsJson = JSON.parse(readFileSync(docsJsonPath, "utf-8")) as SourceDocsJson;

  const tabs = normalizeTabs(docsJson, warnings);
  const nav: DoctorNav = {
    name: docsJson.name ?? projectName,
    siteUrl,
    accentColor: docsJson.colors?.primary,
    navLinks: docsJson.navbar?.links ?? [],
    navPrimary: docsJson.navbar?.primary,
    tabs,
  };

  const contentDir = path.join(destSiteDir, "src", "content", "docs");
  // Clear out the template's own placeholder content — otherwise it lingers
  // alongside every real migrated page since we only ever write, never wipe.
  rmSync(contentDir, { recursive: true, force: true });
  mkdirSync(contentDir, { recursive: true });

  for (const tab of tabs) {
    for (const group of tab.groups) {
      for (const page of group.pages) {
        const sourceFile = findSourceFile(sourceDocsDir, page);
        if (!sourceFile) {
          warnings.push(`Page "${page}" listed in docs.json but no .mdx/.md file found — skipped.`);
          continue;
        }

        // Source page paths (e.g. "sdk/reference") are already the full path
        // from the docs root — don't also nest under the tab slug, or a page
        // whose path happens to start with the tab name double-nests.
        const destFile = path.join(contentDir, `${page}.mdx`);
        mkdirSync(path.dirname(destFile), { recursive: true });

        const raw = readFileSync(sourceFile, "utf-8");
        const parsed = matter(raw);
        if (!parsed.data.title) {
          parsed.data.title = page.split("/").pop() ?? page;
          warnings.push(`Page "${page}" had no frontmatter title — defaulted to "${parsed.data.title}".`);
        }
        const withFrontmatter = matter.stringify(parsed.content, parsed.data);

        const relativeImportPath = path
          .relative(path.dirname(destFile), path.join(destSiteDir, "src", "components", "content"))
          .split(path.sep)
          .join("/");
        writeFileSync(destFile, injectComponentImport(withFrontmatter, relativeImportPath));
      }
    }
  }

  copyStaticAssets(sourceDocsDir, path.join(destSiteDir, "public"), warnings);
  writeFileSync(path.join(destSiteDir, "nav.config.json"), JSON.stringify(nav, null, 2));

  return { warnings };
}
