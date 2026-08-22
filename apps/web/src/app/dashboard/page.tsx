import Link from "next/link";
import { eq } from "drizzle-orm";
import { db, schema } from "@doctor/db";
import { requireSession } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Badge } from "@/components/ui/badge";
import { FolderGitIcon, PlusIcon } from "lucide-react";

export default async function ProjectsPage() {
  const session = await requireSession();

  const projects = session.user.isOrgAdmin
    ? db.select().from(schema.projects).all()
    : db
        .select({ project: schema.projects })
        .from(schema.projectMembers)
        .innerJoin(schema.projects, eq(schema.projectMembers.projectId, schema.projects.id))
        .where(eq(schema.projectMembers.memberId, session.user.id))
        .all()
        .map((row) => row.project);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Projects</h1>
          <p className="text-sm text-muted-foreground">Docs sites connected to this instance.</p>
        </div>
        <Button render={<Link href="/dashboard/projects/new" />}>
          <PlusIcon data-icon="inline-start" />
          New project
        </Button>
      </div>

      {projects.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FolderGitIcon />
            </EmptyMedia>
            <EmptyTitle>No projects yet</EmptyTitle>
            <EmptyDescription>Create a project and connect a GitHub repo to publish its docs.</EmptyDescription>
          </EmptyHeader>
          <Button render={<Link href="/dashboard/projects/new" />} variant="outline">
            Create your first project
          </Button>
        </Empty>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project, index) => (
            <Link key={project.id} href={`/dashboard/projects/${project.slug}`}>
              <Card
                className="animate-rise transition-[transform,box-shadow,border-color] duration-180 ease-(--ease-out) hover:-translate-y-0.5 hover:border-ring/40 hover:shadow-lg"
                style={{ animationDelay: `${index * 60}ms` }}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{project.name}</CardTitle>
                    {project.repoFullName ? (
                      <Badge variant="outline" className="gap-1.5 border-transparent bg-success-background text-success">
                        <span className="size-1.5 rounded-full bg-current" />
                        Connected
                      </Badge>
                    ) : (
                      <Badge variant="outline">Not connected</Badge>
                    )}
                  </div>
                  <CardDescription className="text-pretty">
                    {project.repoFullName ?? "No repository connected"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="font-mono text-xs text-muted-foreground">{project.slug}.docs</CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
