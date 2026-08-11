#!/usr/bin/env node
/**
 * The backup and cold-start rehearsal, stage 15. Nothing is trusted
 * until it has been restored once: boot the built api cold, put a
 * resident with real bytes in it, back the volume up with the same
 * script the nightly cron runs, destroy the volume, restore from the
 * archive, boot cold again, and prove the bytes survived. Timings are
 * reported so cold start stays a known number.
 *
 * Run from the repo root after a build: node ops/rehearsal.mjs
 */
import { spawn, execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PORT = 8792;
const BASE = `http://127.0.0.1:${PORT}`;

const home = mkdtempSync(join(tmpdir(), "osyle-rehearsal-"));
const dataDir = join(home, "data");
const backupDir = join(home, "backups");

function boot() {
  return spawn("node", ["dist/server.js"], {
    cwd: join(ROOT, "api"),
    env: { ...process.env, OSYLE_DATA: dataDir, PORT: String(PORT), NODE_ENV: "test" },
    stdio: ["ignore", "ignore", "inherit"],
  });
}

async function waitForHealth() {
  const started = performance.now();
  for (let i = 0; i < 100; i += 1) {
    try {
      const res = await fetch(`${BASE}/health`);
      if (res.ok) return (performance.now() - started) / 1000;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error("the api never came up");
}

function stop(proc) {
  return new Promise((resolve) => {
    proc.once("exit", resolve);
    proc.kill();
  });
}

const checks = [];
function check(name, ok) {
  checks.push(ok);
  console.log(`${ok ? "ok" : "FAIL"}  ${name}`);
}

let api = boot();
try {
  const firstCold = await waitForHealth();
  check(`cold start serves health in ${firstCold.toFixed(1)} s`, firstCold < 5);

  /* a resident with real bytes, through the same doors the product uses */
  const door = await fetch(`${BASE}/partner/import`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "rehearsal@osyle.app", name: "SkyRecall", slug: "skyrecall" }),
  });
  const claim = await fetch(`${BASE}${(await door.json()).claimLink}`);
  const cookie = claim.headers.get("set-cookie").split(";")[0];
  const wrote = await fetch(`${BASE}/residents/skyrecall/files/index.html`, {
    method: "PUT",
    headers: { "content-type": "application/octet-stream", cookie },
    body: "<h1>survives the fire</h1>",
  });
  check("a real file lands before the backup", wrote.status === 201);
  await fetch(`${BASE}/rdb/skyrecall/kv/streak`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ value: 7 }),
  });
  await stop(api);
  api = null;

  /* the same script the nightly cron runs */
  execFileSync("bash", [join(ROOT, "ops", "backup.sh")], {
    env: { ...process.env, OSYLE_DATA: dataDir, OSYLE_BACKUPS: backupDir },
    stdio: "inherit",
  });
  const archives = readdirSync(backupDir).filter((f) => f.startsWith("osyle-"));
  check("the backup archive exists", archives.length === 1);

  /* the fire */
  rmSync(dataDir, { recursive: true, force: true });

  /* the restore is exactly what DEPLOY.md says: tar -xzf and restart */
  execFileSync("tar", ["-xzf", join(backupDir, archives[0]), "-C", home]);

  api = boot();
  const secondCold = await waitForHealth();
  check(`the restored volume boots cold in ${secondCold.toFixed(1)} s`, secondCold < 5);

  const back = await fetch(`${BASE}/rdb/skyrecall/kv/streak`);
  check("the resident database survived", (await back.json()).value === 7);

  const survival = await fetch(`${BASE}/survival`);
  check("the survival index remembers the resident", (await survival.json()).total === 1);

  /* sessions live in the volume, so the pre-fire cookie still opens the vault */
  const bytes = await fetch(`${BASE}/residents/skyrecall/files/index.html`, {
    headers: { cookie },
  });
  check("the pre-fire session still opens the vault", bytes.status === 200);
  check("the vault bytes survived the fire", (await bytes.text()) === "<h1>survives the fire</h1>");

  const ok = checks.every(Boolean);
  console.log(ok ? "\nthe rehearsal passes" : "\nthe rehearsal fails");
  process.exitCode = ok ? 0 : 1;
} finally {
  if (api) api.kill();
  rmSync(home, { recursive: true, force: true });
}
