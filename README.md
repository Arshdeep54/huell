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
- [`huellup`](https://www.npmjs.com/package/huellup) — a companion CLI that scaffolds, validates, and locally previews a `docs/` folder, plus an MCP server so an AI coding agent can write valid docs against the real schema

## How it works

Four pieces, one Docker Compose file: a Caddy reverse proxy, the Next.js dashboard, a build worker that runs the Astro build for whichever project changed, and static output served straight off disk. No Kubernetes, no message broker, no object storage — SQLite for metadata, the filesystem for build output. See [Architecture](https://huell-docs.hiesenbug.dev/architecture) for the full request-flow breakdown.

## Getting started

Requirements: a Linux server, Docker + the Docker Compose plugin, a domain with DNS you control.

```bash
git clone <this-repo> huell && cd huell
./setup.sh
```

Full walkthrough, including DNS and first sign-in, is in the [Installation guide](https://huell-docs.hiesenbug.dev/getting-started/installation).

## Docs

Full documentation, kept up to date, lives at **[huell-docs.hiesenbug.dev](https://huell-docs.hiesenbug.dev)** — itself a Huell-built site:

- [Installation](https://huell-docs.hiesenbug.dev/getting-started/installation)
- [Configuration](https://huell-docs.hiesenbug.dev/getting-started/configuration) — every environment variable, what it's for
- [Migrating existing docs](https://huell-docs.hiesenbug.dev/guides/migrating-existing-docs) — bringing in a `docs.json` + `.mdx` folder with no restructuring
- [CLI and MCP server](https://huell-docs.hiesenbug.dev/guides/cli-and-mcp) — `huellup`, and wiring an AI agent up to write docs for you
- [Tunnel deployment](https://huell-docs.hiesenbug.dev/guides/tunnel-deployment) — for a server with no public IP

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for local development setup and the codebase layout.

## License

MIT — see [LICENSE](./LICENSE).
