import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db, schema } from "@doctor/db";
import { requireSession } from "@/lib/session";
import { getProjectRole } from "@/lib/permissions";
import {
  addProjectMember,
  removeProjectMember,
  triggerBuild,
  updateProjectSettings,
} from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ExternalLinkIcon, GitBranchIcon, HammerIcon } from "lucide-react";
import type { BuildStatus, ProjectRole } from "@doctor/db";

function BuildStatusBadge({ status }: { status: BuildStatus }) {
  if (status === "succeeded") {
    return (
      <Badge variant="outline" className="gap-1.5 border-transparent bg-success-background text-success">
        <span className="size-1.5 rounded-full bg-current" />
        succeeded
      </Badge>
    );
  }
  if (status === "running") {
    return (
      <Badge variant="outline" className="gap-1.5 border-transparent bg-accent text-accent-foreground">
        <span className="size-1.5 animate-pulse-ring rounded-full bg-current" />
        running
      </Badge>
    );
  }
  if (status === "failed") {
    return (
      <Badge variant="outline" className="gap-1.5 border-transparent bg-destructive/10 text-destructive">
        <span className="size-1.5 rounded-full bg-current" />
        failed
      </Badge>
    );
  }
  return <Badge variant="outline">queued</Badge>;
}

function RoleBadge({ role }: { role: ProjectRole }) {
  if (role === "owner") return <Badge className="bg-accent text-accent-foreground">owner</Badge>;
  if (role === "editor") return <Badge variant="secondary">editor</Badge>;
  return <Badge variant="outline">viewer</Badge>;
}

export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const session = await requireSession();
  const { slug } = await params;

  const project = db.select().from(schema.projects).where(eq(schema.projects.slug, slug)).get();
  if (!project) notFound();

  const role = getProjectRole(session.user.id, project.id);
  if (!role && !session.user.isOrgAdmin) notFound();
  const canEdit = session.user.isOrgAdmin || role === "owner" || role === "editor";
  const canManageMembers = session.user.isOrgAdmin || role === "owner";

  const members = db
    .select({ member: schema.members, role: schema.projectMembers.role })
    .from(schema.projectMembers)
    .innerJoin(schema.members, eq(schema.projectMembers.memberId, schema.members.id))
    .where(eq(schema.projectMembers.projectId, project.id))
    .all();

  const builds = db
    .select()
    .from(schema.builds)
    .where(eq(schema.builds.projectId, project.id))
    .orderBy(desc(schema.builds.createdAt))
    .limit(10)
    .all();

  const orgDomain = process.env.ORG_DOMAIN ?? "example.com";
  const boundUpdateSettings = updateProjectSettings.bind(null, project.id);
  const boundAddMember = addProjectMember.bind(null, project.id);
  const boundTriggerBuild = triggerBuild.bind(null, project.id);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">{project.name}</h1>
          <a
            href={`https://${project.slug}.docs.${orgDomain}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            {project.slug}.docs.{orgDomain}
            <ExternalLinkIcon className="size-3" />
          </a>
        </div>
        {canEdit && (
          <form action={boundTriggerBuild}>
            <Button type="submit" disabled={!project.repoFullName}>
              <HammerIcon data-icon="inline-start" />
              Rebuild
            </Button>
          </form>
        )}
      </div>

      <Card className="animate-rise">
        <CardHeader>
          <CardTitle className="text-base">Repository</CardTitle>
          <CardDescription>
            {project.repoFullName ? project.repoFullName : "No repository connected yet."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {canManageMembers && (
            <Button variant="outline" render={<Link href={`/api/github/install?project=${project.slug}`} />}>
              <GitBranchIcon data-icon="inline-start" />
              {project.repoFullName ? "Reconnect repository" : "Connect repository"}
            </Button>
          )}
        </CardContent>
      </Card>

      {canEdit && (
        <Card className="animate-rise" style={{ animationDelay: "50ms" }}>
          <CardHeader>
            <CardTitle className="text-base">Build settings</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={boundUpdateSettings} className="flex flex-wrap items-end gap-4">
              <Field>
                <FieldLabel htmlFor="branch">Branch</FieldLabel>
                <Input id="branch" name="branch" defaultValue={project.branch} className="w-40" />
              </Field>
              <Field>
                <FieldLabel htmlFor="docsPath">Docs path</FieldLabel>
                <Input id="docsPath" name="docsPath" defaultValue={project.docsPath} className="w-40" />
              </Field>
              <Button type="submit">Save</Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card className="animate-rise" style={{ animationDelay: "100ms" }}>
        <CardHeader>
          <CardTitle className="text-base">Builds</CardTitle>
        </CardHeader>
        <CardContent>
          {builds.length === 0 ? (
            <p className="text-sm text-muted-foreground">No builds yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Commit</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Started</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {builds.map((build) => (
                  <TableRow key={build.id}>
                    <TableCell className="font-mono text-xs tabular-nums">{build.commitSha.slice(0, 7)}</TableCell>
                    <TableCell>
                      <BuildStatusBadge status={build.status} />
                    </TableCell>
                    <TableCell className="text-xs tabular-nums text-muted-foreground">
                      {build.createdAt.toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card className="animate-rise" style={{ animationDelay: "150ms" }}>
        <CardHeader>
          <CardTitle className="text-base">Project members</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {canManageMembers && (
            <form action={boundAddMember} className="flex items-end gap-2">
              <Field className="flex-1">
                <FieldLabel htmlFor="member-email">Org member email</FieldLabel>
                <Input id="member-email" name="email" type="email" required />
              </Field>
              <Field>
                <FieldLabel htmlFor="role">Role</FieldLabel>
                <Select name="role" defaultValue="viewer">
                  <SelectTrigger id="role" className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="viewer">Viewer</SelectItem>
                      <SelectItem value="editor">Editor</SelectItem>
                      <SelectItem value="owner">Owner</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Button type="submit">Add</Button>
            </form>
          )}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="w-0" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map(({ member, role: memberRole }) => (
                <TableRow key={member.id}>
                  <TableCell className="text-sm">{member.name}</TableCell>
                  <TableCell>
                    <RoleBadge role={memberRole} />
                  </TableCell>
                  <TableCell>
                    {canManageMembers && (
                      <form action={removeProjectMember.bind(null, project.id, member.id)}>
                        <Button type="submit" variant="ghost" size="sm">
                          Remove
                        </Button>
                      </form>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
