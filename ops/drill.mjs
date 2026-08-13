#!/usr/bin/env node
/**
 * The 200-person drill, stage 15. Boots the built api on a real
 * socket, mints one resident through the partner door, then puts two
 * hundred simulated people through it over real HTTP: each signs in,
 * writes rows, reads the count, and round-trips kv, twenty at a time.
 * The report is honest numbers: p50, p95, worst, and every error.
 *
 * The drill arrives from one address, so it raises the general door's
 * ceiling for its own process via OSYLE_RATE_MAX; in production every
 * person is their own address and the default ceiling stands.
 *
 * Run from the repo root after a build: node ops/drill.mjs
 */
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PEOPLE = Number(process.env.DRILL_PEOPLE ?? 200);
const AT_ONCE = 20;
const PORT = 8791;
const BASE = `http://127.0.0.1:${PORT}`;
/*
 * Two gates, because one number could not do the job.
 *
 * The absolute budget says nobody waits pathologically. It was
 * calibrated on a development machine, where p95 lands near 45 ms, and
 * a shared CI runner is two to five times slower at everything: the
 * same healthy code measured 267 ms there. So the ceiling is settable,
 * and CI sets its own. A budget that fails on the runner's mood
 * measures the runner, not the stack.
 *
 * The tail ratio is the gate that actually catches regressions, and it
 * does not care how fast the machine is. It asks whether the stack
 * degrades under load: how much worse the unlucky request is than the
 * typical one. Healthy here is about 2 on a quiet machine and about 6
 * on a busy runner. When the caretaker's sweep once blocked the event
 * loop, p50 did not move and p95 went eight times worse, which is
 * exactly the shape this catches and an absolute budget nearly missed.
 */
const P95_BUDGET_MS = Number(process.env.DRILL_P95_MS ?? 250);
const TAIL_RATIO_MAX = Number(process.env.DRILL_TAIL_RATIO ?? 10);

const dataDir = mkdtempSync(join(tmpdir(), "osyle-drill-"));
const api = spawn("node", ["dist/server.js"], {
  cwd: join(ROOT, "api"),
  env: {
    ...process.env,
    OSYLE_DATA: dataDir,
    PORT: String(PORT),
    OSYLE_RATE_MAX: "100000",
    /* the drill measures what a visitor waits for; the caretaker's
       rounds are real work but they are not the thing being timed */
    OSYLE_ROUNDS: "off",
    NODE_ENV: "test",
  },
  stdio: ["ignore", "ignore", "inherit"],
});

async function waitForHealth() {
  for (let i = 0; i < 100; i += 1) {
    try {
      const res = await fetch(`${BASE}/health`);
      if (res.ok) return;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error("the api never came up");
}

const latencies = [];
const errors = [];

/* the resident's own key, handed over by the partner door. Every rdb
   call carries it, the way the shipped app would. */
let KEY = null;

function keyed(init) {
  if (!KEY) return init;
  return { ...init, headers: { ...(init?.headers ?? {}), "x-osyle-key": KEY } };
}

async function call(label, path, init) {
  const started = performance.now();
  try {
    const res = await fetch(`${BASE}${path}`, keyed(init));
    latencies.push(performance.now() - started);
    if (!res.ok) errors.push(`${label}: ${res.status} ${await res.text()}`);
    return res;
  } catch (err) {
    latencies.push(performance.now() - started);
    errors.push(`${label}: ${err.message}`);
    return null;
  }
}

async function onePerson(n) {
  const email = `person${n}@drill.example`;
  await call(`p${n} signin`, `/rdb/skyrecall/auth/signin`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email }),
  });
  for (let d = 0; d < 3; d += 1) {
    await call(`p${n} row${d}`, `/rdb/skyrecall/rows/drills`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind: "radio-calls", person: n, drill: d }),
    });
  }
  await call(`p${n} count`, `/rdb/skyrecall/rows/drills/count`);
  await call(`p${n} kv put`, `/rdb/skyrecall/kv/streak-${n}`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ value: n % 9 }),
  });
  await call(`p${n} kv get`, `/rdb/skyrecall/kv/streak-${n}`);
}

function percentile(sorted, p) {
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
}

try {
  await waitForHealth();

  const door = await fetch(`${BASE}/partner/import`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "drill@osyle.app", name: "SkyRecall", slug: "skyrecall" }),
  });
  if (door.status !== 201) throw new Error(`the partner door refused: ${door.status}`);
  KEY = (await door.json()).resident?.apiKey ?? null;
  if (!KEY) throw new Error("the partner door handed over no key");

  const drillStarted = performance.now();
  for (let batch = 0; batch < PEOPLE; batch += AT_ONCE) {
    await Promise.all(
      Array.from({ length: Math.min(AT_ONCE, PEOPLE - batch) }, (_, i) => onePerson(batch + i)),
    );
  }
  const wallSeconds = (performance.now() - drillStarted) / 1000;

  const count = await (
    await fetch(`${BASE}/rdb/skyrecall/rows/drills/count`, keyed({}))
  ).json();
  const survival = await (await fetch(`${BASE}/survival`)).json();

  const sorted = [...latencies].sort((a, b) => a - b);
  const p50 = percentile(sorted, 50);
  const p95 = percentile(sorted, 95);
  const worst = sorted[sorted.length - 1];

  console.log(`\nthe ${PEOPLE}-person drill, ${AT_ONCE} at a time`);
  console.log(`calls made          ${latencies.length}`);
  console.log(`errors              ${errors.length}`);
  console.log(`rows landed         ${count.count} of ${PEOPLE * 3}`);
  console.log(`alive in survival   ${survival.alive} of ${survival.total}`);
  console.log(`wall clock          ${wallSeconds.toFixed(1)} s`);
  console.log(`p50 latency         ${p50.toFixed(1)} ms`);
  console.log(`p95 latency         ${p95.toFixed(1)} ms`);
  console.log(`worst latency       ${worst.toFixed(1)} ms`);
  const tail = p50 > 0 ? p95 / p50 : 0;
  console.log(`tail ratio          ${tail.toFixed(1)} x  (p95 over p50)`);
  for (const e of errors.slice(0, 10)) console.log(`error: ${e}`);

  const rowsOk = count.count === PEOPLE * 3;
  const withinBudget = p95 <= P95_BUDGET_MS;
  const tailOk = tail <= TAIL_RATIO_MAX;
  const ok = errors.length === 0 && rowsOk && withinBudget && tailOk;
  console.log(
    ok
      ? "\nthe drill passes"
      : `\nthe drill fails: ${[
          errors.length > 0 ? `${errors.length} errors` : null,
          rowsOk ? null : "rows missing",
          withinBudget ? null : `p95 ${p95.toFixed(1)} ms over the ${P95_BUDGET_MS} ms budget`,
          tailOk ? null : `tail ${tail.toFixed(1)}x over the ${TAIL_RATIO_MAX}x ceiling`,
        ]
          .filter(Boolean)
          .join(", ")}`,
  );
  process.exitCode = ok ? 0 : 1;
} finally {
  api.kill();
  rmSync(dataDir, { recursive: true, force: true });
}
