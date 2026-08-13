/*
 * The probe.
 *
 * cPanel's Application Manager registers an application through
 * Passenger and never says which runtime it will use or which version
 * of it. Shell access is off on this account, so the version cannot be
 * read directly. This app exists to be deployed once and asked.
 *
 * It answers three things: whether the host runs Node at all, which
 * version, and whether `node:sqlite` loads. That last one is the whole
 * question for Osyle, because every resident, every stored byte, and
 * every per-resident database goes through it, and it exists only in
 * Node 22.5 and newer.
 *
 * Deliberately old-fashioned JavaScript: no import syntax, no optional
 * chaining, nothing after ES5. A probe that crashes on a syntax error
 * tells you nothing, and an ancient Node is one of the answers it is
 * meant to be able to report.
 */
var http = require("http");

function report() {
  var sqlite = "no";
  var sqliteWhy = "";
  try {
    require("node:sqlite");
    sqlite = "yes";
  } catch (err) {
    sqliteWhy = err && err.message ? String(err.message) : "unknown";
  }

  var major = 0;
  try {
    major = parseInt(String(process.version).replace(/^v/, "").split(".")[0], 10) || 0;
  } catch (err) {
    major = 0;
  }

  return {
    runtime: "node",
    version: process.version,
    majorVersion: major,
    platform: process.platform,
    arch: process.arch,
    nodeSqlite: sqlite,
    nodeSqliteError: sqliteWhy,
    /* the one sentence this whole exercise is for */
    verdict:
      sqlite === "yes"
        ? "This host can run the Osyle api."
        : "This host cannot run the Osyle api as written: node:sqlite is missing, which needs Node 22.5 or newer.",
  };
}

var server = http.createServer(function (req, res) {
  var body = JSON.stringify(report(), null, 2);
  res.writeHead(200, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  res.end(body + "\n");
});

/* Passenger hooks listen() and supplies its own socket; the port here
   only matters when this is run by hand. */
server.listen(process.env.PORT || 3000);
