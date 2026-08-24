import { requireOrgAdmin } from "@/lib/session";
import { getGithubAppConfig } from "@/lib/github-app";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { CheckIcon, TriangleAlertIcon } from "lucide-react";

export default async function GithubSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireOrgAdmin();
  const config = getGithubAppConfig();
  const { error } = await searchParams;

  const dashboardUrl = process.env.DASHBOARD_URL ?? "http://localhost:3000";
  const manifest = {
    name: `Doctor (${new URL(dashboardUrl).hostname})`,
    url: dashboardUrl,
    hook_attributes: { url: `${dashboardUrl}/api/github/webhook` },
    redirect_url: `${dashboardUrl}/api/github/manifest-callback`,
    setup_url: `${dashboardUrl}/api/github/install/callback`,
    setup_on_update: true,
    public: false,
    default_permissions: { contents: "read", metadata: "read", pull_requests: "read" },
    default_events: ["push"],
  };

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold">GitHub connection</h1>
        <p className="text-sm text-muted-foreground">
          One GitHub App for this instance. Projects connect individual repos to it.
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <TriangleAlertIcon data-icon="inline-start" />
          <AlertDescription>Couldn&apos;t finish creating the GitHub App. Try again.</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {config ? "Connected" : "Not connected"}
          </CardTitle>
          <CardDescription>
            {config
              ? `Projects can now connect repos through ${config.slug}.`
              : "Create a GitHub App scoped to this instance's domain."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {config ? (
            <Badge variant="secondary">
              <CheckIcon data-icon="inline-start" />
              {config.slug}
            </Badge>
          ) : (
            <form method="post" action="https://github.com/settings/apps/new">
              <input type="hidden" name="manifest" value={JSON.stringify(manifest)} />
              <Button type="submit">Create GitHub App</Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
