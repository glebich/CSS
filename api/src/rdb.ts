/**
 * The resident database: what the SDK's http transport speaks to.
 * One isolated sqlite file per resident on the data volume (the
 * libSQL-per-resident model), so hosted residents are real software
 * with real users and no resident can see another's rows.
 */
import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import type { FastifyInstance } from "fastify";
import type { Row, SdkUser } from "@osyle/shared";
import { DATA_DIR, id, now, platformDb } from "./db.js";
import { residentBySlug } from "./residents.js";

const open = new Map<string, DatabaseSync>();

function rdb(slug: string): DatabaseSync {
  const found = open.get(slug);
  if (found) return found;
  const dir = join(DATA_DIR, "rdb");
  mkdirSync(dir, { recursive: true });
  const db = new DatabaseSync(join(dir, `${slug}.db`));
  db.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS rows (
      id TEXT PRIMARY KEY,
      tbl TEXT NOT NULL,
      data TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS rows_by_tbl ON rows (tbl, created_at);
    CREATE TABLE IF NOT EXISTS kv (k TEXT PRIMARY KEY, v TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS sdk_users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      signed_in_at TEXT NOT NULL
    );
  `);
  open.set(slug, db);
  return db;
}

/** Test hook: drop cached handles so a fresh data dir starts clean. */
export function resetRdbForTests(): void {
  for (const db of open.values()) db.close();
  open.clear();
}

const TABLE_RE = /^[a-z][a-z0-9_-]{0,40}$/;

export function registerRdb(app: FastifyInstance): void {
  /* Every rdb route checks the resident exists; rows are end-user data,
     reached by the resident's own shipped software, not by the owner's
     platform session. A per-resident key joins in Real Mode hardening. */
  function guard(slug: string): boolean {
    const found = residentBySlug(slug) !== null;
    if (found) {
      /* the Survival Index counts a resident alive when its own users
         touch it; every rdb call is that touch */
      platformDb()
        .prepare("UPDATE residents SET last_active_at = ? WHERE slug = ?")
        .run(now(), slug);
    }
    return found;
  }

  app.get<{ Params: { slug: string; table: string } }>(
    "/rdb/:slug/rows/:table",
    async (req, reply) => {
      if (!guard(req.params.slug) || !TABLE_RE.test(req.params.table)) {
        return reply.code(404).send({ error: "unknown" });
      }
      const rows = rdb(req.params.slug)
        .prepare("SELECT id, data, created_at FROM rows WHERE tbl = ? ORDER BY created_at")
        .all(req.params.table) as unknown as Array<{ id: string; data: string; created_at: string }>;
      return reply.send(
        rows.map((r) => ({ id: r.id, createdAt: r.created_at, ...JSON.parse(r.data) }) as Row),
      );
    },
  );

  app.post<{ Params: { slug: string; table: string }; Body: Record<string, unknown> }>(
    "/rdb/:slug/rows/:table",
    async (req, reply) => {
      if (!guard(req.params.slug) || !TABLE_RE.test(req.params.table)) {
        return reply.code(404).send({ error: "unknown" });
      }
      const row: Row = { id: id(), createdAt: now(), ...(req.body ?? {}) };
      const { id: rowId, createdAt, ...data } = row;
      rdb(req.params.slug)
        .prepare("INSERT INTO rows (id, tbl, data, created_at) VALUES (?, ?, ?, ?)")
        .run(rowId, req.params.table, JSON.stringify(data), createdAt);
      return reply.code(201).send(row);
    },
  );

  app.get<{ Params: { slug: string; table: string } }>(
    "/rdb/:slug/rows/:table/count",
    async (req, reply) => {
      if (!guard(req.params.slug)) return reply.code(404).send({ error: "unknown" });
      const got = rdb(req.params.slug)
        .prepare("SELECT COUNT(*) AS n FROM rows WHERE tbl = ?")
        .get(req.params.table) as { n: number };
      return reply.send({ count: got.n });
    },
  );

  app.delete<{ Params: { slug: string; table: string; id: string } }>(
    "/rdb/:slug/rows/:table/:id",
    async (req, reply) => {
      if (!guard(req.params.slug)) return reply.code(404).send({ error: "unknown" });
      rdb(req.params.slug)
        .prepare("DELETE FROM rows WHERE tbl = ? AND id = ?")
        .run(req.params.table, req.params.id);
      return reply.send({ ok: true });
    },
  );

  app.post<{ Params: { slug: string }; Body: { email?: string } }>(
    "/rdb/:slug/auth/signin",
    async (req, reply) => {
      if (!guard(req.params.slug)) return reply.code(404).send({ error: "unknown" });
      const email = (req.body?.email ?? "").trim().toLowerCase();
      if (!email.includes("@")) return reply.code(400).send({ error: "a real email, please" });
      const user: SdkUser = { id: id(), email, signedInAt: now() };
      rdb(req.params.slug)
        .prepare("INSERT INTO sdk_users (id, email, signed_in_at) VALUES (?, ?, ?)")
        .run(user.id, user.email, user.signedInAt);
      return reply.send(user);
    },
  );

  app.get<{ Params: { slug: string } }>("/rdb/:slug/auth/user", async (req, reply) => {
    if (!guard(req.params.slug)) return reply.code(404).send({ error: "unknown" });
    const row = rdb(req.params.slug)
      .prepare("SELECT id, email, signed_in_at FROM sdk_users ORDER BY signed_in_at DESC LIMIT 1")
      .get() as { id: string; email: string; signed_in_at: string } | undefined;
    return reply.send(row ? { id: row.id, email: row.email, signedInAt: row.signed_in_at } : null);
  });

  app.post<{ Params: { slug: string } }>("/rdb/:slug/auth/signout", async (req, reply) => {
    if (!guard(req.params.slug)) return reply.code(404).send({ error: "unknown" });
    rdb(req.params.slug).prepare("DELETE FROM sdk_users").run();
    return reply.send({ ok: true });
  });

  app.get<{ Params: { slug: string; key: string } }>("/rdb/:slug/kv/:key", async (req, reply) => {
    if (!guard(req.params.slug)) return reply.code(404).send({ error: "unknown" });
    const row = rdb(req.params.slug)
      .prepare("SELECT v FROM kv WHERE k = ?")
      .get(req.params.key) as { v: string } | undefined;
    return reply.send({ value: row ? JSON.parse(row.v) : null });
  });

  app.put<{ Params: { slug: string; key: string }; Body: { value?: unknown } }>(
    "/rdb/:slug/kv/:key",
    async (req, reply) => {
      if (!guard(req.params.slug)) return reply.code(404).send({ error: "unknown" });
      rdb(req.params.slug)
        .prepare(
          "INSERT INTO kv (k, v) VALUES (?, ?) ON CONFLICT (k) DO UPDATE SET v = excluded.v",
        )
        .run(req.params.key, JSON.stringify(req.body?.value ?? null));
      return reply.send({ ok: true });
    },
  );
}
