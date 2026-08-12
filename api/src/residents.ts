/**
 * Residents: the software that lives here. Owned by their creator,
 * addressed by slug, isolated by construction.
 */
import type { FastifyInstance, FastifyRequest } from "fastify";
import type { Resident } from "@osyle/shared";
import { platformDb, id, now } from "./db.js";
import { requireUser } from "./auth.js";

const SLUG_RE = /^[a-z][a-z0-9-]{1,40}$/;

/* a real hostname: dotted labels, letters ending the last one, never
   an IP, never longer than DNS itself allows */
const DOMAIN_RE = /^(?=.{4,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$/;
/* the platform's own roofs cannot be worn by a resident */
const RESERVED_ROOFS = ["osyle.app", "osyle.xyz"];

interface ResidentRow {
  id: string;
  slug: string;
  name: string;
  user_id: string;
  created_at: string;
  custom_domain?: string | null;
}

function toResident(r: ResidentRow): Resident {
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    userId: r.user_id,
    createdAt: r.created_at,
    customDomain: r.custom_domain ?? null,
  };
}

/** The serving door asks by Host header; one query answers by name. */
export function residentSlugByDomain(host: string): string | null {
  const row = platformDb()
    .prepare("SELECT slug FROM residents WHERE custom_domain = ?")
    .get(host) as { slug: string } | undefined;
  return row?.slug ?? null;
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

  /* the custom domain: one hostname, owned like the resident itself.
     An empty body takes the domain off; the serving door answers by
     Host header the moment it is on. */
  app.put<{ Params: { slug: string }; Body: { domain?: string } }>(
    "/residents/:slug/domain",
    async (req, reply) => {
      const resident = requireOwnedResident(req, req.params.slug);
      const db = platformDb();
      const domain = (req.body?.domain ?? "").trim().toLowerCase();
      if (!domain) {
        db.prepare("UPDATE residents SET custom_domain = NULL WHERE id = ?").run(resident.id);
        return reply.send({ domain: null });
      }
      if (!DOMAIN_RE.test(domain)) {
        return reply.code(400).send({ error: "name it like yourdomain.com" });
      }
      if (RESERVED_ROOFS.some((roof) => domain === roof || domain.endsWith(`.${roof}`))) {
        return reply.code(400).send({ error: "that roof belongs to the platform" });
      }
      const wearer = db
        .prepare("SELECT slug FROM residents WHERE custom_domain = ? AND id != ?")
        .get(domain, resident.id) as { slug: string } | undefined;
      if (wearer) {
        return reply.code(409).send({ error: "that domain is already worn by another resident" });
      }
      db.prepare("UPDATE residents SET custom_domain = ? WHERE id = ?").run(domain, resident.id);
      return reply.send({ domain });
    },
  );
}
