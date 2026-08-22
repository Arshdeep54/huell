import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const members = sqliteTable("members", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  avatarUrl: text("avatar_url"),
  isOrgAdmin: integer("is_org_admin", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

// Single-row table (id is always "1"): the GitHub App identity for this instance,
// populated either via the in-dashboard manifest flow or by hand in .env as a fallback.
export const githubAppConfig = sqliteTable("github_app_config", {
  id: text("id").primaryKey(),
  appId: integer("app_id").notNull(),
  slug: text("slug").notNull(),
  clientId: text("client_id").notNull(),
  clientSecret: text("client_secret").notNull(),
  webhookSecret: text("webhook_secret").notNull(),
  privateKey: text("private_key").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const invites = sqliteTable("invites", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  invitedBy: text("invited_by").notNull().references(() => members.id),
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

export const buildSources = ["github", "upload"] as const;
export type BuildSource = (typeof buildSources)[number];

export const builds = sqliteTable("builds", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  source: text("source", { enum: buildSources }).notNull().default("github"),
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
