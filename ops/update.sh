#!/usr/bin/env bash
# One-button update with auto-rollback: pull, build, test; if anything
# fails, return to the commit that was running.
set -euo pipefail
cd "$(dirname "$0")/.."

BEFORE="$(git rev-parse HEAD)"
echo "osyle: updating from $BEFORE"
git pull --ff-only

if npm install --no-audit --no-fund && npm run build -w api && npm run test -w api; then
  echo "osyle: updated to $(git rev-parse HEAD)"
  echo "restart the api and worker to serve it"
else
  echo "osyle: update failed, rolling back to $BEFORE"
  git reset --hard "$BEFORE"
  npm install --no-audit --no-fund
  npm run build -w api
  exit 1
fi
