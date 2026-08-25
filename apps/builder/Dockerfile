# Build context is the repo root. The builder needs the whole workspace at
# runtime (not just its own package): it clones repos with git, and every
# build symlinks templates/docs-site's installed node_modules.
FROM node:22-bookworm-slim AS base
RUN corepack enable && apt-get update && apt-get install -y --no-install-recommends ca-certificates git python3 make g++ && rm -rf /var/lib/apt/lists/*

FROM base AS deps
WORKDIR /repo
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY apps/builder/package.json apps/builder/package.json
COPY packages/db/package.json packages/db/package.json
COPY packages/docs-core/package.json packages/docs-core/package.json
COPY templates/docs-site/package.json templates/docs-site/package.json
RUN pnpm install --frozen-lockfile --filter @huell/builder --filter @huell/db --filter @huell/docs-core --filter @huell/docs-site-template

FROM base AS runtime
WORKDIR /repo
COPY --from=deps /repo/node_modules ./node_modules
COPY --from=deps /repo/apps/builder/node_modules ./apps/builder/node_modules
COPY --from=deps /repo/packages/db/node_modules ./packages/db/node_modules
COPY --from=deps /repo/packages/docs-core/node_modules ./packages/docs-core/node_modules
COPY --from=deps /repo/templates/docs-site/node_modules ./templates/docs-site/node_modules
COPY pnpm-workspace.yaml package.json ./
COPY packages/db packages/db
COPY packages/docs-core packages/docs-core
COPY apps/builder apps/builder
COPY templates/docs-site templates/docs-site
WORKDIR /repo/apps/builder
CMD ["pnpm", "start"]
