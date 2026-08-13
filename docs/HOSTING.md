# Where the stack lives

The front end is already live: `deploy.yml` builds `app/dist` and
pushes it to `gh-pages`, which serves osyle.xyz. Nothing in `api/` is
deployed anywhere, which is why signing in, coming back to your files,
and every other server-side promise does not work on the live site.

This note is about putting `api/` somewhere real.

## The one thing the api needs

**Node 22.5 or newer.** Storage goes through `node:sqlite`, which does
not exist before that. Nothing else is exotic: no native modules, no
database server, no object store. One process, one writable directory,
a reverse proxy in front.

## The GoDaddy cPanel plan

The panel's Software section offers **Setup Python App** and **Setup
Ruby App**, and no Node entry. That is not quite a verdict:
cPanel's **Application Manager**, in the same section, is where newer
builds register Node applications, under the same Passenger mechanism.

**SSH Access** is in the Security section, and one command settles it:

```bash
ssh <cpanel-user>@<host> node --version
```

- **v22.5 or newer.** The host can run the stack. Follow "On a plain
  box" below, with the application root outside `public_html` and
  `api.osyle.xyz` pointed at it through Application Manager.
- **v18 or v20.** Node is there but too old for `node:sqlite`. The
  storage driver would have to change to `better-sqlite3`, which is a
  native module that shared hosts often refuse to build. Possible;
  not a good first move.
- **`command not found`.** That plan has no Node at all, and the api
  cannot run on it whatever we do. Put the api on a box that offers a
  current Node and keep the domain where it is; the DNS below is the
  only thing that has to change.

Whatever the answer, shared hosting has two shapes worth knowing. The
process must stay alive, and a shared plan may recycle it; every
restart is harmless because the data is on disk, not in memory. And
`OSYLE_DATA` must point outside `public_html` at a directory that
survives deploys, because losing it loses everyone's apps.

## In a container, which is the short road

Any box with Docker, anywhere:

```bash
git clone https://github.com/glebich/CSS.git osyle && cd osyle/infra
cp api.env.example api.env      # then fill it in, see the file's own notes
docker compose -f compose.api.yml up -d --build
curl http://localhost:8787/health
```

`compose.api.yml` runs the api and its disk, and nothing else. The
five-container `docker-compose.yml` beside it is the shape this needs
once Postgres and MinIO take over storage; none of that is used today,
so standing it up first would be four idle containers.

Health answers with the storage state and the version, or says which
half is unwell. Put a reverse proxy in front for TLS. `Caddyfile` in
the same directory does the apex, the api subdomain, and the wildcard
in about twenty lines.

## On a plain box, no container

```bash
npm ci --workspaces --include-workspace-root
npm run build --workspace api
OSYLE_DATA=/var/lib/osyle NODE_ENV=production node api/dist/server.js
```

Keep it alive with whatever the box offers: systemd, pm2, Passenger.
The environment it reads is listed in `infra/api.env.example`, every
variable with the value it uses when absent.

## DNS

The site is on GitHub Pages and stays there. Only the api needs a
record of its own:

| Record | Host | Points to |
|--------|------|-----------|
| A | `api.osyle.xyz` | the box running the api |

## The last wire

Once the api answers at a real address, the deployed site has to be
told. It reads `VITE_OSYLE_API` at build time, passed by `deploy.yml`
from the repository variable **`OSYLE_API`**. Set it to
`https://api.osyle.xyz` in the repository settings, under Secrets and
variables, Actions, Variables. The next deploy picks it up and the
live site starts speaking to the stack. Leave it unset and the site
builds exactly as it does today, knowing no stack and saying so.

## The letters

Magic links go out through Resend when the stack has a key. Two
things are needed and neither belongs in the repository:
`OSYLE_RESEND_KEY`, and `OSYLE_MAIL_FROM` on a domain **verified in
Resend**, which is a DNS step in their dashboard before the first
letter goes anywhere.

Without a key nothing pretends: the door answers `sent: false`, says
no provider is configured, and hands the link back so a local stack
still works.

## Backups

`ops/backup.sh` copies `OSYLE_DATA`. It wants a cron entry, and
without one there is no restore.
