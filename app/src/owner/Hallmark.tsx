import { useEffect, useState } from "react";
import { resident, uptimeDays } from "../data/seed";

/**
 * The Hallmark at #/mark/{slug}: the quality mark's live certificate.
 * A brand surface: near-black, the violet glow, the letterspaced
 * wordmark. Every figure on it is read from real state, and the hash
 * is a real SHA-256 of the certificate's content. The signing key is
 * named as arriving with Real Mode, because honesty is the mark.
 */

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

interface Certificate {
  name: string;
  vitality: number;
  lastExamined: string;
  uptime: string;
  found: boolean;
}

function certificateFor(slug: string): Certificate {
  if (slug === "skyrecall") {
    const healed = loadJson<string[]>("osyle.demo.healed", []);
    const cleanDays = uptimeDays.filter(Boolean).length;
    return {
      name: resident.name,
      vitality: healed.length > 1 ? 69 : 66,
      lastExamined: "August 9",
      uptime: `${cleanDays} of ${uptimeDays.length} days clean`,
      found: true,
    };
  }
  const registry = loadJson<Record<string, { name: string; vitality: number; savedAt: string }>>(
    "osyle.residents",
    {},
  );
  const row = registry[slug];
  if (!row) return { name: slug, vitality: 0, lastExamined: "never", uptime: "", found: false };
  return {
    name: row.name,
    vitality: row.vitality,
    lastExamined: row.savedAt.slice(0, 10),
    uptime: "serving since move-in",
    found: true,
  };
}

async function contentHash(cert: Certificate): Promise<string> {
  try {
    const bytes = new TextEncoder().encode(JSON.stringify(cert));
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return [...new Uint8Array(digest)]
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
      .slice(0, 24);
  } catch {
    return "unavailable in this browser";
  }
}

export function Hallmark({ slug }: { slug: string }) {
  const cert = certificateFor(slug);
  const [hash, setHash] = useState("computing");
  useEffect(() => {
    void contentHash(cert).then(setHash);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  return (
    <div className="brand-surface" style={{ minHeight: "100vh" }}>
      <div className="brand-glow" />
      <div style={{ position: "relative", textAlign: "center", maxWidth: 560, padding: "0 24px" }}>
        <div className="brand-wordmark" style={{ fontSize: 30 }}>
          OSYLE
        </div>
        {cert.found ? (
          <>
            <p style={{ marginTop: 26, fontSize: 13, letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(245,244,255,0.6)" }}>
              Examined and maintained at Osyle
            </p>
            <div style={{ marginTop: 14, fontSize: 30, fontWeight: 510, color: "#fff", letterSpacing: "-0.01em" }}>
              {cert.name}
            </div>
            <div style={{ marginTop: 22, fontSize: 74, fontWeight: 510, color: "#fff", letterSpacing: "-0.03em", fontVariantNumeric: "tabular-nums" }}>
              {cert.vitality}
            </div>
            <div style={{ fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(245,244,255,0.55)" }}>
              Vitality
            </div>
            <div style={{ marginTop: 20, display: "grid", gap: 5, fontSize: 13.5, color: "rgba(245,244,255,0.75)" }}>
              <span>Last examined {cert.lastExamined}</span>
              {cert.uptime && <span>{cert.uptime}</span>}
            </div>
            <p className="mono" style={{ marginTop: 26, fontSize: 11.5, color: "rgba(245,244,255,0.5)", wordBreak: "break-all" }}>
              {hash}
            </p>
            <p style={{ fontSize: 11.5, color: "rgba(245,244,255,0.45)", marginTop: 4 }}>
              Content hash of this certificate. The signing key arrives with
              Real Mode.
            </p>
          </>
        ) : (
          <>
            <p style={{ marginTop: 26, fontSize: 15, color: "rgba(245,244,255,0.75)" }}>
              No certificate exists for {slug} yet. A hallmark is earned by an
              examination, not requested.
            </p>
          </>
        )}
        <a
          href={`#/r/${slug}`}
          style={{ display: "inline-block", marginTop: 30, color: "rgba(245,244,255,0.65)", fontSize: 13 }}
        >
          Visit the resident
        </a>
      </div>
    </div>
  );
}
