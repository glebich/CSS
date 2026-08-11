# Deploying Osyle to your own box

From a clean Apple Silicon machine to the live domain in about an
hour, operated by a non-engineer. Every command is copy-paste; every
honest boundary is named at the end.

## What you need before starting

- A Mac (or any box) that stays on, with [OrbStack](https://orbstack.dev)
  or Docker Desktop installed.
- The `osyle.app` domain (or any domain you own) at a registrar,
  ideally on Cloudflare so the wildcard record and the tunnel are easy.
- This repository cloned on the box:

```bash
git clone https://github.com/glebich/CSS.git osyle && cd osyle
```

## 1. DNS, once

At your DNS provider, point these at the box (an A record to your
public IP, or route all three through a Cloudflare Tunnel to the box):

| Record | Host | Points to |
|--------|------|-----------|
| A or tunnel | `osyle.app` | the box |
| A or tunnel | `api.osyle.app` | the box |
| A or tunnel | `*.osyle.app` | the box |

With a Cloudflare Tunnel, TLS terminates at Cloudflare and nothing on
your network needs an open port. With direct A records, Caddy obtains
certificates itself; the wildcard certificate needs the DNS challenge,
which means giving Caddy a DNS API token (see Caddy's docs for your
provider).

## 2. Install and build, once

```bash
bash ops/install.sh
```

This installs dependencies, builds the api and the app, and runs the
api's own tests. It ends by telling you the run commands.

## 3. Secrets, once

```bash
cd infra
cat > .env <<'ENV'
POSTGRES_PASSWORD=choose-a-long-random-string
MINIO_PASSWORD=choose-another-long-random-string
ENV
```

## 4. Up

```bash
docker compose up -d
```

Five containers start: Caddy at the edge, the api, the worker,
Postgres with Redis, and MinIO. Verify from any machine:

```bash
curl https://api.osyle.app/health
```

You want `"ok":true`. The product itself is now at `https://osyle.app`.

## 5. Connect the app to the stack

Open `https://osyle.app`, press the `.` key on the landing to open the
settings sheet, and switch Real Mode on. The app probes the stack and
the claim door appears at the end of every real examination. If your
api lives at a different address, set it once in the browser console:

```js
localStorage.setItem("osyle.apiBase", "https://api.osyle.app")
```

## 6. Backups, on a schedule

`ops/backup.sh` snapshots the data volume. Schedule it nightly; on a
Mac the simple way is cron:

```bash
crontab -e
# add this line for a 03:30 nightly backup
30 3 * * * cd /path/to/osyle && bash ops/backup.sh
```

Do one restore drill before you trust it, and monthly after that. It
is automated:

```bash
npm run rehearse
```

That boots the api cold, plants a resident, backs it up with this
same script, destroys the volume, restores, and proves the bytes
survived. `npm run drill` puts 200 simulated people through a
resident and reports latencies; docs/DRILLS.md holds the last
numbers and the pass bars.

## 7. Updates

```bash
git pull
bash ops/update.sh
cd infra && docker compose up -d --build
```

The update script rebuilds and reruns the api tests before anything
restarts; if tests fail, nothing ships.

## The honest boundaries

- **Storage drivers.** The api runs on its sqlite and filesystem
  drivers against the `osyle_data` volume. Postgres and MinIO are
  provisioned and idle; they take over when their drivers land in Real
  Mode hardening. The swap points are `api/src/db.ts` and
  `api/src/blobs.ts`, and nothing else changes.
- **Resident addresses.** `{slug}.osyle.app` serves the product today;
  serving each resident's own files at its hostname root is the
  server-side serving stage. The Vault already holds the files,
  versioned.
- **Magic-link mail.** Claim links are minted and stored, but no mail
  provider is wired; in this era the claim completes in the same
  browser session, which is how the product uses it.
- **Model keys.** Live Studio edits need an Anthropic or Gemini key
  entered in the Studio's key sheet; keys stay in the visitor's
  browser.
- **Limits and budgets.** The api rations its doors per calling
  address (magic links, partner imports, and a general ceiling) and
  every vault has a budget: 5 MB a file, 64 MB across every version,
  500 paths. Raise them with `OSYLE_VAULT_FILE_BYTES`,
  `OSYLE_VAULT_BYTES`, and `OSYLE_VAULT_PATHS` in the api's
  environment. The limiter lives in the api process; a shared Redis
  window takes over when the stack spreads past one box.

## The one asset a human must export

The logo may only ever be the exported asset from Figma file
`o798c61sKzTcX4Xqtp9Icx`, node `2106:4`, never redrawn. The build
environment cannot reach Figma's asset host, so the committed avatar
is a documented reconstruction until someone with Figma access
exports that node as SVG and PNG and replaces
`app/public/brand/osyle-avatar.svg`. One export closes criterion 45.
