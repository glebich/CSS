/**
 * The queue worker, foundation shape. Jobs land in the platform jobs
 * table and this loop drains them. Stage 3-real fills in the
 * examination job; the Art Director's rounds arrive in their stage.
 * Under compose this process runs in its own container; the swap to
 * Redis-backed queues changes this file only.
 */
import { platformDb, now } from "./db.js";

const HANDLERS: Record<string, (payload: unknown) => Promise<void>> = {
  async noop() {
    /* the job that proves the loop */
  },
};

async function tick(): Promise<void> {
  const db = platformDb();
  const job = db
    .prepare("SELECT id, kind, payload FROM jobs WHERE status = 'queued' ORDER BY created_at LIMIT 1")
    .get() as { id: string; kind: string; payload: string } | undefined;
  if (!job) return;
  db.prepare("UPDATE jobs SET status = 'running' WHERE id = ?").run(job.id);
  const handler = HANDLERS[job.kind];
  try {
    if (!handler) throw new Error(`no handler for ${job.kind}`);
    await handler(JSON.parse(job.payload));
    db.prepare("UPDATE jobs SET status = 'done', done_at = ? WHERE id = ?").run(now(), job.id);
  } catch (err) {
    db.prepare("UPDATE jobs SET status = 'failed', done_at = ? WHERE id = ?").run(now(), job.id);
    console.error(`job ${job.id} (${job.kind}) failed:`, err);
  }
}

console.log("osyle worker watching the queue");
setInterval(() => void tick(), 1000);
