# Osyle

Where generated software lives. This is the monorepo: the product, the
platform, and the road between Demo Mode and Real Mode.

```
app/                the product surface (Vite + React), Demo Mode complete
api/                the modular monolith: auth, residents, Vault, the
                    per-resident database, health; plus the queue worker
packages/sdk/       @osyle/sdk, one API, two transports (local, http)
packages/shared/    the domain shapes both sides speak
infra/              the five-container compose stack and the Caddy edge
ops/                install, one-button update with rollback, backups
docs/PLAN.md        the staged plan and its delivery ledger
references/         engineering checklists
```

## Quick start

```
npm install
npm run build          # shared, sdk, api, app
npm test               # 25 api checks + the 18-step product journey
npm run dev:api        # api on :8787 (sqlite + filesystem data dir)
npm run dev:app        # product on :5173
```

## How the halves meet

The app runs entirely on seeded, deterministic Demo Mode data through
`@osyle/sdk`'s local transport. The api serves the same SDK shape over
http (`/rdb/:slug/...`), plus magic-link auth, residents, and the
versioned Vault. Real Mode is a transport flag, not a rewrite: every
surface already consumes the shapes in `packages/shared`, and the
backend's job is to produce them.

Storage drivers in this foundation are node:sqlite and the filesystem
under one data volume; the compose stack provisions Postgres, Redis,
and MinIO, which take over behind the same interfaces (`api/src/db.ts`,
`api/src/blobs.ts`) during Real Mode hardening. Known foundation debt,
scheduled there: sessions do not yet expire, rdb endpoints await their
per-resident keys, and the worker drains a table, not yet Redis.
