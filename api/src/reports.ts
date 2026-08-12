/**
 * The report lives with the resident. Every examination the owner
 * chooses to record lands as one row, append-only: the vitality, the
 * finding count, and a small per-lens summary. Nothing here invents a
 * number; the client sends what its engine measured, and the stack
 * remembers it in order, so the app's health has a history the owner
 * can read back from any machine.
 */
import type { FastifyInstance } from "fastify";
import { platformDb, id, now } from "./db.js";
import { requireOwnedResident } from "./residents.js";

interface LensSummary {
  key: string;
  score: number;
  findings: number;
}

interface ReportRow {
  id: string;
  resident_id: string;
  vitality: number;
  findings: number;
  lenses: string;
  examined_at: string;
}

const MAX_LENSES = 20;
const MAX_HISTORY = 50;

function cleanLenses(input: unknown): LensSummary[] {
  if (!Array.isArray(input)) return [];
  return input.slice(0, MAX_LENSES).flatMap((l) => {
    if (typeof l !== "object" || l === null) return [];
    const { key, score, findings } = l as Record<string, unknown>;
    if (typeof key !== "string" || key.length === 0 || key.length > 40) return [];
    const s = Number(score);
    const f = Number(findings);
    if (!Number.isFinite(s) || !Number.isFinite(f)) return [];
    return [
      {
        key,
        score: Math.max(0, Math.min(100, Math.round(s))),
        findings: Math.max(0, Math.min(500, Math.round(f))),
      },
    ];
  });
}

function toReport(r: ReportRow) {
  return {
    vitality: r.vitality,
    findings: r.findings,
    lenses: JSON.parse(r.lenses) as LensSummary[],
    examinedAt: r.examined_at,
  };
}

export function registerReports(app: FastifyInstance): void {
  app.put<{
    Params: { slug: string };
    Body: { vitality?: number; findings?: number; lenses?: unknown };
  }>("/residents/:slug/report", async (req, reply) => {
    const resident = requireOwnedResident(req, req.params.slug);
    const vitality = Number(req.body?.vitality);
    const findings = Number(req.body?.findings);
    if (!Number.isFinite(vitality) || vitality < 0 || vitality > 100) {
      return reply.code(400).send({ error: "vitality: a number, 0 to 100" });
    }
    if (!Number.isFinite(findings) || findings < 0 || findings > 500) {
      return reply.code(400).send({ error: "findings: a count, 0 to 500" });
    }
    const row: ReportRow = {
      id: id(),
      resident_id: resident.id,
      vitality: Math.round(vitality),
      findings: Math.round(findings),
      lenses: JSON.stringify(cleanLenses(req.body?.lenses)),
      examined_at: now(),
    };
    const db = platformDb();
    db.prepare(
      "INSERT INTO reports (id, resident_id, vitality, findings, lenses, examined_at) VALUES (?, ?, ?, ?, ?, ?)",
    ).run(row.id, row.resident_id, row.vitality, row.findings, row.lenses, row.examined_at);
    /* the history is generous but not unbounded; the oldest rows yield */
    db.prepare(
      `DELETE FROM reports WHERE resident_id = ? AND id NOT IN (
         SELECT id FROM reports WHERE resident_id = ?
         ORDER BY examined_at DESC, id DESC LIMIT ?
       )`,
    ).run(resident.id, resident.id, MAX_HISTORY);
    return reply.code(201).send({ report: toReport(row) });
  });

  app.get<{ Params: { slug: string } }>("/residents/:slug/report", async (req, reply) => {
    const resident = requireOwnedResident(req, req.params.slug);
    const rows = platformDb()
      .prepare(
        "SELECT * FROM reports WHERE resident_id = ? ORDER BY examined_at DESC, id DESC LIMIT ?",
      )
      .all(resident.id, MAX_HISTORY) as unknown as ReportRow[];
    if (rows.length === 0) {
      return reply.send({ report: null, history: [] });
    }
    return reply.send({
      report: toReport(rows[0]),
      history: rows.map(toReport),
    });
  });
}
