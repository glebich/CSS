/**
 * Residents: the software that lives here. Owned by their creator,
 * addressed by slug, isolated by construction.
 */
import type { FastifyInstance, FastifyRequest } from "fastify";
import type { Resident } from "@osyle/shared";
import { platformDb, id, now } from "./db.js";
import { requireUser } from "./auth.js";

const SLUG_RE = /^[a-z][a-z0-9-]{1,40}$/;

interface ResidentRow {
  id: string;
  slug: string;
  name: string;
  user_id: string;
  created_at: string;
}

function toResident(r: ResidentRow): Resident {
  return { id: r.id, slug: r.slug, name: r.name, userId: r.user_id, createdAt: r.created_at };
}

export function residentBySlug(slug: string): Resident | null {
  const row = platformDb()
    .prepare("SELECT * FROM residents WHERE slug = ?")
    .get(slug) as ResidentRow | undefined;
  return row ? toResident(row) : null;
}

/** Owner gate: the resident must exist and belong to the signed-in user. */
export function requireOwnedResident(req: FastifyRequest, slug: string): Resident {
  const user = requireUser(req);
  const resident = residentBySlug(slug);
  if (!resident || resident.userId !== user.id) {
    const err = new Error("no such resident of yours") as Error & { statusCode: number };
    err.statusCode = 404;
    throw err;
  }
  return resident;
}

export function registerResidents(app: FastifyInstance): void {
  app.get("/residents", async (req, reply) => {
    const user = requireUser(req);
    const rows = platformDb()
      .prepare("SELECT * FROM residents WHERE user_id = ? ORDER BY created_at")
      .all(user.id) as unknown as ResidentRow[];
    return reply.send({ residents: rows.map(toResident) });
  });

  app.post<{ Body: { slug?: string; name?: string } }>("/residents", async (req, reply) => {
    const user = requireUser(req);
    const slug = (req.body?.slug ?? "").trim().toLowerCase();
    const name = (req.body?.name ?? "").trim();
    if (!SLUG_RE.test(slug)) {
      return reply.code(400).send({ error: "slug: lowercase letters, digits, hyphens" });
    }
    if (!name) return reply.code(400).send({ error: "a name, please" });
    if (residentBySlug(slug)) {
      return reply.code(409).send({ error: "that address is taken" });
    }
    const resident: ResidentRow = {
      id: id(),
      slug,
      name,
      user_id: user.id,
      created_at: now(),
    };
    platformDb()
      .prepare(
        "INSERT INTO residents (id, slug, name, user_id, created_at) VALUES (?, ?, ?, ?, ?)",
      )
      .run(resident.id, resident.slug, resident.name, resident.user_id, resident.created_at);
    return reply.code(201).send({ resident: toResident(resident) });
  });

  app.get<{ Params: { slug: string } }>("/residents/:slug", async (req, reply) => {
    const resident = requireOwnedResident(req, req.params.slug);
    return reply.send({ resident });
  });

  app.delete<{ Params: { slug: string } }>("/residents/:slug", async (req, reply) => {
    const resident = requireOwnedResident(req, req.params.slug);
    platformDb().prepare("DELETE FROM residents WHERE id = ?").run(resident.id);
    return reply.send({ ok: true });
  });
}
