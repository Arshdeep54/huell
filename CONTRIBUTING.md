# Contributing to Huell

This covers running Huell from source. For how the product behaves — deployment, configuration, migrating docs — see the [hosted docs](https://huell-docs.hiesenbug.dev) instead; this file is about the codebase itself.

## Project layout

| Piece | What it is |
| --- | --- |
| `apps/web` | The dashboard — Next.js. Auth, org/project/member management, GitHub App connect, docs.zip upload. |
| `apps/builder` | The build worker — polls for queued builds, clones the repo (or reads an uploaded zip), converts `docs.json` to Starlight's format, runs `astro build`, deploys atomically. |
| `packages/db` | Drizzle ORM schema + SQLite client, shared by both apps. |
| `packages/docs-core` | The `docs.json` → Starlight migration logic, shared by the build worker and the `huellup` CLI. |
| `packages/cli` | `huellup` — the companion CLI and MCP server, published to npm. |
| `templates/docs-site` | The Astro Starlight template every project's docs site is built from. |
| `deploy/Caddyfile` | Reverse proxy: routes the dashboard and every project's subdomain, TLS via Caddy's on-demand certificates. |

## Local development

```bash
pnpm install
pnpm db:migrate   # applies packages/db/migrations to $DATA_DIR
pnpm dev:web      # dashboard at localhost:3000
pnpm worker       # build worker, separate terminal
```

You'll need Google OAuth credentials in `.env` even for local dev (see the [Configuration guide](https://huell-docs.hiesenbug.dev/getting-started/configuration)) — there's no auth bypass.

## Before opening a PR

```bash
pnpm typecheck
pnpm build:web
```

Both run in CI on every push and pull request — same commands, so failures show up locally first.
