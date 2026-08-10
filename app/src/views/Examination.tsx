import { useStore } from "../store";
import { Page, Sparkle } from "../components/chrome";
import { examClosing, examDates, lenses } from "../data/seed";

function scoreTint(score: number): string {
  if (score < 45) return "var(--bad)";
  if (score < 60) return "var(--warn)";
  return "var(--ink)";
}

/**
 * The Examination. For a real project every row is a measurement with
 * its formula stated; lenses that could not measure say so honestly.
 * For the example, the seeded report, labeled.
 */
export function Examination() {
  const { vitality, lensScore, go, project } = useStore();

  return (
    <Page>
      <div style={{ display: "flex", alignItems: "baseline", gap: 20 }}>
        <h1 className="statement statement-page">
          {project ? (
            <>
              Measured, <span className="quiet">not guessed.</span>
            </>
          ) : (
            <>
              Ten lenses, <span className="quiet">one number.</span>
            </>
          )}
        </h1>
        <span className="topbar-spacer" />
        <span
          style={{
            fontSize: 44,
            fontWeight: 550,
            letterSpacing: "-0.03em",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {vitality}
        </span>
      </div>
      <p style={{ color: "var(--gray-meta)", marginTop: 6, maxWidth: 680 }}>
        {project
          ? project.vitalityWhy
          : `Third examination, ${examDates[2]}. Findings are about the software, never the person.`}
      </p>

      <div className="reveal-stagger" style={{ marginTop: 34 }}>
        {project
          ? project.lenses.map((lens, i) => (
              <div key={lens.key} className="lens-row" style={{ animationDelay: `${i * 60}ms` }}>
                <span
                  className="lens-score"
                  style={{ color: lens.notApplicable ? "var(--gray-faint)" : scoreTint(lens.score) }}
                >
                  {lens.notApplicable ? "–" : lens.score}
                </span>
                <span className="lens-name">{lens.name}</span>
                <span className="lens-note">
                  {lens.notApplicable ??
                    (lens.findings.length > 0
                      ? `${lens.findings.map((f) => f.title).join(". ")}.`
                      : lens.strengths[0]?.detail ?? "Clean.")}{" "}
                  <span style={{ color: "var(--gray-tertiary)" }}>{lens.scoreWhy}</span>
                </span>
              </div>
            ))
          : lenses.map((lens, i) => {
              const score = lensScore(lens.key);
              return (
                <div key={lens.key} className="lens-row" style={{ animationDelay: `${i * 60}ms` }}>
                  <span className="lens-score" style={{ color: scoreTint(score) }}>
                    {score}
                  </span>
                  <span className="lens-name">{lens.name}</span>
                  <span className="lens-note">
                    {lens.note}
                    {lens.key === "apis" && (
                      <>
                        {" "}
                        <button
                          onClick={() => go("findings")}
                          style={{ color: "var(--bad)", fontWeight: 550, fontSize: 13 }}
                        >
                          See the finding
                        </button>
                      </>
                    )}
                  </span>
                </div>
              );
            })}
      </div>

      <div className="section-label" style={{ marginTop: 34 }}>
        What the examination understood
      </div>
      <p
        style={{
          fontStyle: "italic",
          fontSize: 16,
          lineHeight: 1.65,
          color: "var(--ink-body)",
          maxWidth: 640,
        }}
      >
        {project ? project.understanding : examClosing}
      </p>

      <div style={{ display: "flex", justifyContent: "center", marginTop: 40 }}>
        <button className="pill pill-dark" onClick={() => go("findings")}>
          Decide the findings
          <Sparkle size={13} />
        </button>
      </div>
    </Page>
  );
}
