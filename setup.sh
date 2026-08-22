#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is required. Install it first: https://docs.docker.com/engine/install/"
  exit 1
fi
if ! docker compose version >/dev/null 2>&1; then
  echo "Docker Compose (v2, the 'docker compose' plugin) is required."
  exit 1
fi

if [ ! -f .env ]; then
  cp .env.example .env
  echo "Created .env from .env.example — fill in ORG_DOMAIN, DASHBOARD_URL, and the Google OAuth"
  echo "credentials before continuing (GitHub App can be set up later from the dashboard)."
  exit 0
fi

mkdir -p data

echo "Building images..."
docker compose build

echo "Running database migrations..."
docker compose run --rm worker pnpm --filter @doctor/db migrate

echo "Starting Doctor..."
docker compose up -d

echo
echo "Doctor is starting. Once DNS for your domain (and *.docs.<ORG_DOMAIN>) points at this"
echo "server, the dashboard will be reachable at the DASHBOARD_URL set in .env."
echo "Sign in there with Google — the first person to sign in becomes the org admin."
