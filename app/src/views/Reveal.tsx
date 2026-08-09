import { useStore } from "../store";
import { Page, Sparkle } from "../components/chrome";
import { lenses, repairs } from "../data/seed";

/** The Reveal: every repair carries its why. */
export function Reveal() {
  const { go, transformAccepted } = useStore();

  return (
    <Page>
      <h1 className="statement" style={{ fontSize: 44 }}>
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

      <div style={{ display: "flex", justifyContent: "center", marginTop: 36 }}>
        <button className="pill pill-dark" onClick={() => go("home")}>
          Back to the surface
          <Sparkle size={13} />
        </button>
      </div>
    </Page>
  );
}

function lensName(key: string): string {
  return lenses.find((l) => l.key === key)?.name ?? key;
}
