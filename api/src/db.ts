/**
 * Platform truth. The modular monolith owns users, sessions, residents,
 * and the Vault's version metadata.
 *
 * Storage driver: node:sqlite on the data volume. This is the dev and
 * single-box driver; the compose stack provisions Postgres, and the
 * swap point is exactly this file (same SQL shapes, a pg Pool instead
 * of DatabaseSync). Blob bytes live on the filesystem here and in
 * MinIO under compose; see blobs.ts.
 */
import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { randomUUID, randomBytes } from "node:crypto";

export const DATA_DIR = process.env.OSYLE_DATA ?? join(process.cwd(), "data");

let db: DatabaseSync | null = null;

export function platformDb(): DatabaseSync {
  if (db) return db;
  mkdirSync(DATA_DIR, { recursive: true });
  db = new DatabaseSync(join(DATA_DIR, "platform.db"));
  db.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS magic_links (
      token TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      created_at TEXT NOT NULL,
      used INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS residents (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      user_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      last_active_at TEXT
    );
    CREATE TABLE IF NOT EXISTS vault_files (
      id TEXT PRIMARY KEY,
      resident_id TEXT NOT NULL,
      path TEXT NOT NULL,
      version INTEGER NOT NULL,
      size INTEGER NOT NULL,
      blob_key TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS vault_by_path
      ON vault_files (resident_id, path, version);
    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      kind TEXT NOT NULL,
      payload TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'queued',
      created_at TEXT NOT NULL,
      done_at TEXT
    );
  `);
  /* Data dirs older than the survival column pick it up here. */
  try {
    db.exec("ALTER TABLE residents ADD COLUMN last_active_at TEXT");
  } catch {
    /* the column already exists */
  }
  return db;
}

/** Test hook: point OSYLE_DATA somewhere fresh, then reset. */
export function resetDbForTests(): void {
  db?.close();
  db = null;
}

export function id(): string {
  return randomUUID();
}

export function token(): string {
  return randomBytes(24).toString("base64url");
}

export function now(): string {
  return new Date().toISOString();
}
