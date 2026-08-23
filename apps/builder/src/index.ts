import { execFile } from "node:child_process";
import { existsSync, mkdirSync, renameSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { App } from "octokit";
import { asc, eq } from "drizzle-orm";
import { copyDir } from "./copy-dir";
import { migrateDocs } from "./migrate-docs";
import { getGithubAppConfig } from "./github-app-config";

// tsx/node don't auto-load .env — do it before importing @doctor/db, since
// its module body reads DATA_DIR at import time. Opt-in: absent in Docker,
// where compose injects env vars directly.
const rootEnvPath = fileURLToPath(new URL("../../../.env", import.meta.url));
if (existsSync(rootEnvPath)) process.loadEnvFile(rootEnvPath);
const { db, schema } = await import("@doctor/db");

const run = promisify(execFile);
const POLL_INTERVAL_MS = 5000;

const dataDir = process.env.DATA_DIR ?? "./data";
const orgDomain = process.env.ORG_DOMAIN ?? "example.com";
const templateDir = fileURLToPath(new URL("../../../templates/docs-site", import.meta.url));

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
  if (build.source === "github" && !project.repoFullName) {
    failBuild(build.id, "Project has no repository connected.");
    return;
  }

  db.update(schema.builds)
    .set({ status: "running", startedAt: new Date() })
    .where(eq(schema.builds.id, build.id))
    .run();

  const cloneDir = path.join(dataDir, "work", `${build.id}-repo`);
  const uploadDir = path.join(dataDir, "uploads", build.id);
  const log: string[] = [];

  try {
    const { sourceDocsDir, resolvedCommitSha } =
      build.source === "upload"
        ? { sourceDocsDir: uploadDir, resolvedCommitSha: build.commitSha }
        : await cloneRepo(project, cloneDir, log);

    // Build directly inside the template's own directory rather than a fresh
    // copy elsewhere: builds are strictly sequential (one worker, polled one
    // at a time), so there's no concurrency to isolate against, and it keeps
    // node_modules co-located with the project root it belongs to — a copy +
    // symlinked node_modules elsewhere breaks Vite's module resolution once
    // DATA_DIR lives on a different path than the code (as it does in Docker).
    const { warnings } = migrateDocs({
      sourceDocsDir,
      destSiteDir: templateDir,
      siteUrl: `https://${project.slug}.docs.${orgDomain}`,
      projectName: project.name,
    });
    for (const warning of warnings) log.push(`warning: ${warning}`);

    rmSync(path.join(templateDir, "dist"), { recursive: true, force: true });
    log.push(await runStep(path.join(templateDir, "node_modules", ".bin", "astro"), ["build"], templateDir));

    const siteDir = path.join(dataDir, "sites", project.slug);
    const siteTmpDir = `${siteDir}.tmp`;
    rmSync(siteTmpDir, { recursive: true, force: true });
    copyDir(path.join(templateDir, "dist"), siteTmpDir);
    rmSync(siteDir, { recursive: true, force: true });
    mkdirSync(path.dirname(siteDir), { recursive: true });
    renameSync(siteTmpDir, siteDir);

    db.update(schema.builds)
      .set({ status: "succeeded", commitSha: resolvedCommitSha, finishedAt: new Date(), log: log.join("\n") })
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
    log.push(error instanceof Error ? (error.stack ?? error.message) : String(error));
    failBuild(build.id, log.join("\n"));
  } finally {
    rmSync(cloneDir, { recursive: true, force: true });
    rmSync(uploadDir, { recursive: true, force: true });
  }
}

async function cloneRepo(
  project: typeof schema.projects.$inferSelect,
  cloneDir: string,
  log: string[],
): Promise<{ sourceDocsDir: string; resolvedCommitSha: string }> {
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
  });
  const token = tokenResponse.data.token;

  mkdirSync(path.dirname(cloneDir), { recursive: true });
  const cloneUrl = `https://x-access-token:${token}@github.com/${project.repoFullName}.git`;
  log.push(await runStep("git", ["clone", "--depth", "1", "--branch", project.branch, cloneUrl, cloneDir]));
  const { stdout: resolvedSha } = await run("git", ["-C", cloneDir, "rev-parse", "HEAD"]);

  return { sourceDocsDir: path.join(cloneDir, project.docsPath), resolvedCommitSha: resolvedSha.trim() };
}

async function runStep(command: string, args: string[], cwd?: string): Promise<string> {
  const { stdout, stderr } = await run(command, args, { cwd });
  return [`$ ${command} ${args.join(" ")}`, stdout, stderr].filter(Boolean).join("\n");
}

function failBuild(buildId: string, log: string) {
  db.update(schema.builds)
    .set({ status: "failed", finishedAt: new Date(), log })
    .where(eq(schema.builds.id, buildId))
    .run();
}

async function main() {
  console.log("Doctor build worker started.");
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
