import { useStore } from "../store";
import { Page, Sparkle } from "../components/chrome";
import { lenses, repairs } from "../data/seed";

/** The Reveal: every repair carries its why. For a real project the
 * plan is the accepted findings, each with its grounding. */
export function Reveal() {
  const { go, transformAccepted, heal, healableOpen, project, realDecisions } = useStore();

  if (project) {
    const accepted = project.lenses
      .flatMap((l) => l.findings)
      .filter((f) => realDecisions[f.id] === "accepted");
    return (
      <Page>
        <h1 className="statement statement-page">
          The plan, <span className="quiet">and why.</span>
        </h1>
        <p style={{ color: "var(--gray-meta)", marginTop: 6 }}>
          {accepted.length > 0
            ? `${accepted.length} accepted finding${accepted.length === 1 ? "" : "s"}, each grounded. This is what changes.`
            : "Nothing accepted yet. The findings desk holds the evidence."}
        </p>
        <div className="reveal-stagger" style={{ marginTop: 30, display: "grid", gap: 14 }}>
          {accepted.map((f, i) => (
            <div key={f.id} className="card card-pad" style={{ animationDelay: `${i * 70}ms` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 15, fontWeight: 510 }}>{f.title}</span>
                <span className="topbar-spacer" />
                <span className="chip">{f.lens}</span>
              </div>
              <p style={{ color: "var(--gray-meta)", marginTop: 8, maxWidth: 640 }}>
                {f.detail} {f.grounding}
              </p>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "center", marginTop: 36 }}>
          <button className="pill pill-dark" onClick={() => go(accepted.length > 0 ? "home" : "findings")}>
            {accepted.length > 0 ? "Back to the surface" : "To the findings"}
            <Sparkle size={13} />
          </button>
        </div>
      </Page>
    );
  }

  return (
    <Page>
      <h1 className="statement statement-page">
        Repaired, <span className="quiet">and why.</span>
      </h1>
      <p style={{ color: "var(--gray-meta)", marginTop: 6 }}>
        {transformAccepted
          ? "These repairs are live in the transformation you accepted."
          : "These repairs are staged in the transformation, waiting on your accept."}
      </p>

      <div className="reveal-stagger" style={{ marginTop: 30, display: "grid", gap: 14 }}>
        {repairs.map((r, i) => (
          <div
            key={r.id}
            className="card card-pad"
            style={{ animationDelay: `${i * 70}ms` }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 15, fontWeight: 550 }}>{r.what}</span>
              <span className="topbar-spacer" />
              <span className="chip">{lensName(r.lens)}</span>
            </div>
            <p style={{ color: "var(--gray-meta)", marginTop: 8, maxWidth: 640 }}>
              {r.why}
            </p>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 36 }}>
        {healableOpen.length > 0 ? (
          <>
            <button className="pill" onClick={() => go("findings")}>
              Decide them one by one
            </button>
            <button className="pill pill-dark" onClick={() => { heal(); go("home"); }}>
              Heal these now
              <Sparkle size={13} />
            </button>
          </>
        ) : (
          <button className="pill pill-dark" onClick={() => go("findings")}>
            See the findings desk
            <Sparkle size={13} />
          </button>
        )}
      </div>
    </Page>
  );
}

function lensName(key: string): string {
  return lenses.find((l) => l.key === key)?.name ?? key;
}
