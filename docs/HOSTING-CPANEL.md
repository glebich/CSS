# Putting the stack on the GoDaddy cPanel host

The front end is already live: `deploy.yml` builds `app/dist` and pushes
it to `gh-pages`, which serves osyle.xyz. Nothing in `api/` is deployed
anywhere, which is why signing in, coming back to your files, and every
other server-side promise does not work on the live site today.

This note is about putting `api/` somewhere real. It names what the
cPanel host can and cannot do, so the decision is made on facts.

## The one thing to check first

The api stores everything through `node:sqlite`, which exists only in
**Node 22.5 and newer**. In cPanel, open **Setup Node.js App** and read
the versions the plan offers.

- **Node 22 or newer is offered.** The host can run the stack. Follow
  "Standing it up" below.
- **Only Node 18 or 20 is offered.** The stack cannot start as written.
  Two honest ways forward: swap the storage driver to `better-sqlite3`
  (one file, `api/src/db.ts`, plus `api/src/rdb.ts`, and it is a native
  module that shared hosts sometimes refuse to build), or run the api
  somewhere that offers a current Node and leave cPanel serving the
  site.

## What shared hosting will and will not give this app

- **A process that stays alive.** The api is not PHP; it is a long
  running server. cPanel runs it under Passenger, which is fine, but a
  shared plan may recycle it. Every restart is harmless: the data lives
  on disk, not in memory.
- **A writable disk that persists.** `OSYLE_DATA` must point at a
  directory outside `public_html` that survives deploys. This is where
  residents, the Vault's bytes, and every per-resident database live.
  Losing it loses everyone's apps.
- **A port it cannot publish.** Passenger proxies a domain to the app;
  the app should keep listening on `PORT` from the environment. Point
  `api.osyle.xyz` at it rather than a port number.
- **Cron.** The nightly backup in `ops/backup.sh` wants a cron entry.
  cPanel has one. Without it there is no restore.

## Standing it up

1. Create the subdomain `api.osyle.xyz` in cPanel.
2. **Setup Node.js App**: application root = a folder outside
   `public_html`, application URL = `api.osyle.xyz`, startup file =
   `dist/server.js`, Node = 22 or newer.
3. Upload the repository, then in that folder run `npm ci` and
   `npm run build --workspace api`.
4. Environment variables: `OSYLE_DATA` to the persistent directory,
   `NODE_ENV=production`, `OSYLE_APP_ORIGIN=https://osyle.xyz` so the
   browser is allowed to speak to it with credentials.
5. Start the app, then check `https://api.osyle.xyz/health`. It answers
   with `ok`, the storage state, and its version, or it says which half
   is unwell.
6. Add the cron entry for `ops/backup.sh` with the same `OSYLE_DATA`.

## After it answers

The app finds the stack through two values in the browser:
`osyle.realMode` and `osyle.apiBase`. Once the api is live at a real
address, those stop being a hidden switch and become the default; that
is a one-line change in `app/src/store.tsx` and the same in the two
surfaces that read them.

## The letters

Magic links are now posted through Resend when the stack is given a
key. Set these beside the others, and never in the repository:

- `OSYLE_RESEND_KEY`, the provider key.
- `OSYLE_MAIL_FROM`, an address on a domain verified in Resend, for
  example `Osyle <hello@osyle.xyz>`. Resend refuses to send from a
  domain it has not verified, so this is a DNS step in their dashboard
  before the first letter goes anywhere.
- `OSYLE_API_ORIGIN`, `https://api.osyle.xyz`, so the link in the
  letter is absolute and comes back to the right machine.
- `OSYLE_APP_ORIGIN`, `https://osyle.xyz`, which is both the only
  origin the browser may call with credentials and the only place a
  letter's link will send anyone.

Without a key nothing pretends: the door answers `sent: false`, says
no provider is configured, and hands the link back so a local stack
still works. With a key, a person can open the letter on any machine
and land in the app already signed in.
