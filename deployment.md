# Huell Deployment Guide

This document is the single source of truth for deploying Huell. It covers every
supported topology, the trade-offs between them, and the exact decisions an
operator makes at each step. It is written to be implementable as-is: the goal is
to reduce the *current* multi-step, multi-file deployment to a single
`./huell install` command that detects the environment and configures itself.

---

## 1. The problem this document solves

Huell is a self-hosted docs platform. It has one dashboard (Next.js), one build
worker, and a reverse proxy that serves:

- the dashboard at `DASHBOARD_URL` (e.g. `docs.example.com`), and
- every project's docs at `<slug>.docs.<ORG_DOMAIN>` (e.g. `vortexdb.docs.example.com`).

Two things make self-hosting genuinely hard, and they are the reason this guide
exists:

1. **TLS issuance is coupled to reachability.** The current `deploy/Caddyfile`
   uses Caddy's *on-demand HTTP-01* TLS. HTTP-01 only works when Let's Encrypt
   can reach port 80 on the machine. That assumption breaks on any server where
   port 80 is occupied (nginx), filtered, or not publicly reachable (NAT).

2. **The reverse proxy wants to own ports 80/443.** `docker-compose.yml` binds
   Caddy to `80:80` and `443:443`. If another proxy already owns those ports, the
   deployment fails or silently conflicts.

These two problems are not really about Huell. They are the same two problems
every self-hosted app behind a custom domain has. The rest of this guide breaks
them apart and shows how each topology resolves them.

---

## 2. The three independent variables

Every deployment topology is just a combination of three independent facts. Understanding
these is more important than memorizing any single setup.

| Variable | The question | Possible answers |
| --- | --- | --- |
| **Ports** | Is port 80/443 free to bind? | Free, occupied by another proxy (nginx/Caddy/Traefik), or filtered |
| **Reachability** | Can the public internet reach this machine directly? | Yes (public IP), no (NAT / campus / firewall) |
| **TLS issuance** | How does a certificate get created for a domain? | HTTP-01 (needs port 80), DNS-01 (needs DNS API access), or delegated to a tunnel provider |

Everything below is a named combination of these three. The important design move is
that **TLS issuance should be made independent of reachability and ports** by
preferring DNS-01 everywhere possible. Once DNS-01 is the default, port 80 stops
being a constraint, and the number of "special cases" collapses dramatically.

---

## 3. Guiding principles

Before the topologies, the principles that every one of them should obey:

1. **One ingress per server.** Only one process owns ports 80/443. Everything else
   binds to an internal/loopback port and is reached through that ingress.
2. **Routing is hostname-based, never port-based.** No one should visit
   `example.com:8080`. Every service gets a name; the ingress maps name → internal
   port.
3. **TLS is automatic.** Certificates are issued and renewed without an operator
   manually running `certbot`. The operator supplies credentials (or a public IP),
   never runs cert issuance by hand.
4. **The dashboard is the source of truth.** Projects, custom domains, and routes
   are managed in the UI, not by editing config files on disk.
5. **DNS is the one thing that can never be automated away.** Traffic has to reach
   the server, and a CA has to verify domain ownership. Both reduce to a DNS record
   or DNS API access. Everything else is automatable.
6. **No post-deploy SSH.** After the initial install, an operator should never need
   to log in to add a project, add a custom domain, or issue a certificate.

---

## 4. Topology summary

| # | Name | Port 80/443 | Reachability | TLS approach | When to use |
| --- | --- | --- | --- | --- | --- |
| A | Direct exposure | Free | Public IP | HTTP-01 or DNS-01 | Fresh single-purpose server |
| B | Behind an existing proxy | Occupied (nginx) | Public IP | Delegated to that proxy, or DNS-01 | Shared server already running nginx |
| C | NAT / no public IP | Irrelevant | No inbound | Tunnel provider edge TLS | Lab/campus/office box |
| D | Filtered/restricted ports | 80 filtered, 443 free | Public IP | DNS-01 (no port 80 needed) | ISP blocks 80 |
| E | Custom domains | Any of the above | Any | DNS-01 (per-domain) | Arbitrary `docs.otherdomain.com` |

A through D are about *reaching Huell at all*. E is orthogonal — it's about
serving a project at an arbitrary domain once Huell is already running, and it
layers on top of whichever of A–D applies.

---

## 5. Topology A — Direct exposure (fresh server, ports free)

**Conditions:** public IP, ports 80/443 free and reachable.

This is the current default and the simplest case.

**How it works:**

- Caddy is the only ingress. It binds `80:80` and `443:443`.
- The dashboard gets a cert via plain automatic HTTPS (its hostname is known at boot).
- Project subdomains use Caddy's on-demand TLS, gated by the
  `apps/web/src/app/api/caddy/ask-domain/route.ts` endpoint, which answers "is this
  hostname a real project?" before Caddy issues a cert.
- One wildcard DNS record (`*.docs.<ORG_DOMAIN>`) covers every project, present and future.

**DNS records required:**

```
docs.example.com        A  → <server IP>
*.docs.example.com      A  → <server IP>
```

**Pros:** zero extra moving parts; automatic per-project certs; no DNS API token needed.

**Cons:** requires port 80 to be free and publicly reachable — the exact thing that
breaks on shared or NAT'd servers.

**Install flow (target):**

```
./huell install
  → org domain? docs.example.com
  → email? you@example.com
  → [detects: 80/443 free, public IP]  → selects Direct mode
  → writes .env, builds, migrates, starts
```

---

## 6. Topology B — Behind an existing proxy (nginx owns 80/443)

**Conditions:** public IP, but another proxy (nginx, Caddy, Traefik) already owns
80/443 — a shared server running other projects.

This is the case that causes the most confusion, and it has two workable solutions.

### 6.1 Recommended: make the existing proxy the ingress for Huell too

Treat the existing proxy as the server's single front door, and add Huell to it.

**How it works:**

- Huell's Caddy (or the dashboard directly) is moved to an internal/loopback port
  and does **not** bind 80/443.
- The existing proxy (nginx) gets:
  - a `server` block for the dashboard → `127.0.0.1:3000`
  - one **wildcard** `server` block that extracts the project slug from the hostname
    and serves `data/sites/<slug>` directly off disk.

**The wildcard nginx block (the key to zero per-project work):**

```nginx
server {
    listen 443 ssl http2;
    server_name ~^(?<slug>[a-z0-9-]+)\.docs\.example\.com$;

    ssl_certificate     /etc/letsencrypt/live/docs.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/docs.example.com/privkey.pem;

    root /srv/huell/data/sites/$slug;
    try_files $uri $uri/index.html $uri.html /404.html;
}
```

With a **single wildcard cert** for `*.docs.example.com` (issued once via DNS-01),
every project is served automatically — no per-project cert, no reload.

**DNS records required (same as Topology A):**

```
docs.example.com        A  → <server IP>
*.docs.example.com      A  → <server IP>
```

**Wildcard cert (once, via DNS-01):**

```bash
certbot certonly --dns-cloudflare \
  --dns-cloudflare-credentials ~/.secrets/cloudflare.ini \
  -d "docs.example.com" -d "*.docs.example.com"
```

**Pros:** keeps a single ingress; no port conflict; wildcard cert = zero per-project
cert work.

**Cons:** for *custom* domains (Topology E) the wildcard no longer covers it, so
Huell must automate `certbot` + nginx reload — more moving parts than Caddy's
on-demand TLS.

### 6.2 Alternative: keep Caddy as the docs-plane gateway, SNI-stream to it

Keep Caddy as Huell's routing + TLS brain, but reach it through the existing proxy
using TLS SNI passthrough (nginx's `stream` module forwards raw 443 bytes to Caddy
based on SNI).

**How it works:** nginx `stream` block sniffs SNI; requests for `*.docs.example.com`
are forwarded (unterminated) to Caddy on an internal 443 port; Caddy terminates TLS
and does on-demand issuance. Dashboard traffic is handled by nginx directly.

**Pros:** keeps Caddy's on-demand TLS for arbitrary domains (nicer for Topology E).

**Cons:** `stream` SNI routing is advanced and fragile; the dashboard and docs sites
end up on two different proxies; operator confusion is high.

**Recommendation:** use 6.1. Reserve 6.2 for deployments where custom domains are the
primary use case and Caddy's on-demand TLS is worth the operational complexity.

---

## 7. Topology C — NAT / no public IP (tunnel)

**Conditions:** no inbound access — a lab box, office server, or home machine behind NAT.

Already implemented in the repo via `deploy/Caddyfile.tunnel` + `cloudflared`. This
is the one case where TLS is delegated to an edge provider and Caddy runs plain HTTP.

**How it works:**

- `cloudflared` makes an outbound-only connection to Cloudflare's edge.
- Cloudflare terminates public TLS; Caddy receives plain HTTP on internal port 80
  and does routing only (`auto_https off`).
- Project URLs use `<slug>-docs.<ORG_DOMAIN>` (hyphen separator) when wildcard
  certificate coverage isn't available, requiring one DNS route per project.

**DNS/config required:**

- Point the domain's DNS at Cloudflare; create a tunnel; route `docs.example.com`
  (and either a wildcard or per-project routes) to the tunnel.
- `CADDYFILE=Caddyfile.tunnel`, `DASHBOARD_HOST=<host>`, `AUTH_URL=https://<host>`,
  and `DOCS_SUBDOMAIN_SEPARATOR=-` (when no wildcard coverage).

**Pros:** works with zero inbound access; free with Cloudflare.

**Cons:** depends on a third-party edge; wildcard certificate coverage may require
Cloudflare's paid "Total TLS"; per-project DNS routes when wildcard isn't available.

Full details already live in `docs/guides/tunnel-deployment.mdx`.

---

## 8. Topology D — Filtered/restricted ports

**Conditions:** public IP, but port 80 is blocked or filtered by the ISP; 443 may or
may not be free.

**How it works:** switch TLS issuance to **DNS-01**. Because DNS-01 validates via a
TXT record rather than an HTTP request, port 80 is irrelevant. The gateway listens
only on 443 (or behind whatever is reachable) and certs are issued via the DNS API.

**Key insight:** this is *not* a special topology once DNS-01 is the default — it's
just "direct exposure with DNS-01 instead of HTTP-01." This is the strongest argument
for making DNS-01 the default across the board.

**DNS records + a DNS API token required:**

```
docs.example.com        A  → <server IP>
*.docs.example.com      A  → <server IP>
# plus a DNS provider token with zone/DNS edit scope for issuance
```

**Pros:** immune to port-80 blocking; wildcard certs possible (HTTP-01 can't do
wildcards at all).

**Cons:** requires DNS API credentials (a token) at install time.

---

## 9. Topology E — Custom domains per project (the orthogonal case)

**Conditions:** any of A–D, plus an admin wants a *specific project* at an arbitrary
domain like `docs.hiesenbug.dev` instead of `vortexdb.docs.example.com`.

This is the piece of the roadmap ("Admin-chosen custom domains per project") that is
not yet implemented, and it is the case where the "one wildcard covers everything"
shortcut stops working.

### Why custom domains are fundamentally different

The default docs domain is always `<slug>.docs.<ORG_DOMAIN>`. Because every project
shares that suffix, **one wildcard cert + one wildcard route** handles every project
forever. A custom domain is arbitrary and shares nothing, so it needs its own:

1. **DNS record** — `docs.hiesenbug.dev` must resolve to the server.
2. **TLS cert** — can't ride the wildcard; must be issued for that exact name.
3. **Route** — `docs.hiesenbug.dev` → that project's build output.

### The flow (what the admin does)

1. In project settings → **Custom domain**, the admin enters `docs.hiesenbug.dev`.
2. Huell saves it with status **`pending`** and shows one instruction:
   `CNAME docs.hiesenbug.dev → vortexdb.docs.example.com` (or an `A` → server IP).
3. Admin adds that one record at their registrar. *(This is the one unavoidable
   manual step — traffic must physically be routed.)*
4. Huell polls DNS; when the record resolves, it automatically:
   - issues a DNS-01 cert for `docs.hiesenbug.dev` (using the stored DNS token), and
   - activates the route (`docs.hiesenbug.dev` → `data/sites/<slug>`).
5. Status flips to **`verified`**. Done.

### The "one-click" version

If the admin's DNS provider is one Huell holds API credentials for, Huell can
**write the DNS record itself** in step 3 — reducing the flow to "paste the domain,
click Add, done" (the registrar only shows an ownership confirmation if Huell can't
programmatically prove it).

### Implementation requirements

- `customDomain` (nullable) + `customDomainStatus` (`pending`/`verified`) columns on
  `projects`.
- A **domain controller** that runs the lifecycle: `pending → resolving → issuing →
  verified`.
- A **DNS-01 cert provider** keyed by the stored DNS token.
- A route-registration step that tells the gateway "this hostname → this slug."
- Ownership validation *before* issuance (generalize the existing `ask-domain` check
  so nothing is issued or routed for a hostname that isn't tied to a real project).

---

## 10. The recommended end state: a detector-driven installer

The goal is to collapse A–E into a single command that detects the environment and
configures itself. The shape of that command:

```
./huell install
  → org domain? docs.example.com
  → email for ACME? you@example.com
  → optional: DNS API token? (paste, or skip for HTTP-01 fallback)
  → [detects ports, reachability, existing proxies]
  → selects a mode, writes .env + gateway config + any proxy include
  → builds, migrates, starts
```

### What the detector checks

| Probe | What it decides |
| --- | --- |
| `ss -tlnp` on 80/443 | Is another proxy running? (B vs A) |
| Public IP detection | Is the box directly reachable? (C vs A/B/D) |
| DNS token provided? | Use DNS-01 (wildcards, no port-80 need) or HTTP-01 |
| Port 80 reachable? | HTTP-01 viable, or forced DNS-01 |

### The modes it selects

| Detected | Mode | Result |
| --- | --- | --- |
| 80/443 free + public IP | Direct | Caddy owns 80/443, wildcard cert |
| nginx/other proxy owns 80/443 | Behind-proxy | Internal port + proxy include written + reloaded |
| No public IP | Tunnel | cloudflared, edge TLS, plain-HTTP Caddy |
| 80 blocked | DNS-01 | Gateway on 443, DNS-01 certs |

### The gateway as a programmatic component

Rather than hand-editing a Caddyfile and reloading, the gateway should be driven via
**Caddy's Admin API** (default `localhost:2019`). The dashboard becomes the source of
truth for routes and pushes changes with `POST /load` — no file editing, no reload
command, no SSH. This is what makes "add a project / add a custom domain" a
dashboard-only operation.

---

## 11. What can and cannot be automated

A hard truth, stated plainly so expectations stay honest:

**Automated fully:**

- TLS issuance and renewal (given a DNS token or public IP).
- Route registration for new projects and custom domains.
- Proxy config + reload.
- Custom domain lifecycle (pending → verified).

**Can be automated *only if* DNS API access is granted:**

- The DNS record creation for custom domains.

**Can never be automated away (always an operator action):**

- Pointing the root/wildcard DNS at the server (one-time at install).
- Pointing a custom domain at the server, *unless* DNS API access exists.

Everything else is plumbing, and the plan is to remove it from the operator's hands.

---

## 12. Implementation checklist (for the builder)

This section is the handoff: the concrete work implied by the guide above.

- [ ] Make DNS-01 the primary TLS path (wildcard `*.docs.<ORG_DOMAIN>` issued at install).
- [ ] Keep HTTP-01 as a fallback when no DNS token is provided and port 80 is reachable.
- [ ] Generalize `ask-domain` into a single hostname-authorization source of truth used
      by both TLS issuance and route registration.
- [ ] Add `customDomain` + `customDomainStatus` to the `projects` schema (migration).
- [ ] Build a domain controller for the `pending → resolving → issuing → verified` lifecycle.
- [ ] Add DNS-provider credentials to `.env` (a token + provider, e.g. Cloudflare).
- [ ] Drive the gateway via Caddy's Admin API instead of a mounted, hand-edited Caddyfile.
- [ ] Write the `./huell install` detector that selects A–E and configures itself.
- [ ] Generate the nginx include (and reload) automatically in Topology B.
- [ ] Add a wildcard-docs nginx `server` block template for Topology B.
- [ ] Ensure no post-deploy SSH is required for any project or custom-domain action.

---

## 13. Open questions / risks

- **Multi-provider DNS support.** DNS-01 requires supporting each provider's API
  (Cloudflare first, then Route53, GoDaddy, etc.). Scope this carefully.
- **Caddy Admin API security.** The API must be reachable by the dashboard but never
  exposed to the public. Bind it to the internal Docker network.
- **Ownership proof for custom domains.** The current `ask-domain` flow proves a
  project exists; custom domains additionally need domain-ownership proof (DNS record
  presence is the simplest signal).
- **Wildcard vs. on-demand for custom domains.** A wildcard can't cover arbitrary
  custom domains, so they need per-name DNS-01 issuance — confirm the ACME client
  handles this cleanly.
