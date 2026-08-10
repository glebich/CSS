/**
 * The API test: one resident's whole life through the foundation.
 * Sign in by magic link, take an address, write files, version them,
 * restore an old one, and let the resident's own database serve rows,
 * kv, and auth-lite. Runs against a throwaway data dir, no sockets.
 */
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

process.env.OSYLE_DATA = mkdtempSync(join(tmpdir(), "osyle-test-"));
process.env.NODE_ENV = "test";

const { buildApp } = await import("../dist/app.js");

const app = await buildApp();
let failures = 0;
function check(name, ok) {
  if (!ok) failures += 1;
  console.log(`${ok ? "ok" : "FAIL"}  ${name}`);
}

/* health first: the box tells the truth about itself */
const health = await app.inject({ method: "GET", url: "/health" });
check("health is green", health.statusCode === 200 && health.json().ok === true);

/* auth: a magic link becomes a session cookie */
const link = await app.inject({
  method: "POST",
  url: "/auth/link",
  payload: { email: "gleb@example.com" },
});
check("magic link issues in dev", link.statusCode === 200 && !!link.json().devLink);

const verify = await app.inject({ method: "GET", url: link.json().devLink });
check("magic link verifies", verify.statusCode === 200 && verify.json().ok === true);
const cookie = verify.cookies.find((c) => c.name === "osyle_session");
check("session cookie is set", !!cookie);
const cookies = { osyle_session: cookie.value };

const spent = await app.inject({ method: "GET", url: link.json().devLink });
check("a spent link refuses", spent.statusCode === 400);

const me = await app.inject({ method: "GET", url: "/auth/me", cookies });
check("me knows who I am", me.json().user?.email === "gleb@example.com");

/* residents: an address of one's own */
const anon = await app.inject({ method: "GET", url: "/residents" });
check("residents need a session", anon.statusCode === 401);

const created = await app.inject({
  method: "POST",
  url: "/residents",
  cookies,
  payload: { slug: "skyrecall", name: "SkyRecall" },
});
check("resident is created", created.statusCode === 201);

const dup = await app.inject({
  method: "POST",
  url: "/residents",
  cookies,
  payload: { slug: "skyrecall", name: "Imposter" },
});
check("a taken address refuses", dup.statusCode === 409);

const badSlug = await app.inject({
  method: "POST",
  url: "/residents",
  cookies,
  payload: { slug: "Bad Slug!", name: "Nope" },
});
check("a dirty slug refuses", badSlug.statusCode === 400);

/* the vault: versions, never overwrites, one-click restore */
const v1 = await app.inject({
  method: "PUT",
  url: "/residents/skyrecall/files/src/index.html",
  cookies,
  headers: { "content-type": "application/octet-stream" },
  payload: Buffer.from("<h1>one</h1>"),
});
check("first write is version 1", v1.statusCode === 201 && v1.json().file.version === 1);

const v2 = await app.inject({
  method: "PUT",
  url: "/residents/skyrecall/files/src/index.html",
  cookies,
  headers: { "content-type": "application/octet-stream" },
  payload: Buffer.from("<h1>two</h1>"),
});
check("second write is version 2", v2.json().file.version === 2);

const read = await app.inject({
  method: "GET",
  url: "/residents/skyrecall/files/src/index.html",
  cookies,
});
check("read returns the newest bytes", read.body === "<h1>two</h1>");

const old = await app.inject({
  method: "GET",
  url: "/residents/skyrecall/files/src/index.html?version=1",
  cookies,
});
check("any old version is readable", old.body === "<h1>one</h1>");

const versions = await app.inject({
  method: "GET",
  url: "/residents/skyrecall/versions/src/index.html",
  cookies,
});
check("history lists both versions", versions.json().versions.length === 2);

const restored = await app.inject({
  method: "POST",
  url: "/residents/skyrecall/restore/src/index.html",
  cookies,
  payload: { version: 1 },
});
check("restore makes the old the newest", restored.json().file.version === 3);

const afterRestore = await app.inject({
  method: "GET",
  url: "/residents/skyrecall/files/src/index.html",
  cookies,
});
check("restored bytes serve", afterRestore.body === "<h1>one</h1>");

const tree = await app.inject({ method: "GET", url: "/residents/skyrecall/files", cookies });
check("the tree shows one path at v3", tree.json().files.length === 1 && tree.json().files[0].version === 3);

const traversal = await app.inject({
  method: "PUT",
  url: "/residents/skyrecall/files/../escape",
  cookies,
  headers: { "content-type": "application/octet-stream" },
  payload: Buffer.from("nope"),
});
check("path traversal refuses", traversal.statusCode >= 400);

/* the resident database, straight and through the SDK's http transport */
const inserted = await app.inject({
  method: "POST",
  url: "/rdb/skyrecall/rows/drills",
  payload: { kind: "radio-calls", score: 0.82 },
});
check("a row inserts", inserted.statusCode === 201 && inserted.json().kind === "radio-calls");

const ghost = await app.inject({ method: "GET", url: "/rdb/nobody/rows/drills" });
check("an unknown resident's database is unreachable", ghost.statusCode === 404);

const { createClient } = await import("../../packages/sdk/dist/index.js");
const sdk = createClient("skyrecall", {
  transport: "http",
  baseUrl: "http://osyle.test",
  fetchImpl: async (url, init) => {
    const u = new URL(url);
    const res = await app.inject({
      method: init?.method ?? "GET",
      url: u.pathname + u.search,
      payload: init?.body,
      headers: init?.headers,
    });
    return new Response(res.rawPayload, {
      status: res.statusCode,
      headers: { "content-type": "application/json" },
    });
  },
});

const viaSdk = await sdk.rows("drills").insert({ kind: "checkride", score: 0.9 });
check("sdk http insert lands", typeof viaSdk.id === "string");
check("sdk http count sees both", (await sdk.rows("drills").count()) === 2);
const pilot = await sdk.auth.signIn("maria@example.com");
check("sdk http auth-lite signs in", pilot.email === "maria@example.com");
await sdk.kv.set("streak", 4);
check("sdk http kv round-trips", (await sdk.kv.get("streak", 0)) === 4);
check("sdk http kv falls back", (await sdk.kv.get("missing", 7)) === 7);

/* isolation: a second user cannot see the first user's resident */
const link2 = await app.inject({
  method: "POST",
  url: "/auth/link",
  payload: { email: "intruder@example.com" },
});
const verify2 = await app.inject({ method: "GET", url: link2.json().devLink });
const cookie2 = { osyle_session: verify2.cookies.find((c) => c.name === "osyle_session").value };
const foreign = await app.inject({
  method: "GET",
  url: "/residents/skyrecall/files",
  cookies: cookie2,
});
check("another user's vault refuses", foreign.statusCode === 404);

/* the survival index: the rdb touches above made skyrecall alive */
const survival = await app.inject({ method: "GET", url: "/survival" });
check(
  "survival counts the living",
  survival.json().alive === 1 && survival.json().total === 1,
);

/* the partner door: one call in, a resident and its address out */
const door = await app.inject({
  method: "POST",
  url: "/partner/import",
  payload: { email: "builder@partner.example", name: "Coffee Companion" },
});
check(
  "partner door mints a resident",
  door.statusCode === 201 && door.json().resident.address === "coffee-companion.osyle.app",
);
const claim = await app.inject({ method: "GET", url: door.json().claimLink });
check("partner claim link signs the builder in", claim.json().ok === true);
const survival2 = await app.inject({ method: "GET", url: "/survival" });
check(
  "a new arrival is not yet alive",
  survival2.json().total === 2 && survival2.json().alive === 1,
);

await app.close();
rmSync(process.env.OSYLE_DATA, { recursive: true, force: true });

if (failures > 0) {
  console.log(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nall checks passed");
