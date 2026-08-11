/**
 * Two deck commitments, collected from day one because they cannot be
 * reconstructed later.
 *
 * The Survival Index: a resident counts as alive if its own users
 * touched it within the trailing 14 days. Cohorts by week of arrival.
 * This feeds the Owner console report and the public quarterly page.
 *
 * The Partner Door: one call hands a project from a generation tool to
 * Osyle and returns the resident, its address, and a claim link. The
 * "Send to Osyle" button is this endpoint plus one POST.
 */
import type { FastifyInstance } from "fastify";
import { platformDb, id, token, now } from "./db.js";
import { residentBySlug } from "./residents.js";
import { allow, walled } from "./limits.js";

const ALIVE_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;
const SLUG_RE = /^[a-z][a-z0-9-]{1,40}$/;

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30);
  return base.length >= 2 ? base : `resident-${base}`;
}

export function registerGrowth(app: FastifyInstance): void {
  app.get("/survival", async (_req, reply) => {
    const db = platformDb();
    const rows = db
      .prepare("SELECT created_at, last_active_at FROM residents")
      .all() as unknown as Array<{ created_at: string; last_active_at: string | null }>;
    const cutoff = Date.now() - ALIVE_WINDOW_MS;
    const alive = rows.filter(
      (r) => r.last_active_at && Date.parse(r.last_active_at) >= cutoff,
    ).length;

    const cohorts = new Map<string, { arrived: number; alive: number }>();
    for (const r of rows) {
      const week = r.created_at.slice(0, 10);
      const weekStart = new Date(week);
      weekStart.setUTCDate(weekStart.getUTCDate() - weekStart.getUTCDay());
      const key = weekStart.toISOString().slice(0, 10);
      const c = cohorts.get(key) ?? { arrived: 0, alive: 0 };
      c.arrived += 1;
      if (r.last_active_at && Date.parse(r.last_active_at) >= cutoff) c.alive += 1;
      cohorts.set(key, c);
    }

    return reply.send({
      title: "The Software Survival Index",
      publishedBy: "Osyle, quarterly",
      total: rows.length,
      alive,
      windowDays: 14,
      cohorts: [...cohorts.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([week, c]) => ({ week, ...c })),
      generatedAt: now(),
    });
  });

  app.post<{ Body: { email?: string; name?: string; slug?: string; repoUrl?: string } }>(
    "/partner/import",
    async (req, reply) => {
      const verdict = allow("partner.import", req.ip, 12, 60 * 60_000);
      if (!verdict.ok) return walled(reply, verdict);
      const email = (req.body?.email ?? "").trim().toLowerCase();
      const name = (req.body?.name ?? "").trim();
      if (!email.includes("@") || !name) {
        return reply.code(400).send({ error: "email and name, please" });
      }
      let slug = (req.body?.slug ?? "").trim().toLowerCase() || slugify(name);
      if (!SLUG_RE.test(slug)) slug = slugify(name);
      while (residentBySlug(slug)) {
        slug = `${slug.slice(0, 34)}-${Math.abs(Date.now() % 997)}`;
      }

      const db = platformDb();
      let user = db.prepare("SELECT id FROM users WHERE email = ?").get(email) as
        | { id: string }
        | undefined;
      if (!user) {
        user = { id: id() };
        db.prepare("INSERT INTO users (id, email, created_at) VALUES (?, ?, ?)").run(
          user.id,
          email,
          now(),
        );
      }
      db.prepare(
        "INSERT INTO residents (id, slug, name, user_id, created_at) VALUES (?, ?, ?, ?, ?)",
      ).run(id(), slug, name, user.id, now());

      const claim = token();
      db.prepare("INSERT INTO magic_links (token, email, created_at) VALUES (?, ?, ?)").run(
        claim,
        email,
        now(),
      );

      return reply.code(201).send({
        resident: { slug, name, address: `${slug}.osyle.app` },
        claimLink: `/auth/verify?token=${claim}`,
        reportPath: `/r/${slug}/report`,
        note: req.body?.repoUrl
          ? "The archive fetch runs when the import pipeline lands; the address is live now."
          : "The address is live now.",
      });
    },
  );
}
