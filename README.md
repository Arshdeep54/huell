<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/logo-wordmark-dark.svg">
    <source media="(prefers-color-scheme: light)" srcset="assets/logo-wordmark-light.svg">
    <img alt="Huell" src="assets/logo-wordmark-dark.svg" width="240">
  </picture>
</p>

A self-hostable docs platform: connect a GitHub repo (or just upload a `docs.zip`), and Huell builds and publishes a clean, searchable docs site for it — on your own server, under your own domain, with no vendor lock-in.

<p align="center">
  <a href="https://www.npmjs.com/package/huellup"><img alt="npm version" src="https://img.shields.io/npm/v/huellup.svg"></a>
  <a href="LICENSE"><img alt="MIT license" src="https://img.shields.io/badge/license-MIT-blue.svg"></a>
</p>

Huell is one deployable instance per organization. There's no shared multi-tenant service — you run it, you own the data, you own the infrastructure.

## Why

Popular hosted docs platforms are great for authoring, but self-hosting at their enterprise tier often means a Kubernetes-scale deployment (MongoDB + PostgreSQL + Redis + object storage, 45–60 vCPUs) built for companies running dozens of large public docs sites. Huell targets the much more common case: a small team that wants their docs content (MDX + a nav config) built and served without a vendor contract or that much infrastructure. The whole stack is designed to run comfortably on a single small VM.

## Features

- **Invite-only org**, Google sign-in — the first person to sign in becomes org admin
- **Projects** connect to a GitHub repo (auto-rebuild on push) or accept a **`docs.zip` upload** — no GitHub required at all if you'd rather not connect one
- **Per-project roles** (owner/editor/viewer), independent of org-admin status
- One-click **GitHub App creation** from the dashboard (a manifest flow — no manual App setup)
- Docs sites built with [Astro Starlight](https://starlight.astro.build/): grouped/tabbed sidebar nav, search, dark mode by default, LaTeX math, and a familiar set of callout and content components (`Note`, `Tip`, `Warning`, `Card`, `Steps`, `Tabs`, `ParamField`, `ResponseField`, ...)
- Each project gets its own subdomain (`<slug>.docs.<your-domain>`) with automatic HTTPS
- Ships as Docker images + a Caddy reverse proxy; `setup.sh` brings the whole thing up with one command

## Architecture

| Piece | What it is |
| --- | --- |
| `apps/web` | The dashboard — Next.js. Auth, org/project/member management, GitHub App connect, docs.zip upload. |
| `apps/builder` | The build worker — polls for queued builds, clones the repo (or reads an uploaded zip), converts `docs.json` to Starlight's format, runs `astro build`, deploys atomically. |
| `packages/db` | Drizzle ORM schema + SQLite client, shared by both apps. |
| `templates/docs-site` | The Astro Starlight template every project's docs site is built from. |
| `deploy/Caddyfile` | Reverse proxy: routes the dashboard and every project's subdomain, TLS via Caddy's on-demand certificates. |

No Kubernetes, no message broker, no object storage — SQLite for metadata, the local filesystem for build output, one build worker processing one build at a time.

## Deploying

Requirements: a Linux server, Docker + the Docker Compose plugin, a domain with DNS you control.

```bash
git clone <this-repo> huell && cd huell
./setup.sh          # first run: creates .env from .env.example, then exits
# edit .env — see Configuration below
./setup.sh          # second run: builds images, migrates the DB, starts everything
```

Point DNS at your server before the first real sign-in:
- `DASHBOARD_URL`'s host → your server's IP
- `*.docs.<ORG_DOMAIN>` (wildcard) → your server's IP, for project subdomains

Once DNS resolves, open the dashboard and sign in with Google. The first sign-in becomes org admin. From there:
1. **Settings → GitHub** — click "Create GitHub App" (one click, no manual GitHub setup)
2. **New project** — connect a repo, or upload a `docs.zip`
3. Push to the connected branch (or re-upload) to rebuild

### Configuration

All configuration is environment variables in `.env` (see `.env.example` for the full annotated list):

| Variable | What it's for |
| --- | --- |
| `ORG_DOMAIN` | Root domain project docs are served under (`<slug>.docs.<ORG_DOMAIN>`) |
| `DASHBOARD_URL` | Full origin the dashboard itself is served at |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | From [Google Cloud Console](https://console.cloud.google.com/apis/credentials) — set the authorized redirect URI to `${DASHBOARD_URL}/api/auth/callback/google` |
| `AUTH_SECRET` | Random 32+ byte secret for session cookies — `openssl rand -base64 32` |
| `GITHUB_APP_*` | Leave unset — created via the dashboard's manifest flow instead. Only fill in if you'd rather create the GitHub App by hand. |
| `DATA_DIR` | Where the SQLite DB and all build output live. Must be an absolute path (`/data` in Docker). |

### Migrating existing docs

If you already have a `docs/` folder in the common `docs.json` + `.mdx` + `images/` shape, it works with Huell with no restructuring — connect the repo or zip the `docs/` folder and upload it. Supported `docs.json` fields: `navigation` (flat, grouped, or tabbed), `colors.primary` (used as the site's accent color), `navbar.links`/`navbar.primary`.

Known gaps in the migration: `CodeGroup` renders as stacked code blocks rather than switchable tabs, and an OpenAPI spec (`api.openapi`) is copied as a static file rather than turned into generated reference pages.

## Local development

```bash
pnpm install
pnpm db:migrate        # applies packages/db/migrations to $DATA_DIR
pnpm dev:web            # dashboard at localhost:3000
pnpm worker              # build worker, separate terminal
```

You'll need Google OAuth credentials in `.env` even for local dev (see Configuration above) — there's no auth bypass.

## License

MIT — see [LICENSE](./LICENSE).
