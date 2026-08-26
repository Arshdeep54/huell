import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@huell/db";
import { requireSession } from "@/lib/session";
import { getInstallationOctokit } from "@/lib/octokit";
import { selectProjectRepo } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";

export default async function SelectRepoPage({ params }: { params: Promise<{ slug: string }> }) {
  await requireSession();
  const { slug } = await params;

  const project = db.select().from(schema.projects).where(eq(schema.projects.slug, slug)).get();
  if (!project) notFound();

  const installation = db
    .select()
    .from(schema.githubInstallations)
    .where(eq(schema.githubInstallations.projectId, project.id))
    .get();
  if (!installation) notFound();

  const octokit = await getInstallationOctokit(installation.installationId);
  const { data } = await octokit.rest.apps.listReposAccessibleToInstallation();
  const boundSelectRepo = selectProjectRepo.bind(null, project.id);

  return (
    <div className="mx-auto w-full max-w-lg">
      <Card>
        <CardHeader>
          <CardTitle>Pick a repository</CardTitle>
          <CardDescription>Which repo in this installation holds {project.name}&apos;s docs?</CardDescription>
        </CardHeader>
        <CardContent>
          {data.repositories.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>No repositories</EmptyTitle>
                <EmptyDescription>
                  The GitHub App installation doesn&apos;t have access to any repos yet.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <form action={boundSelectRepo} className="flex flex-col gap-2">
              {data.repositories.map((repo) => (
                <label
                  key={repo.id}
                  className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm has-[:checked]:border-primary has-[:checked]:bg-accent"
                >
                  <input type="radio" name="repo" value={`${repo.id}:${repo.full_name}`} required className="accent-primary" />
                  {repo.full_name}
                </label>
              ))}
              <Button type="submit" className="mt-2">
                Connect repository
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
