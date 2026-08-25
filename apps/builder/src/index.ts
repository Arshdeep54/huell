import { execFile } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, renameSync, rmSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { App } from "octokit";
import { asc, eq } from "drizzle-orm";
import { copyDir, migrateDocs } from "@huell/docs-core";
import { getGithubAppConfig } from "./github-app-config";

// tsx/node don't auto-load .env — do it before importing @huell/db, since
// its module body reads DATA_DIR at import time. Opt-in: absent in Docker,
// where compose injects env vars directly.
const rootEnvPath = fileURLToPath(new URL("../../../.env", import.meta.url));
if (existsSync(rootEnvPath)) process.loadEnvFile(rootEnvPath);
const { db, schema } = await import("@huell/db");

const run = promisify(execFile);
const POLL_INTERVAL_MS = 5000;
const GITHUB_API_TIMEOUT_MS = 30_000;
const GIT_TIMEOUT_MS = 120_000;
const ASTRO_BUILD_TIMEOUT_MS = 600_000;

const dataDir = process.env.DATA_DIR ?? "./data";
const orgDomain = process.env.ORG_DOMAIN ?? "example.com";
const docsSubdomainSeparator = process.env.DOCS_SUBDOMAIN_SEPARATOR === "-" ? "-" : ".";
const templateDir = fileURLToPath(new URL("../../../templates/docs-site", import.meta.url));

// Flushes the accumulated log to the build's DB row after every appended
// step, instead of only writing once when the build finishes — this is what
// lets the dashboard poll and show progress on a build that's still running.
class BuildLogger {
  private lines: string[] = [];
  private secrets: string[] = [];
  private readonly startedAt = Date.now();

  constructor(private readonly buildId: string) {}

  // Registers a secret (e.g. a GitHub installation token embedded in a clone
  // URL) that must never reach the persisted log, which project members can
  // view in the dashboard. Applies to every append from this point on,
  // including the command line built with it and any error text it surfaces in.
  redact(secret: string) {
    if (secret) this.secrets.push(secret);
  }

  append(text: string) {
    if (!text) return;
    for (const secret of this.secrets) text = text.split(secret).join("***");
    const elapsed = Math.floor((Date.now() - this.startedAt) / 1000);
    const stamp = `${String(Math.floor(elapsed / 60)).padStart(2, "0")}:${String(elapsed % 60).padStart(2, "0")}`;
    for (const line of text.split("\n")) {
      this.lines.push(`[${stamp}] ${line}`);
    }
    db.update(schema.builds).set({ log: this.lines.join("\n") }).where(eq(schema.builds.id, this.buildId)).run();
  }

  get text() {
    return this.lines.join("\n");
  }
}

function countFiles(dir: string, extension?: string): number {
  if (!existsSync(dir)) return 0;
  let count = 0;
  for (const entry of readdirSync(dir)) {
    const entryPath = path.join(dir, entry);
    if (statSync(entryPath).isDirectory()) {
      count += countFiles(entryPath, extension);
    } else if (!extension || entry.endsWith(extension)) {
      count += 1;
    }
  }
  return count;
}

async function nextQueuedBuild() {
  return db
    .select()
    .from(schema.builds)
    .where(eq(schema.builds.status, "queued"))
    .orderBy(asc(schema.builds.createdAt))
    .limit(1)
    .get();
}

async function processBuild(build: typeof schema.builds.$inferSelect) {
  const project = db.select().from(schema.projects).where(eq(schema.projects.id, build.projectId)).get();
  if (!project) {
    failBuild(build.id, "Project no longer exists.");
    return;
  }
  const uploadDir = path.join(dataDir, "uploads", project.id);
  if (build.source === "github" && !project.repoFullName) {
    failBuild(build.id, "Project has no repository connected.");
    return;
  }
  if (build.source === "upload" && !existsSync(path.join(uploadDir, "docs.json"))) {
    failBuild(build.id, "No uploaded docs found for this project.");
    return;
  }

  db.update(schema.builds)
    .set({ status: "running", startedAt: new Date() })
    .where(eq(schema.builds.id, build.id))
    .run();

  const cloneDir = path.join(dataDir, "work", `${build.id}-repo`);
  const logger = new BuildLogger(build.id);

  try {
    const { sourceDocsDir, resolvedCommitSha } =
      build.source === "upload"
        ? { sourceDocsDir: uploadDir, resolvedCommitSha: build.commitSha }
        : await cloneRepo(project, cloneDir, logger);

    const docsFileCount = countFiles(sourceDocsDir);
    logger.append(
      build.source === "upload"
        ? `resolved upload · ${project.docsPath}/ (${docsFileCount} files)`
        : `resolved ${resolvedCommitSha.slice(0, 7)} · ${project.docsPath}/ (${docsFileCount} files)`,
    );

    // Build directly inside the template's own directory rather than a fresh
    // copy elsewhere: builds are strictly sequential (one worker, polled one
    // at a time), so there's no concurrency to isolate against, and it keeps
    // node_modules co-located with the project root it belongs to — a copy +
    // symlinked node_modules elsewhere breaks Vite's module resolution once
    // DATA_DIR lives on a different path than the code (as it does in Docker).
    const { warnings } = migrateDocs({
      sourceDocsDir,
      destSiteDir: templateDir,
      siteUrl: `https://${project.slug}${docsSubdomainSeparator}docs.${orgDomain}`,
      projectName: project.name,
    });
    logger.append("docs.json → starlight nav config");
    for (const warning of warnings) logger.append(`warning: ${warning}`);

    rmSync(path.join(templateDir, "dist"), { recursive: true, force: true });
    await runQuietly(path.join(templateDir, "node_modules", ".bin", "astro"), ["build"], templateDir, ASTRO_BUILD_TIMEOUT_MS);
    const pageCount = countFiles(path.join(templateDir, "dist"), ".html");
    logger.append(`astro build · ${pageCount} pages`);

    const siteDir = path.join(dataDir, "sites", project.slug);
    const siteTmpDir = `${siteDir}.tmp`;
    rmSync(siteTmpDir, { recursive: true, force: true });
    copyDir(path.join(templateDir, "dist"), siteTmpDir);
    rmSync(siteDir, { recursive: true, force: true });
    mkdirSync(path.dirname(siteDir), { recursive: true });
    renameSync(siteTmpDir, siteDir);
    logger.append(`atomic swap → ${project.slug}${docsSubdomainSeparator}docs.${orgDomain}`);

    db.update(schema.builds)
      .set({ status: "succeeded", commitSha: resolvedCommitSha, finishedAt: new Date(), log: logger.text })
      .where(eq(schema.builds.id, build.id))
      .run();

    db.insert(schema.deployments)
      .values({ projectId: project.id, buildId: build.id, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: schema.deployments.projectId,
        set: { buildId: build.id, updatedAt: new Date() },
      })
      .run();
  } catch (error) {
    // Curated step lines above stay clean; the raw tool output that actually
    // explains a failure (execFile rejections carry stdout/stderr in the
    // message) only shows up here, when something's gone wrong.
    logger.append(error instanceof Error ? (error.stack ?? error.message) : String(error));
    failBuild(build.id, logger.text);
  } finally {
    rmSync(cloneDir, { recursive: true, force: true });
  }
}

async function cloneRepo(
  project: typeof schema.projects.$inferSelect,
  cloneDir: string,
  logger: BuildLogger,
): Promise<{ sourceDocsDir: string; resolvedCommitSha: string }> {
  logger.append(`clone ${project.repoFullName}@${project.branch}`);
  const installation = db
    .select()
    .from(schema.githubInstallations)
    .where(eq(schema.githubInstallations.projectId, project.id))
    .get();
  const appConfig = await getGithubAppConfig();
  if (!installation || !appConfig) throw new Error("GitHub App isn't connected for this project.");

  const app = new App({ appId: appConfig.appId, privateKey: appConfig.privateKey });
  const tokenResponse = await app.octokit.rest.apps.createInstallationAccessToken({
    installation_id: installation.installationId,
    request: { signal: AbortSignal.timeout(GITHUB_API_TIMEOUT_MS) },
  });
  const token = tokenResponse.data.token;
  logger.redact(token);

  mkdirSync(path.dirname(cloneDir), { recursive: true });
  const cloneUrl = `https://x-access-token:${token}@github.com/${project.repoFullName}.git`;
  await runQuietly("git", ["clone", "--depth", "1", "--branch", project.branch, cloneUrl, cloneDir], undefined, GIT_TIMEOUT_MS);
  const { stdout: resolvedSha } = await run("git", ["-C", cloneDir, "rev-parse", "HEAD"], { timeout: GIT_TIMEOUT_MS });

  return { sourceDocsDir: path.join(cloneDir, project.docsPath), resolvedCommitSha: resolvedSha.trim() };
}

// Runs a command without logging its raw output — only a thrown, rejected
// promise (whose message/stdout/stderr the caller's catch block logs) should
// ever surface a subprocess's actual console spew to the dashboard.
async function runQuietly(command: string, args: string[], cwd: string | undefined, timeout: number): Promise<void> {
  await run(command, args, { cwd, timeout });
}

function failBuild(buildId: string, log: string) {
  db.update(schema.builds)
    .set({ status: "failed", finishedAt: new Date(), log })
    .where(eq(schema.builds.id, buildId))
    .run();
}

async function main() {
  console.log("Huell build worker started.");
  while (true) {
    const build = await nextQueuedBuild();
    if (build) {
      console.log(`Building ${build.id} (project ${build.projectId})...`);
      await processBuild(build);
    } else {
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    }
  }
}

main();
