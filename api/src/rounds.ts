/**
 * The round: the stack walks past every resident on a clock and looks
 * at its files with the only eyes a server honestly has. It counts the
 * newest files and their weight, knocks on the front door the way the
 * serving door would, and follows every local reference to see that it
 * lands. Each look is one pulse row and one ledger line in the jobs
 * table; the owner reads the latest pulse in the panel or asks for a
 * fresh look on demand. The client's ten lenses stay in the client;
 * this is the caretaker's flashlight, not the examination.
 */
import type { FastifyInstance } from "fastify";
import { platformDb, id, now } from "./db.js";
import { getBlob } from "./blobs.js";
import { requireOwnedResident } from "./residents.js";
import { allow, walled } from "./limits.js";

const MAX_PULSES = 30;
/* how stale a pulse must be before the sweep looks again */
const LOOK_EVERY_MS = Number(process.env.OSYLE_ROUND_EVERY_MS ?? 24 * 60 * 60_000);
/* how often the sweep itself walks */
const SWEEP_MS = Number(process.env.OSYLE_ROUND_SWEEP_MS ?? 60 * 60_000);
const SCAN_FILE_CAP = 200;
const SCAN_BYTES_CAP = 512 * 1024;
const TEXT_EXT = new Set(["html", "htm", "css", "js", "mjs"]);
const LEDGER_KEEP_MS = 14 * 24 * 60 * 60_000;

export interface Pulse {
  files: number;
  bytes: number;
  indexOk: boolean;
  brokenRefs: number;
  lookedAt: string;
}

interface NewestRow {
  path: string;
  size: number;
  blob_key: string;
}

function newestFiles(residentId: string): NewestRow[] {
  return platformDb()
    .prepare(
      `SELECT path, size, blob_key FROM vault_files vf
       WHERE resident_id = ? AND version = (
         SELECT MAX(version) FROM vault_files
         WHERE resident_id = vf.resident_id AND path = vf.path
       )`,
    )
    .all(residentId) as unknown as NewestRow[];
}

const REF_RE = /(?:src|href)\s*=\s*["']([^"']+)["']|url\(\s*['"]?([^'")]+)['"]?\s*\)/gi;

/** Local means ours to check: no scheme, no protocol-relative, no anchor. */
function isLocalRef(ref: string): boolean {
  return !/^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(ref) && !/[{$]/.test(ref);
}

/** Both readings of a relative reference: from the root, and from the
    referencing file's own directory, dots resolved, never above root. */
function refCandidates(fromPath: string, ref: string): string[] {
  const clean = ref.split(/[?#]/)[0].trim();
  if (!clean) return [];
  const fromRoot = clean.replace(/^\.?\//, "");
  const dir = fromPath.includes("/") ? fromPath.slice(0, fromPath.lastIndexOf("/")) : "";
  const joined = [...(dir ? dir.split("/") : []), ...clean.split("/")];
  const walked: string[] = [];
  for (const seg of joined) {
    if (seg === "" || seg === ".") continue;
    if (seg === "..") {
      walked.pop();
      continue;
    }
    walked.push(seg);
  }
  return [fromRoot, walked.join("/")];
}

/** The look itself: real counts, a real knock, real reference walks. */
export function examineResident(residentId: string): Pulse {
  const files = newestFiles(residentId);
  const paths = new Set(files.map((f) => f.path));
  const bytes = files.reduce((n, f) => n + f.size, 0);
  const indexOk =
    ["index.html", "src/index.html", "public/index.html"].some((p) => paths.has(p)) ||
    files.some((f) => f.path.endsWith(".html"));

  let brokenRefs = 0;
  const scannable = files
    .filter(
      (f) => TEXT_EXT.has(f.path.split(".").pop() ?? "") && f.size <= SCAN_BYTES_CAP,
    )
    .slice(0, SCAN_FILE_CAP);
  for (const f of scannable) {
    const blob = getBlob(f.blob_key);
    if (!blob) continue;
    const text = blob.toString("utf8");
    for (const m of text.matchAll(REF_RE)) {
      const ref = (m[1] ?? m[2] ?? "").trim();
      if (!ref || !isLocalRef(ref)) continue;
      /* only references that name a file; bare routes are the app's
         own business, not a broken link */
      const last = ref.split(/[?#]/)[0].split("/").pop() ?? "";
      if (!last.includes(".")) continue;
      const candidates = refCandidates(f.path, ref);
      if (candidates.length > 0 && !candidates.some((c) => paths.has(c))) brokenRefs += 1;
    }
  }

  const pulse: Pulse = {
    files: files.length,
    bytes,
    indexOk,
    brokenRefs,
    lookedAt: now(),
  };
  const db = platformDb();
  db.prepare(
    `INSERT INTO pulses (id, resident_id, files, bytes, index_ok, broken_refs, looked_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id(),
    residentId,
    pulse.files,
    pulse.bytes,
    pulse.indexOk ? 1 : 0,
    pulse.brokenRefs,
    pulse.lookedAt,
  );
  db.prepare(
    `DELETE FROM pulses WHERE resident_id = ? AND id NOT IN (
       SELECT id FROM pulses WHERE resident_id = ?
       ORDER BY looked_at DESC, id DESC LIMIT ?
     )`,
  ).run(residentId, residentId, MAX_PULSES);
  /* the ledger line: the jobs table remembers every look */
  db.prepare(
    `INSERT INTO jobs (id, kind, payload, status, created_at, done_at)
     VALUES (?, 'round.look', ?, 'done', ?, ?)`,
  ).run(id(), JSON.stringify({ residentId }), pulse.lookedAt, pulse.lookedAt);
  return pulse;
}

interface PulseRow {
  files: number;
  bytes: number;
  index_ok: number;
  broken_refs: number;
  looked_at: string;
}

function toPulse(row: PulseRow): Pulse {
  return {
    files: row.files,
    bytes: row.bytes,
    indexOk: row.index_ok === 1,
    brokenRefs: row.broken_refs,
    lookedAt: row.looked_at,
  };
}

/** Every look the caretaker took, newest first. */
export function pulseHistory(residentId: string): Pulse[] {
  const rows = platformDb()
    .prepare(
      `SELECT files, bytes, index_ok, broken_refs, looked_at FROM pulses
       WHERE resident_id = ? ORDER BY looked_at DESC, id DESC LIMIT ?`,
    )
    .all(residentId, MAX_PULSES) as unknown as PulseRow[];
  return rows.map(toPulse);
}

export function latestPulse(residentId: string): Pulse | null {
  return pulseHistory(residentId)[0] ?? null;
}

/** One sweep: look at every resident whose pulse has gone stale.
    Returns how many looks were taken, so callers and tests can see. */
export function runRound(): number {
  const db = platformDb();
  const floor = new Date(Date.now() - LOOK_EVERY_MS).toISOString();
  const due = db
    .prepare(
      `SELECT id FROM residents r WHERE NOT EXISTS (
         SELECT 1 FROM pulses WHERE resident_id = r.id AND looked_at >= ?
       )`,
    )
    .all(floor) as unknown as Array<{ id: string }>;
  for (const r of due) {
    try {
      examineResident(r.id);
    } catch (err) {
      console.error(`round: the look at ${r.id} failed:`, err);
    }
  }
  /* the ledger is generous but not unbounded */
  db.prepare("DELETE FROM jobs WHERE kind = 'round.look' AND created_at < ?").run(
    new Date(Date.now() - LEDGER_KEEP_MS).toISOString(),
  );
  return due.length;
}

/** The clock, started by the server process, never by tests. */
export function startRounds(): void {
  if (process.env.OSYLE_ROUNDS === "off") return;
  setTimeout(() => runRound(), 15_000);
  setInterval(() => runRound(), SWEEP_MS);
}

export function registerRounds(app: FastifyInstance): void {
  app.get<{ Params: { slug: string } }>("/residents/:slug/pulse", async (req, reply) => {
    const resident = requireOwnedResident(req, req.params.slug);
    const history = pulseHistory(resident.id);
    return reply.send({ pulse: history[0] ?? null, history });
  });

  app.post<{ Params: { slug: string } }>("/residents/:slug/pulse", async (req, reply) => {
    const resident = requireOwnedResident(req, req.params.slug);
    const verdict = allow("round.look", req.ip, 30, 60 * 60_000);
    if (!verdict.ok) return walled(reply, verdict);
    return reply.send({ pulse: examineResident(resident.id) });
  });
}
