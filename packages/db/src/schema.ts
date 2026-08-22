import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const members = sqliteTable("members", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  avatarUrl: text("avatar_url"),
  isOrgAdmin: integer("is_org_admin", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const invites = sqliteTable("invites", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  token: text("token").notNull().unique(),
  invitedBy: text("invited_by").notNull().references(() => members.id),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  redeemedAt: integer("redeemed_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  repoFullName: text("repo_full_name"),
  branch: text("branch").notNull().default("main"),
  docsPath: text("docs_path").notNull().default("docs"),
  createdBy: text("created_by").notNull().references(() => members.id),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const projectRoles = ["owner", "editor", "viewer"] as const;
export type ProjectRole = (typeof projectRoles)[number];

export const projectMembers = sqliteTable("project_members", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  memberId: text("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
  role: text("role", { enum: projectRoles }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const githubInstallations = sqliteTable("github_installations", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().unique().references(() => projects.id, { onDelete: "cascade" }),
  installationId: integer("installation_id").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const buildStatuses = ["queued", "running", "succeeded", "failed"] as const;
export type BuildStatus = (typeof buildStatuses)[number];

export const builds = sqliteTable("builds", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  commitSha: text("commit_sha").notNull(),
  status: text("status", { enum: buildStatuses }).notNull().default("queued"),
  log: text("log"),
  triggeredBy: text("triggered_by").references(() => members.id),
  startedAt: integer("started_at", { mode: "timestamp" }),
  finishedAt: integer("finished_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const deployments = sqliteTable("deployments", {
  projectId: text("project_id").primaryKey().references(() => projects.id, { onDelete: "cascade" }),
  buildId: text("build_id").notNull().references(() => builds.id),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});
