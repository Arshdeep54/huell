import { signIn } from "@/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ThemeToggle } from "@/components/theme-toggle";
import { BookOpenTextIcon, TriangleAlertIcon } from "lucide-react";

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const orgDomain = process.env.ORG_DOMAIN ?? "your-org.com";

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background">
      <ThemeToggle className="absolute top-5 right-5" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 [background-image:radial-gradient(var(--border)_1px,transparent_1px)] [background-size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,black_10%,transparent_70%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl animate-rise"
        style={{ animationDuration: "9s", animationIterationCount: "infinite", animationDirection: "alternate" }}
      />

      <div className="relative flex w-full max-w-sm flex-col items-center gap-8 px-4">
        <div className="flex items-center gap-2.5 animate-rise">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <BookOpenTextIcon className="size-5" />
          </div>
          <span className="text-lg font-semibold tracking-tight">Doctor</span>
        </div>

        <Card className="w-full animate-rise" style={{ animationDelay: "60ms" }}>
          <CardHeader>
            <CardTitle>Sign in</CardTitle>
            <CardDescription className="text-pretty">
              Access is invite-only. Ask an org admin to invite your email first.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <LoginError searchParams={searchParams} />
            <form
              action={async () => {
                "use server";
                await signIn("google", { redirectTo: "/dashboard" });
              }}
            >
              <Button type="submit" className="w-full">
                Continue with Google
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground animate-rise" style={{ animationDelay: "120ms" }}>
          Self-hosted for {orgDomain}
        </p>
      </div>
    </main>
  );
}

async function LoginError({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  if (!error) return null;
  return (
    <Alert variant="destructive">
      <TriangleAlertIcon data-icon="inline-start" />
      <AlertDescription>
        {error === "AccessDenied"
          ? "This email hasn't been invited to this organization."
          : "Sign-in failed. Please try again."}
      </AlertDescription>
    </Alert>
  );
}
