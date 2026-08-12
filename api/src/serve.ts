/**
 * The address, served. A claimed resident's files stream straight out
 * of the Vault at a public path, newest version of each file, honest
 * content types, no build step in between. This is the hosted half of
 * "it lives here now": GitHub keeps code, the Vault keeps the life,
 * and this door lets anyone visit it.
 */
import type { FastifyInstance } from "fastify";
import { platformDb } from "./db.js";
import { getBlob } from "./blobs.js";
import { residentBySlug } from "./residents.js";

const TYPES: Record<string, string> = {
  html: "text/html; charset=utf-8",
  htm: "text/html; charset=utf-8",
  css: "text/css; charset=utf-8",
  js: "text/javascript; charset=utf-8",
  mjs: "text/javascript; charset=utf-8",
  json: "application/json; charset=utf-8",
  svg: "image/svg+xml",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  ico: "image/x-icon",
  txt: "text/plain; charset=utf-8",
  md: "text/plain; charset=utf-8",
  woff: "font/woff",
  woff2: "font/woff2",
  mp3: "audio/mpeg",
  mp4: "video/mp4",
  webm: "video/webm",
};

function contentType(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  return TYPES[ext] ?? "application/octet-stream";
}

interface ServeRow {
  path: string;
  blob_key: string;
  size: number;
}

function newestFile(residentId: string, path: string): ServeRow | null {
  const row = platformDb()
    .prepare(
      `SELECT path, blob_key, size FROM vault_files
       WHERE resident_id = ? AND path = ?
       ORDER BY version DESC LIMIT 1`,
    )
    .get(residentId, path) as ServeRow | undefined;
  return row ?? null;
}

/** An empty or directory-shaped path resolves to the nearest index. */
function resolveIndex(residentId: string, prefix: string): ServeRow | null {
  const candidates = prefix
    ? [`${prefix}/index.html`, `${prefix}index.html`]
    : ["index.html", "src/index.html", "public/index.html"];
  for (const c of candidates) {
    const hit = newestFile(residentId, c);
    if (hit) return hit;
  }
  if (!prefix) {
    /* any html at all beats an empty door */
    const anyHtml = platformDb()
      .prepare(
        `SELECT path, blob_key, size FROM vault_files
         WHERE resident_id = ? AND path LIKE '%.html'
         ORDER BY version DESC LIMIT 1`,
      )
      .get(residentId) as ServeRow | undefined;
    return anyHtml ?? null;
  }
  return null;
}

const MISS_PAGE = `<!doctype html><meta charset="utf-8">
<title>Nothing lives at this path</title>
<body style="font-family: system-ui; display: grid; place-items: center; min-height: 90vh; color: #333">
<div style="text-align: center">
<p style="font-size: 40px; margin: 0">Nothing lives at this path.</p>
<p style="color: #777">The resident is real; this file is not in its Vault.</p>
</div>`;

export function registerServe(app: FastifyInstance): void {
  app.get<{ Params: { slug: string; "*": string } }>(
    "/serve/:slug/*",
    async (req, reply) => {
      const resident = residentBySlug(req.params.slug);
      if (!resident) {
        return reply.code(404).type("text/html; charset=utf-8").send(MISS_PAGE);
      }
      const raw = (req.params["*"] ?? "").replace(/^\/+|\/+$/g, "");
      /* no path escapes: the Vault's paths are flat strings, but a
         request should still never smuggle dots upward */
      if (raw.includes("..")) return reply.code(400).send({ error: "no" });
      const file =
        (raw ? newestFile(resident.id, raw) : null) ?? resolveIndex(resident.id, raw);
      if (!file) {
        return reply.code(404).type("text/html; charset=utf-8").send(MISS_PAGE);
      }
      const bytes = getBlob(file.blob_key);
      if (!bytes) {
        return reply.code(404).type("text/html; charset=utf-8").send(MISS_PAGE);
      }
      return reply
        .header("cache-control", "public, max-age=60")
        .type(contentType(file.path))
        .send(bytes);
    },
  );

  /* the bare address, no trailing path, walks through the same door */
  app.get<{ Params: { slug: string } }>("/serve/:slug", async (req, reply) => {
    return reply.redirect(`/serve/${req.params.slug}/`, 302);
  });
}
