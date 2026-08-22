import { App } from "octokit";
import { getGithubAppConfig } from "@/lib/github-app";

export function getGithubApp() {
  const config = getGithubAppConfig();
  if (!config) throw new Error("GitHub App isn't configured yet.");
  return new App({ appId: config.appId, privateKey: config.privateKey, webhooks: { secret: config.webhookSecret } });
}

export async function getInstallationOctokit(installationId: number) {
  return getGithubApp().getInstallationOctokit(installationId);
}
