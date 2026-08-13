# The probe

Two files that answer one question: **can this host run the Osyle
api?**

The api needs `node:sqlite`, which exists only in Node 22.5 and newer.
On the GoDaddy cPanel account, shell access is disabled and the
Application Manager form offers no version picker, so the version
cannot be read any other way. This app is deployed once, asked, and
removed.

## Putting it there

1. Upload `app.js` and `package.json` to a folder in the account, for
   example `probe`, using cPanel's File Manager. It must sit **outside
   `public_html`**, which is where an application path belongs.
2. cPanel, **Application Manager**, **Register Application**:
   - Application Name: `probe`
   - Deployment Domain: any domain on the account
   - Application Path: `probe`
   - Deployment Environment: Production
   - No environment variables are needed.
3. **Deploy**, then open the application's URL in a browser.

## Reading the answer

It replies in JSON. The line that matters is `verdict`, and the two
that support it:

```json
{
  "version": "v22.11.0",
  "nodeSqlite": "yes",
  "verdict": "This host can run the Osyle api."
}
```

- **`nodeSqlite: "yes"`** — the host can run the api. Follow
  `docs/HOSTING.md`, section "On a plain box", and register the api
  the same way this probe was registered.
- **`nodeSqlite: "no"`** with a version below 22.5 — Node is there and
  too old. `nodeSqliteError` says exactly how it failed.
- **An error page, or a page that never loads** — Passenger could not
  start it, which on a form with no runtime picker usually means the
  host has no Node at all. That is the answer too.

## Afterwards

Remove the application in Application Manager and delete the folder.
It is a question, not a service, and leaving a stray app registered on
a domain is untidy at best.
