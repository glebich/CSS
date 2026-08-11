/**
 * Magic-link auth, no passwords anywhere. POST an email, follow the
 * link, carry a session cookie. In dev the link comes back in the
 * response; in production it goes out by mail and the response stays
 * quiet.
 */
import type { FastifyInstance, FastifyRequest } from "fastify";
import { platformDb, id, token, now } from "./db.js";
import { allow, walled } from "./limits.js";

const SESSION_COOKIE = "osyle_session";
const DEV_MODE = process.env.NODE_ENV !== "production";
const LINK_TTL_MS = 15 * 60_000;
const SESSION_TTL_MS = 30 * 24 * 60 * 60_000;

export interface SessionUser {
  id: string;
  email: string;
}

export function currentUser(req: FastifyRequest): SessionUser | null {
  const session = req.cookies[SESSION_COOKIE];
  if (!session) return null;
  const db = platformDb();
  /* ISO timestamps compare lexicographically, so a string floor works. */
  const floor = new Date(Date.now() - SESSION_TTL_MS).toISOString();
  const row = db
    .prepare(
      `SELECT u.id, u.email FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token = ? AND s.created_at >= ?`,
    )
    .get(session, floor) as { id: string; email: string } | undefined;
  return row ?? null;
}

export function requireUser(req: FastifyRequest): SessionUser {
  const user = currentUser(req);
  if (!user) {
    const err = new Error("sign in first") as Error & { statusCode: number };
    err.statusCode = 401;
    throw err;
  }
  return user;
}

export function registerAuth(app: FastifyInstance): void {
  app.post<{ Body: { email?: string } }>("/auth/link", async (req, reply) => {
    const verdict = allow("auth.link", req.ip, 5, 10 * 60_000);
    if (!verdict.ok) return walled(reply, verdict);
    const email = (req.body?.email ?? "").trim().toLowerCase();
    if (!email.includes("@")) {
      return reply.code(400).send({ error: "a real email address, please" });
    }
    const db = platformDb();
    const link = token();
    db.prepare(
      "INSERT INTO magic_links (token, email, created_at) VALUES (?, ?, ?)",
    ).run(link, email, now());
    // Production hands this to the mailer. Dev hands it straight back.
    return reply.send(
      DEV_MODE ? { sent: true, devLink: `/auth/verify?token=${link}` } : { sent: true },
    );
  });

  app.get<{ Querystring: { token?: string } }>("/auth/verify", async (req, reply) => {
    const db = platformDb();
    const link = db
      .prepare("SELECT email, used, created_at FROM magic_links WHERE token = ?")
      .get(req.query.token ?? "") as
      | { email: string; used: number; created_at: string }
      | undefined;
    if (!link || link.used) {
      return reply.code(400).send({ error: "that link is spent or unknown" });
    }
    if (Date.parse(link.created_at) < Date.now() - LINK_TTL_MS) {
      return reply.code(400).send({ error: "that link has expired, ask for a fresh one" });
    }
    db.prepare("UPDATE magic_links SET used = 1 WHERE token = ?").run(req.query.token!);

    let user = db.prepare("SELECT id, email FROM users WHERE email = ?").get(link.email) as
      | { id: string; email: string }
      | undefined;
    if (!user) {
      user = { id: id(), email: link.email };
      db.prepare("INSERT INTO users (id, email, created_at) VALUES (?, ?, ?)").run(
        user.id,
        user.email,
        now(),
      );
    }
    const session = token();
    db.prepare("INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, ?)").run(
      session,
      user.id,
      now(),
    );
    return reply
      .setCookie(SESSION_COOKIE, session, {
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        secure: !DEV_MODE,
      })
      .send({ ok: true, user });
  });

  app.get("/auth/me", async (req, reply) => {
    return reply.send({ user: currentUser(req) });
  });

  app.post("/auth/signout", async (req, reply) => {
    const session = req.cookies[SESSION_COOKIE];
    if (session) {
      platformDb().prepare("DELETE FROM sessions WHERE token = ?").run(session);
    }
    return reply.clearCookie(SESSION_COOKIE, { path: "/" }).send({ ok: true });
  });
}
