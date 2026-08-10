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
import { platformDb } from "./db.js";
import { blobsHealthy } from "./blobs.js";

const started = Date.now();
export const VERSION = "0.1.0";

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: process.env.NODE_ENV === "production" });

  await app.register(cookie);
  await app.register(cors, {
    origin: process.env.OSYLE_APP_ORIGIN ?? true,
    credentials: true,
  });

  /* Vault writes arrive as raw bytes. */
  app.addContentTypeParser(
    "application/octet-stream",
    { parseAs: "buffer", bodyLimit: 100 * 1024 * 1024 },
    (_req, body, done) => done(null, body),
  );

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

  return app;
}
