import { useStore } from "../store";
import { Page, Sparkle } from "../components/chrome";
import { pulseLineAfterHeal, pulseLineAtRest } from "../data/seed";

/**
 * The home surface, hard rules: at rest, maximum three numbers,
 * one pulse line, one CTA. Heal does the work.
 */
export function Home() {
  const { vitality, heal, healing, healableOpen, healed, go } = useStore();
  const healedSomething = healed.size > 1; // guilt-banner starts healed in the seed
  const pulseLine = healedSomething ? pulseLineAfterHeal : pulseLineAtRest;

  return (
    <Page>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 8,
          paddingTop: 40,
        }}
      >
        <span className="instrument-label">Vitality</span>
        <div className="instrument" key={vitality}>
          {vitality}
        </div>

        <div className="pulse-line" style={{ marginTop: 10 }}>
          <span className="pulse-dot" />
          <span>{pulseLine}</span>
        </div>

        <div
          style={{
            display: "flex",
            gap: 40,
            marginTop: 36,
            color: "var(--gray-meta)",
            fontSize: 13,
          }}
        >
          <span>
            <strong style={{ color: "var(--ink)", fontWeight: 550 }}>99.9</strong>{" "}
            uptime, 30 days
          </span>
          <span>
            <strong style={{ color: "var(--ink)", fontWeight: 550 }}>61st</strong>{" "}
            percentile, aviation training
          </span>
        </div>

        <div style={{ marginTop: 44 }}>
          {healableOpen.length > 0 || healing ? (
            <button className="pill pill-dark" onClick={heal} disabled={healing}>
              {healing
                ? "Healing"
                : `Heal ${numberWordLower(healableOpen.length)} issue${healableOpen.length === 1 ? "" : "s"}`}
              <Sparkle size={13} />
            </button>
          ) : (
            <button className="pill pill-dark" onClick={() => go("exam")}>
              Open the examination
              <Sparkle size={13} />
            </button>
          )}
        </div>
      </div>
    </Page>
  );
}

function numberWordLower(n: number): string {
  const words = ["zero", "one", "two", "three", "four", "five", "six"];
  return words[n] ?? String(n);
}
