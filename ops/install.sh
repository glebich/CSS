#!/usr/bin/env bash
# One-script install on a clean box: dependencies, build, tests.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "osyle: installing"
npm install --no-audit --no-fund
npm run build -w api
npm run build -w app
npm run test -w api
echo "osyle: installed and self-tested"
echo "run the api:    npm run start -w api"
echo "run the worker: npm run worker -w api"
echo "full stack:     cd infra && docker compose up -d   (needs .env)"
