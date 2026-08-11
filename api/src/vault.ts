/**
 * The Vault: files, versions, one-click restore. Every write is a new
 * version; nothing is ever overwritten; restore copies an old version
 * forward as the newest. GitHub stores code and stops; the Vault
 * stores the whole life.
 */
import type { FastifyInstance } from "fastify";
import type { VaultFile } from "@osyle/shared";
import { platformDb, id, now } from "./db.js";
import { putBlob, getBlob } from "./blobs.js";
import { requireOwnedResident } from "./residents.js";

/* The budgets. Versions never overwrite, so every write spends the
   budget; the caps are env-tunable so a bigger box can raise them and
   the tests can exercise them without moving megabytes. */
const MAX_FILE_BYTES = Number(process.env.OSYLE_VAULT_FILE_BYTES ?? 5 * 1024 * 1024);
const MAX_STORED_BYTES = Number(process.env.OSYLE_VAULT_BYTES ?? 64 * 1024 * 1024);
const MAX_PATHS = Number(process.env.OSYLE_VAULT_PATHS ?? 500);
const MAX_PATH_CHARS = 200;

function human(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${Math.round(bytes / (1024 * 1024))} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} bytes`;
}

interface FileRow {
  id: string;
  resident_id: string;
  path: string;
  version: number;
  size: number;
  blob_key: string;
  created_at: string;
}

function toFile(r: FileRow): VaultFile {
  return { path: r.path, version: r.version, size: r.size, createdAt: r.created_at };
}

function latest(residentId: string, path: string): FileRow | null {
  const row = platformDb()
    .prepare(
      `SELECT * FROM vault_files WHERE resident_id = ? AND path = ?
       ORDER BY version DESC LIMIT 1`,
    )
    .get(residentId, path) as FileRow | undefined;
  return row ?? null;
}

function insertVersion(residentId: string, path: string, bytes: Buffer): FileRow {
  const prev = latest(residentId, path);
  const row: FileRow = {
    id: id(),
    resident_id: residentId,
    path,
    version: (prev?.version ?? 0) + 1,
    size: bytes.length,
    blob_key: putBlob(bytes),
    created_at: now(),
  };
  platformDb()
    .prepare(
      `INSERT INTO vault_files (id, resident_id, path, version, size, blob_key, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(row.id, row.resident_id, row.path, row.version, row.size, row.blob_key, row.created_at);
  return row;
}

export function registerVault(app: FastifyInstance): void {
  /** The current tree: newest version of every path. */
  app.get<{ Params: { slug: string } }>("/residents/:slug/files", async (req, reply) => {
    const resident = requireOwnedResident(req, req.params.slug);
    const rows = platformDb()
      .prepare(
        `SELECT v.* FROM vault_files v
         JOIN (SELECT path, MAX(version) AS version FROM vault_files
               WHERE resident_id = ? GROUP BY path) newest
           ON newest.path = v.path AND newest.version = v.version
         WHERE v.resident_id = ? ORDER BY v.path`,
      )
      .all(resident.id, resident.id) as unknown as FileRow[];
    return reply.send({ files: rows.map(toFile) });
  });

  /** Write a file: always a new version. Body is the raw bytes. */
  app.put<{ Params: { slug: string; "*": string } }>(
    "/residents/:slug/files/*",
    async (req, reply) => {
      const resident = requireOwnedResident(req, req.params.slug);
      const path = req.params["*"];
      if (!path || path.includes("..") || path.length > MAX_PATH_CHARS) {
        return reply.code(400).send({ error: "a clean path, please" });
      }
      const bytes = req.body as Buffer;
      if (!Buffer.isBuffer(bytes) || bytes.length === 0) {
        return reply.code(400).send({ error: "no bytes arrived" });
      }
      if (bytes.length > MAX_FILE_BYTES) {
        return reply
          .code(413)
          .send({ error: `one file tops out at ${human(MAX_FILE_BYTES)}` });
      }
      const usage = platformDb()
        .prepare(
          `SELECT COUNT(DISTINCT path) AS paths, COALESCE(SUM(size), 0) AS bytes
           FROM vault_files WHERE resident_id = ?`,
        )
        .get(resident.id) as { paths: number; bytes: number };
      if (!latest(resident.id, path) && usage.paths >= MAX_PATHS) {
        return reply
          .code(413)
          .send({ error: `this vault holds up to ${MAX_PATHS} paths and they are all taken` });
      }
      if (usage.bytes + bytes.length > MAX_STORED_BYTES) {
        const remainingBytes = Math.max(0, MAX_STORED_BYTES - usage.bytes);
        return reply.code(413).send({
          error: `the vault budget is ${human(MAX_STORED_BYTES)} across every version and ${human(remainingBytes)} remain`,
          remainingBytes,
        });
      }
      const row = insertVersion(resident.id, path, bytes);
      return reply.code(201).send({ file: toFile(row) });
    },
  );

  /** Read the newest version, or ?version=n for any older one. */
  app.get<{ Params: { slug: string; "*": string }; Querystring: { version?: string } }>(
    "/residents/:slug/files/*",
    async (req, reply) => {
      const resident = requireOwnedResident(req, req.params.slug);
      const path = req.params["*"];
      const wanted = req.query.version ? Number(req.query.version) : null;
      const row = wanted
        ? (platformDb()
            .prepare(
              "SELECT * FROM vault_files WHERE resident_id = ? AND path = ? AND version = ?",
            )
            .get(resident.id, path, wanted) as FileRow | undefined)
        : (latest(resident.id, path) ?? undefined);
      if (!row) return reply.code(404).send({ error: "no such file" });
      const bytes = getBlob(row.blob_key);
      if (!bytes) return reply.code(410).send({ error: "the bytes are missing" });
      return reply
        .header("content-type", "application/octet-stream")
        .header("x-osyle-version", String(row.version))
        .send(bytes);
    },
  );

  /** The version history of one path. */
  app.get<{ Params: { slug: string; "*": string } }>(
    "/residents/:slug/versions/*",
    async (req, reply) => {
      const resident = requireOwnedResident(req, req.params.slug);
      const rows = platformDb()
        .prepare(
          `SELECT * FROM vault_files WHERE resident_id = ? AND path = ?
           ORDER BY version DESC`,
        )
        .all(resident.id, req.params["*"]) as unknown as FileRow[];
      return reply.send({ versions: rows.map(toFile) });
    },
  );

  /** One-click restore: an old version becomes the newest. */
  app.post<{ Params: { slug: string; "*": string }; Body: { version?: number } }>(
    "/residents/:slug/restore/*",
    async (req, reply) => {
      const resident = requireOwnedResident(req, req.params.slug);
      const path = req.params["*"];
      const wanted = Number(req.body?.version);
      const row = platformDb()
        .prepare("SELECT * FROM vault_files WHERE resident_id = ? AND path = ? AND version = ?")
        .get(resident.id, path, wanted) as FileRow | undefined;
      if (!row) return reply.code(404).send({ error: "no such version" });
      const bytes = getBlob(row.blob_key);
      if (!bytes) return reply.code(410).send({ error: "the bytes are missing" });
      const restored = insertVersion(resident.id, path, bytes);
      return reply.send({ file: toFile(restored) });
    },
  );
}
