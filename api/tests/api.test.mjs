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
/* Shrink the vault budgets so the caps can be exercised without
   moving megabytes. Defaults are 5 MB a file, 64 MB a vault, 500 paths. */
process.env.OSYLE_VAULT_FILE_BYTES = "3500";
process.env.OSYLE_VAULT_BYTES = "4096";
process.env.OSYLE_VAULT_PATHS = "3";

const { buildApp } = await import("../dist/app.js");
const { resetLimitsForTests } = await import("../dist/limits.js");
const { platformDb } = await import("../dist/db.js");

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
const skyKey = created.json().resident.apiKey;
check("the resident is born holding its key", typeof skyKey === "string" && skyKey.length > 10);

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

/* the resident database, straight and through the SDK's http transport;
   every door opens only for the resident's own key */
const keyless = await app.inject({
  method: "POST",
  url: "/rdb/skyrecall/rows/drills",
  payload: { kind: "radio-calls", score: 0.82 },
});
check("a keyless caller is locked out", keyless.statusCode === 401);
const wrongKey = await app.inject({
  method: "POST",
  url: "/rdb/skyrecall/rows/drills",
  headers: { "x-osyle-key": "not-the-key" },
  payload: { kind: "radio-calls", score: 0.82 },
});
check("a wrong key is locked out", wrongKey.statusCode === 401);
const inserted = await app.inject({
  method: "POST",
  url: "/rdb/skyrecall/rows/drills",
  headers: { "x-osyle-key": skyKey },
  payload: { kind: "radio-calls", score: 0.82 },
});
check("a row inserts", inserted.statusCode === 201 && inserted.json().kind === "radio-calls");

const ghost = await app.inject({ method: "GET", url: "/rdb/nobody/rows/drills" });
check("an unknown resident's database is unreachable", ghost.statusCode === 404);

const { createClient } = await import("../../packages/sdk/dist/index.js");
const sdk = createClient("skyrecall", {
  transport: "http",
  baseUrl: "http://osyle.test",
  key: skyKey,
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

/* the key turns: the old one dies as the new one is born */
const rotated = await app.inject({ method: "POST", url: "/residents/skyrecall/key", cookies });
const freshKey = rotated.json().apiKey;
check(
  "the owner rotates the key",
  rotated.statusCode === 200 && typeof freshKey === "string" && freshKey !== skyKey,
);
const oldKeyNow = await app.inject({
  method: "GET",
  url: "/rdb/skyrecall/rows/drills",
  headers: { "x-osyle-key": skyKey },
});
check("the old key stops opening", oldKeyNow.statusCode === 401);
const newKeyNow = await app.inject({
  method: "GET",
  url: "/rdb/skyrecall/rows/drills",
  headers: { "x-osyle-key": freshKey },
});
check("the new key opens", newKeyNow.statusCode === 200);

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
check(
  "the partner door hands over the resident's key",
  typeof door.json().resident.apiKey === "string" && door.json().resident.apiKey.length > 10,
);
const claim = await app.inject({ method: "GET", url: door.json().claimLink });
check("partner claim link signs the builder in", claim.json().ok === true);
const survival2 = await app.inject({ method: "GET", url: "/survival" });
check(
  "a new arrival is not yet alive",
  survival2.json().total === 2 && survival2.json().alive === 1,
);

/* hardening: expiries first, then the budgets, then the walls */

const staleLink = `stale-${Date.now()}`;
platformDb()
  .prepare("INSERT INTO magic_links (token, email, created_at) VALUES (?, ?, ?)")
  .run(staleLink, "old@example.com", new Date(Date.now() - 16 * 60_000).toISOString());
const expiredLink = await app.inject({ method: "GET", url: `/auth/verify?token=${staleLink}` });
check(
  "an expired magic link refuses",
  expiredLink.statusCode === 400 && expiredLink.json().error.includes("expired"),
);

platformDb()
  .prepare("UPDATE sessions SET created_at = ? WHERE token = ?")
  .run(new Date(Date.now() - 31 * 24 * 60 * 60_000).toISOString(), cookie2.osyle_session);
const staleMe = await app.inject({ method: "GET", url: "/auth/me", cookies: cookie2 });
check("a thirty-one day old session expires", staleMe.json().user === null);

/* the vault budgets, against a fresh resident under the shrunk caps */
const lab = await app.inject({
  method: "POST",
  url: "/residents",
  cookies,
  payload: { slug: "budget-lab", name: "Budget Lab" },
});
check("the budget lab opens", lab.statusCode === 201);

const put = (path, bytes) =>
  app.inject({
    method: "PUT",
    url: `/residents/budget-lab/files/${path}`,
    cookies,
    headers: { "content-type": "application/octet-stream" },
    payload: bytes,
  });

const oversized = await put("big.bin", Buffer.alloc(3600, 1));
check(
  "a file past the per-file cap refuses with 413",
  oversized.statusCode === 413 && oversized.json().error.includes("tops out"),
);

const longPath = await put(`${"a".repeat(201)}.txt`, Buffer.from("x"));
check("an absurd path refuses", longPath.statusCode === 400);

check("a file inside the caps lands", (await put("a.txt", Buffer.alloc(3000, 1))).statusCode === 201);
check("a second path lands", (await put("b.txt", Buffer.from("tiny"))).statusCode === 201);
check("a third path lands", (await put("c.txt", Buffer.from("tiny"))).statusCode === 201);
const fourthPath = await put("d.txt", Buffer.from("tiny"));
check(
  "a fourth path refuses at the path cap",
  fourthPath.statusCode === 413 && fourthPath.json().error.includes("paths"),
);

const overBudget = await put("a.txt", Buffer.alloc(2000, 1));
check(
  "a version past the vault budget refuses and says what remains",
  overBudget.statusCode === 413 && typeof overBudget.json().remainingBytes === "number",
);

/* the walls: the rationed doors, then the general door, health exempt */
resetLimitsForTests();
let rationed;
for (let i = 0; i < 6; i += 1) {
  rationed = await app.inject({
    method: "POST",
    url: "/auth/link",
    payload: { email: "burst@example.com" },
  });
}
check(
  "the sixth magic link in a burst is walled with retry-after",
  rationed.statusCode === 429 && Number(rationed.headers["retry-after"]) >= 1,
);

/* the report lives with the resident: append-only, capped, owned */
const noReport = await app.inject({
  method: "GET",
  url: "/residents/skyrecall/report",
  cookies,
});
check("an unexamined resident has no report", noReport.json().report === null);

const badVitality = await app.inject({
  method: "PUT",
  url: "/residents/skyrecall/report",
  cookies,
  payload: { vitality: 140, findings: 3 },
});
check("an impossible vitality refuses", badVitality.statusCode === 400);

const rep1 = await app.inject({
  method: "PUT",
  url: "/residents/skyrecall/report",
  cookies,
  payload: {
    vitality: 61,
    findings: 9,
    lenses: [
      { key: "design", score: 55, findings: 3 },
      { key: "code", score: 70.4, findings: 2 },
      { key: "x".repeat(80), score: 10, findings: 1 },
      "not a lens",
    ],
  },
});
check("a report is recorded", rep1.statusCode === 201);
check(
  "dirty lenses are dropped, clean ones rounded",
  rep1.json().report.lenses.length === 2 && rep1.json().report.lenses[1].score === 70,
);

await app.inject({
  method: "PUT",
  url: "/residents/skyrecall/report",
  cookies,
  payload: { vitality: 66, findings: 7 },
});
const repRead = await app.inject({
  method: "GET",
  url: "/residents/skyrecall/report",
  cookies,
});
check(
  "the latest examination fronts the history",
  repRead.json().report.vitality === 66 && repRead.json().history.length === 2,
);

const reportAnon = await app.inject({
  method: "GET",
  url: "/residents/skyrecall/report",
});
check("the report needs its owner", reportAnon.statusCode === 401);

/* the address, served: public pages straight out of the Vault */
const servedFile = await app.inject({
  method: "GET",
  url: "/serve/skyrecall/src/index.html",
});
check(
  "the stack serves the newest version publicly",
  servedFile.statusCode === 200 &&
    servedFile.headers["content-type"].includes("text/html") &&
    servedFile.body === "<h1>one</h1>",
);

const servedRoot = await app.inject({ method: "GET", url: "/serve/skyrecall/" });
check(
  "the bare address resolves to an index",
  servedRoot.statusCode === 200 && servedRoot.headers["content-type"].includes("text/html"),
);

const servedRedirect = await app.inject({ method: "GET", url: "/serve/skyrecall" });
check(
  "the slug alone walks through the same door",
  servedRedirect.statusCode === 302 &&
    servedRedirect.headers.location === "/serve/skyrecall/",
);

const servedMiss = await app.inject({
  method: "GET",
  url: "/serve/skyrecall/no/such/file.js",
});
check(
  "a missing file gets the honest page, not a stack trace",
  servedMiss.statusCode === 404 && servedMiss.body.includes("Nothing lives at this path"),
);

const servedGhost = await app.inject({ method: "GET", url: "/serve/nobody-here/" });
check("an unknown resident gets the same honest page", servedGhost.statusCode === 404);

const servedDots = await app.inject({
  method: "GET",
  url: "/serve/skyrecall/..%2F..%2Fetc%2Fpasswd",
});
check("upward dots are refused", servedDots.statusCode === 400);

/* the custom domain: owned like the resident, validated like DNS,
   one wearer per name, and the serving door answers by Host header */
const domainSet = await app.inject({
  method: "PUT",
  url: "/residents/skyrecall/domain",
  cookies,
  payload: { domain: "Sky-Recall.Example.COM" },
});
check(
  "the owner dresses the resident in a domain",
  domainSet.statusCode === 200 &&
    JSON.parse(domainSet.body).domain === "sky-recall.example.com",
);
const domainBad = await app.inject({
  method: "PUT",
  url: "/residents/skyrecall/domain",
  cookies,
  payload: { domain: "not a domain" },
});
check("a malformed domain is refused", domainBad.statusCode === 400);
const domainRoof = await app.inject({
  method: "PUT",
  url: "/residents/skyrecall/domain",
  cookies,
  payload: { domain: "sky.osyle.app" },
});
check("the platform's roof cannot be worn", domainRoof.statusCode === 400);
/* cookie2's session was aged to death above, so the neighbor who
   tries to take the name signs in fresh; the link allowance is spent
   by the earlier auth tests, so it resets first */
resetLimitsForTests();
const link3 = await app.inject({
  method: "POST",
  url: "/auth/link",
  payload: { email: "neighbor@example.com" },
});
const verify3 = await app.inject({ method: "GET", url: link3.json().devLink });
const cookie3 = { osyle_session: verify3.cookies.find((c) => c.name === "osyle_session").value };
await app.inject({
  method: "POST",
  url: "/residents",
  cookies: cookie3,
  payload: { slug: "second-home", name: "Second Home" },
});
const domainTaken = await app.inject({
  method: "PUT",
  url: "/residents/second-home/domain",
  cookies: cookie3,
  payload: { domain: "sky-recall.example.com" },
});
check("a worn domain refuses a second wearer", domainTaken.statusCode === 409);
const domainStranger = await app.inject({
  method: "PUT",
  url: "/residents/skyrecall/domain",
  cookies: cookie3,
  payload: { domain: "thief.example.com" },
});
check("a stranger cannot dress another's resident", domainStranger.statusCode === 404);
const servedByName = await app.inject({
  method: "GET",
  url: "/",
  headers: { host: "sky-recall.example.com" },
});
check(
  "the stack answers by name",
  servedByName.statusCode === 200 && servedByName.body.includes("<h1>one</h1>"),
);
const healthOtherHost = await app.inject({
  method: "GET",
  url: "/health",
  headers: { host: "unknown.example.com" },
});
check("an unknown name changes nothing", healthOtherHost.statusCode === 200);
const domainOff = await app.inject({
  method: "PUT",
  url: "/residents/skyrecall/domain",
  cookies,
  payload: { domain: "" },
});
check(
  "the domain comes off cleanly",
  domainOff.statusCode === 200 && JSON.parse(domainOff.body).domain === null,
);
const servedGone = await app.inject({
  method: "GET",
  url: "/",
  headers: { host: "sky-recall.example.com" },
});
check("a shed name stops answering", servedGone.statusCode === 404);

/* the round: the caretaker's look, on the clock and on demand */
const { runRound } = await import("../dist/rounds.js");
const looked = await runRound();
check("the round looks at every resident", looked >= 2);
check("a fresh pulse is not retaken within the day", (await runRound()) === 0);
const pulseGet = await app.inject({
  method: "GET",
  url: "/residents/skyrecall/pulse",
  cookies,
});
const pulseBody = pulseGet.json();
check(
  "the pulse reads back to the owner",
  pulseGet.statusCode === 200 &&
    pulseBody.pulse.files >= 1 &&
    pulseBody.pulse.indexOk === true &&
    pulseBody.pulse.brokenRefs === 0,
);
check(
  "the looks come back as a history",
  Array.isArray(pulseBody.history) &&
    pulseBody.history.length >= 1 &&
    pulseBody.history[0].lookedAt === pulseBody.pulse.lookedAt,
);
const ledger = platformDb()
  .prepare("SELECT COUNT(*) AS n FROM jobs WHERE kind = 'round.look' AND status = 'done'")
  .get();
check("every look lands in the ledger", ledger.n >= looked);
/* a reference to a file that is not there is seen for what it is */
await app.inject({
  method: "PUT",
  url: "/residents/second-home/files/index.html",
  cookies: cookie3,
  headers: { "content-type": "application/octet-stream" },
  payload: '<script src="missing.js"></script>',
});
const freshLook = await app.inject({
  method: "POST",
  url: "/residents/second-home/pulse",
  cookies: cookie3,
});
const fresh = freshLook.json();
check(
  "a fresh look counts the broken reference",
  freshLook.statusCode === 200 &&
    fresh.pulse.brokenRefs === 1 &&
    fresh.pulse.indexOk === true,
);
const strangerPulse = await app.inject({
  method: "GET",
  url: "/residents/skyrecall/pulse",
  cookies: cookie3,
});
check("a stranger cannot read the pulse", strangerPulse.statusCode === 404);

/* the repo door refuses malformed names before any network is asked;
   the fetch itself needs GitHub and is proven by the app suite */
const repoBadOwner = await app.inject({ method: "GET", url: "/fetch/github/bad.owner/app" });
check("a dotted owner is refused at the repo door", repoBadOwner.statusCode === 400);
const repoDots = await app.inject({ method: "GET", url: "/fetch/github/someone/..." });
check("dots alone are refused at the repo door", repoDots.statusCode === 400);

resetLimitsForTests();
let importWall;
for (let i = 0; i < 13; i += 1) {
  importWall = await app.inject({
    method: "POST",
    url: "/partner/import",
    payload: { email: `partner${i}@example.com`, name: `Burst ${i}` },
  });
}
check("the thirteenth partner import in an hour is walled", importWall.statusCode === 429);

resetLimitsForTests();
let flooded;
for (let i = 0; i < 241; i += 1) {
  flooded = await app.inject({ method: "GET", url: "/auth/me" });
}
check("the general door walls a flood", flooded.statusCode === 429);
const stillGreen = await app.inject({ method: "GET", url: "/health" });
check("health never gets walled", stillGreen.statusCode === 200);
resetLimitsForTests();

await app.close();
rmSync(process.env.OSYLE_DATA, { recursive: true, force: true });

if (failures > 0) {
  console.log(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nall checks passed");
