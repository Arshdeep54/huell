"use server";

import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import AdmZip from "adm-zip";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@doctor/db";
import { requireOrgAdmin, requireSession } from "@/lib/session";
import { hasProjectRole } from "@/lib/permissions";
import { signOut } from "@/auth";

const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

export async function signOutAction() {
  await signOut({ redirectTo: "/login" });
}

function slugify(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function inviteMember(formData: FormData) {
  const session = await requireOrgAdmin();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) throw new Error("Email is required.");

  const alreadyMember = db.select().from(schema.members).where(eq(schema.members.email, email)).get();
  if (alreadyMember) throw new Error("This person is already a member.");

  db.insert(schema.invites)
    .values({
      id: randomUUID(),
      email,
      invitedBy: session.user.id,
      createdAt: new Date(),
    })
    .onConflictDoNothing()
    .run();

  revalidatePath("/dashboard/members");
}

export async function removeMember(formData: FormData) {
  const session = await requireOrgAdmin();
  const memberId = String(formData.get("memberId") ?? "");
  if (memberId === session.user.id) throw new Error("You can't remove yourself.");
  db.delete(schema.members).where(eq(schema.members.id, memberId)).run();
  revalidatePath("/dashboard/members");
}

export async function createProject(formData: FormData) {
  const session = await requireSession();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Project name is required.");

  const slug = slugify(name);
  if (!slug) throw new Error("Project name must contain letters or numbers.");

  const existing = db.select().from(schema.projects).where(eq(schema.projects.slug, slug)).get();
  if (existing) throw new Error("A project with this name already exists.");

  const projectId = randomUUID();
  const now = new Date();

  db.insert(schema.projects)
    .values({
      id: projectId,
      name,
      slug,
      branch: "main",
      docsPath: "docs",
      createdBy: session.user.id,
      createdAt: now,
    })
    .run();

  db.insert(schema.projectMembers)
    .values({
      id: randomUUID(),
      projectId,
      memberId: session.user.id,
      role: "owner",
      createdAt: now,
    })
    .run();

  redirect(`/dashboard/projects/${slug}`);
}

export async function addProjectMember(projectId: string, formData: FormData) {
  const session = await requireSession();
  if (!hasProjectRole(session.user.id, projectId, "owner", session.user.isOrgAdmin)) {
    throw new Error("Only project owners can add members.");
  }

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = String(formData.get("role") ?? "viewer") as "owner" | "editor" | "viewer";

  const member = db.select().from(schema.members).where(eq(schema.members.email, email)).get();
  if (!member) throw new Error("No org member found with that email. Invite them to the org first.");

  const existing = db
    .select()
    .from(schema.projectMembers)
    .where(and(eq(schema.projectMembers.projectId, projectId), eq(schema.projectMembers.memberId, member.id)))
    .get();
  if (existing) throw new Error("Already a member of this project.");

  db.insert(schema.projectMembers)
    .values({
      id: randomUUID(),
      projectId,
      memberId: member.id,
      role,
      createdAt: new Date(),
    })
    .run();

  revalidatePath(`/dashboard/projects`);
}

export async function removeProjectMember(projectId: string, memberId: string) {
  const session = await requireSession();
  if (!hasProjectRole(session.user.id, projectId, "owner", session.user.isOrgAdmin)) {
    throw new Error("Only project owners can remove members.");
  }
  db.delete(schema.projectMembers)
    .where(and(eq(schema.projectMembers.projectId, projectId), eq(schema.projectMembers.memberId, memberId)))
    .run();
  revalidatePath(`/dashboard/projects`);
}

export async function updateProjectSettings(projectId: string, formData: FormData) {
  const session = await requireSession();
  if (!hasProjectRole(session.user.id, projectId, "editor", session.user.isOrgAdmin)) {
    throw new Error("You don't have permission to edit this project.");
  }

  const branch = String(formData.get("branch") ?? "main").trim() || "main";
  const docsPath = String(formData.get("docsPath") ?? "docs").trim() || "docs";

  db.update(schema.projects).set({ branch, docsPath }).where(eq(schema.projects.id, projectId)).run();
  revalidatePath(`/dashboard/projects`);
}

export async function disconnectProjectRepo(projectId: string) {
  const session = await requireSession();
  if (!hasProjectRole(session.user.id, projectId, "owner", session.user.isOrgAdmin)) {
    throw new Error("Only project owners can disconnect the repository.");
  }
  db.update(schema.projects).set({ repoFullName: null }).where(eq(schema.projects.id, projectId)).run();
  revalidatePath(`/dashboard/projects`);
}

export async function selectProjectRepo(projectId: string, formData: FormData) {
  const session = await requireSession();
  if (!hasProjectRole(session.user.id, projectId, "owner", session.user.isOrgAdmin)) {
    throw new Error("Only project owners can set the connected repository.");
  }

  const repoFullName = String(formData.get("repoFullName") ?? "");
  if (!repoFullName) throw new Error("Pick a repository.");

  db.update(schema.projects).set({ repoFullName }).where(eq(schema.projects.id, projectId)).run();

  const project = db.select().from(schema.projects).where(eq(schema.projects.id, projectId)).get();
  redirect(`/dashboard/projects/${project?.slug}`);
}

export async function triggerBuild(projectId: string) {
  const session = await requireSession();
  if (!hasProjectRole(session.user.id, projectId, "editor", session.user.isOrgAdmin)) {
    throw new Error("You don't have permission to trigger a build.");
  }

  const installation = db
    .select()
    .from(schema.githubInstallations)
    .where(eq(schema.githubInstallations.projectId, projectId))
    .get();

  if (installation) {
    db.insert(schema.builds)
      .values({
        id: randomUUID(),
        projectId,
        source: "github",
        commitSha: "HEAD",
        status: "queued",
        triggeredBy: session.user.id,
        createdAt: new Date(),
      })
      .run();
    revalidatePath(`/dashboard/projects`);
    return;
  }

  const dataDir = process.env.DATA_DIR ?? "./data";
  const uploadDir = path.join(dataDir, "uploads", projectId);
  if (!existsSync(path.join(uploadDir, "docs.json"))) {
    throw new Error("Connect a GitHub repository or upload a docs.zip before building.");
  }

  db.insert(schema.builds)
    .values({
      id: randomUUID(),
      projectId,
      source: "upload",
      commitSha: `upload-${new Date().toISOString().slice(0, 19)}`,
      status: "queued",
      triggeredBy: session.user.id,
      createdAt: new Date(),
    })
    .run();

  revalidatePath(`/dashboard/projects`);
}

export async function uploadDocsZip(projectId: string, formData: FormData) {
  const session = await requireSession();
  if (!hasProjectRole(session.user.id, projectId, "editor", session.user.isOrgAdmin)) {
    throw new Error("You don't have permission to upload docs for this project.");
  }

  const file = formData.get("docsZip");
  if (!(file instanceof File) || file.size === 0) throw new Error("Choose a .zip file.");
  if (!file.name.toLowerCase().endsWith(".zip")) throw new Error("File must be a .zip archive.");
  if (file.size > MAX_UPLOAD_BYTES) throw new Error("Archive is too large (20MB limit).");

  const dataDir = process.env.DATA_DIR ?? "./data";
  const buildId = randomUUID();
  // Persisted per-project (not per-build): the builder reads from here on every
  // build for an upload-sourced project, including rebuilds that don't come with
  // a fresh zip. Each upload replaces the previous one outright.
  const extractDir = path.join(dataDir, "uploads", projectId);
  rmSync(extractDir, { recursive: true, force: true });
  mkdirSync(extractDir, { recursive: true });

  const zip = new AdmZip(Buffer.from(await file.arrayBuffer()));
  zip.extractAllTo(extractDir, true);

  // A zip created from a folder often wraps everything in one top-level
  // directory (e.g. "docs/"). Flatten it so docs.json ends up at extractDir's root.
  if (!existsSync(path.join(extractDir, "docs.json"))) {
    const { readdirSync, renameSync } = await import("node:fs");
    const entries = readdirSync(extractDir, { withFileTypes: true });
    const onlyDir = entries.length === 1 && entries[0].isDirectory() ? entries[0].name : null;
    const wrapped = onlyDir ? path.join(extractDir, onlyDir) : null;
    if (wrapped && existsSync(path.join(wrapped, "docs.json"))) {
      for (const entry of readdirSync(wrapped)) {
        renameSync(path.join(wrapped, entry), path.join(extractDir, entry));
      }
      rmSync(wrapped, { recursive: true, force: true });
    }
  }

  if (!existsSync(path.join(extractDir, "docs.json"))) {
    rmSync(extractDir, { recursive: true, force: true });
    throw new Error("Archive doesn't contain a docs.json at its root.");
  }

  db.insert(schema.builds)
    .values({
      id: buildId,
      projectId,
      source: "upload",
      commitSha: `upload-${new Date().toISOString().slice(0, 19)}`,
      status: "queued",
      triggeredBy: session.user.id,
      createdAt: new Date(),
    })
    .run();

  revalidatePath(`/dashboard/projects`);
}
