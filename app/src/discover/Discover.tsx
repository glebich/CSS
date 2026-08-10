import { resident } from "../data/seed";

/**
 * Discover at #/discover: where residents are seen. Everything shown
 * is real: the example resident labeled as the example, and every app
 * that took an address on this machine. The network's feed arrives
 * with its density, and the page says so instead of pretending.
 */

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

interface Row {
  slug: string;
  name: string;
  vitality: number;
  line: string;
  example: boolean;
}

function residents(): Row[] {
  const registry = loadJson<
    Record<string, { name: string; vitality: number; savedAt: string; files: unknown[] }>
  >("osyle.residents", {});
  const healed = loadJson<string[]>("osyle.demo.healed", []);
  const rows: Row[] = Object.entries(registry).map(([slug, r]) => ({
    slug,
    name: r.name,
    vitality: r.vitality,
    line: `Moved in ${r.savedAt.slice(0, 10)}, ${r.files.length} files held`,
    example: false,
  }));
  rows.push({
    slug: resident.slug,
    name: resident.name,
    vitality: healed.length > 1 ? 69 : 66,
    line: "A recall instrument for pilots who fly rarely",
    example: true,
  });
  return rows;
}

export function Discover() {
  const rows = residents();
  return (
    <main className="canvas canvas-dotted" style={{ minHeight: "100vh", overflowY: "auto" }}>
      <div className="canvas-inner" style={{ maxWidth: 880 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, paddingTop: 14 }}>
          <h1 className="statement statement-page">
            Who lives <span className="quiet">here.</span>
          </h1>
          <span className="topbar-spacer" />
          <a className="pill pill-sm" href="#/" style={{ textDecoration: "none" }}>
            Back to Osyle
          </a>
        </div>
        <p style={{ color: "var(--gray-meta)", marginTop: 8, maxWidth: 620 }}>
          Every app that took an address on this machine. The network&apos;s
          feed, category showcases, and transformation posts arrive with the
          density to fill them.
        </p>

        <div style={{ display: "grid", gap: 14, marginTop: 26, paddingBottom: 60 }}>
          {rows.map((r) => (
            <div key={r.slug} className="card card-pad">
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <span className="pulse-dot" style={r.example ? { animation: "none" } : undefined} />
                <span style={{ fontSize: 18, fontWeight: 550 }}>{r.name}</span>
                <span className="chip">{r.slug}.osyle.app</span>
                {r.example && <span className="chip">Example</span>}
                <span className="topbar-spacer" />
                <span style={{ fontSize: 15, fontWeight: 550, fontVariantNumeric: "tabular-nums" }}>
                  {r.vitality}
                </span>
                <span style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--gray-small)" }}>
                  Vitality
                </span>
              </div>
              <p style={{ fontSize: 13, color: "var(--gray-meta)", marginTop: 8 }}>{r.line}</p>
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <a className="pill pill-sm" href={`#/r/${r.slug}`} style={{ textDecoration: "none" }}>
                  Visit
                </a>
                <a className="pill pill-sm" href={`#/mark/${r.slug}`} style={{ textDecoration: "none" }}>
                  Hallmark
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
