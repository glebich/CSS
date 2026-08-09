import { useStore } from "../store";
import { Page, Sparkle } from "../components/chrome";
import { examDates, lenses } from "../data/seed";

function scoreTint(score: number): string {
  if (score < 45) return "var(--bad)";
  if (score < 60) return "var(--warn)";
  return "var(--ink)";
}

/** The Examination: ten lenses, one number. The reveal staggers in. */
export function Examination() {
  const { vitality, lensScore, go } = useStore();

  return (
    <Page>
      <div style={{ display: "flex", alignItems: "baseline", gap: 20 }}>
        <h1 className="statement statement-page">
          Ten lenses, <span className="quiet">one number.</span>
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
      <p style={{ color: "var(--gray-meta)", marginTop: 6 }}>
        Third examination, {examDates[2]}. Findings are about the software,
        never the person.
      </p>

      <div className="reveal-stagger" style={{ marginTop: 34 }}>
        {lenses.map((lens, i) => {
          const score = lensScore(lens.key);
          return (
            <div
              key={lens.key}
              className="lens-row"
              style={{ animationDelay: `${i * 60}ms` }}
            >
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
                      onClick={() => go("issues")}
                      style={{
                        color: "var(--bad)",
                        fontWeight: 550,
                        fontSize: 13,
                      }}
                    >
                      See the issue
                    </button>
                  </>
                )}
              </span>
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", justifyContent: "center", marginTop: 40 }}>
        <button className="pill pill-dark" onClick={() => go("transform")}>
          See the transformation
          <Sparkle size={13} />
        </button>
      </div>
    </Page>
  );
}
