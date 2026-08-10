/**
 * Blob bytes. Filesystem driver on the data volume; the compose stack
 * swaps this for MinIO behind the same three functions.
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { DATA_DIR, id } from "./db.js";

const BLOB_DIR = () => {
  const dir = join(DATA_DIR, "blobs");
  mkdirSync(dir, { recursive: true });
  return dir;
};

export function putBlob(bytes: Buffer): string {
  const key = id();
  writeFileSync(join(BLOB_DIR(), key), bytes);
  return key;
}

export function getBlob(key: string): Buffer | null {
  const file = join(BLOB_DIR(), key);
  if (!existsSync(file)) return null;
  return readFileSync(file);
}

export function blobsHealthy(): boolean {
  try {
    BLOB_DIR();
    return true;
  } catch {
    return false;
  }
}
