/**
 * The modular monolith, assembled. One Fastify instance, one module per
 * domain, no microservices. buildApp exists so tests can inject without
 * a socket.
 */
import Fastify, { type FastifyInstance } from "fastify";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import { registerAuth } from "./auth.js";
import { registerResidents } from "./residents.js";
import { registerVault } from "./vault.js";
import { registerRdb } from "./rdb.js";
import { registerGrowth } from "./growth.js";
import { registerReports } from "./reports.js";
import { registerServe } from "./serve.js";
import { platformDb } from "./db.js";
import { blobsHealthy } from "./blobs.js";
import { allow, walled } from "./limits.js";

const started = Date.now();
export const VERSION = "0.1.0";

/* The general door: generous, per calling address, and never applied
   to /health so a watcher can always see the truth. Behind a shared
   address (a proxy, or the drill) the ceiling can be raised by env. */
const GENERAL_MAX = Number(process.env.OSYLE_RATE_MAX ?? 240);
const GENERAL_WINDOW_MS = 60_000;

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: process.env.NODE_ENV === "production" });

  await app.register(cookie);
  await app.register(cors, {
    origin: process.env.OSYLE_APP_ORIGIN ?? true,
    credentials: true,
  });

  /* Vault writes arrive as raw bytes; the parser stops anything past
     the per-file cap plus headroom, and the vault says why below it. */
  app.addContentTypeParser(
    "application/octet-stream",
    { parseAs: "buffer", bodyLimit: 6 * 1024 * 1024 },
    (_req, body, done) => done(null, body),
  );

  app.addHook("onRequest", async (req, reply) => {
    if (req.url.split("?")[0] === "/health") return;
    const verdict = allow("general", req.ip, GENERAL_MAX, GENERAL_WINDOW_MS);
    if (!verdict.ok) return walled(reply, verdict);
  });

  /* Degradation without walls: a thrown status speaks for itself, an
     unexpected failure answers honestly and keeps its stack in the log. */
  app.setErrorHandler((err: Error & { statusCode?: number }, req, reply) => {
    const status =
      typeof err.statusCode === "number" && err.statusCode >= 400 ? err.statusCode : 500;
    if (status >= 500) req.log.error(err);
    return reply.code(status).send({
      error:
        status >= 500 ? "something broke on our side, the details stayed in the log" : err.message,
    });
  });

  app.get("/health", async (_req, reply) => {
    let db = false;
    try {
      platformDb().prepare("SELECT 1").get();
      db = true;
    } catch {
      db = false;
    }
    const blobs = blobsHealthy();
    return reply.code(db && blobs ? 200 : 503).send({
      ok: db && blobs,
      db,
      blobs,
      version: VERSION,
      uptimeSeconds: Math.round((Date.now() - started) / 1000),
    });
  });

  registerAuth(app);
  registerResidents(app);
  registerVault(app);
  registerRdb(app);
  registerGrowth(app);
  registerReports(app);
  registerServe(app);

  return app;
}
