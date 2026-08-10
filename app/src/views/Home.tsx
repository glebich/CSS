import { useEffect, useRef, useState } from "react";
import { currentState, useStore } from "../store";
import { Page, Sparkle, Tip } from "../components/chrome";
import { issues, pulseLineAfterHeal, pulseLineAtRest } from "../data/seed";

function keyStillBroken(healed: Set<string>): boolean {
  return currentState("weather-key", healed) !== "healed";
}

/** The numeral counts up once on arrival from Launch: the earned reveal. */
function useRevealCount(target: number, animate: boolean): number {
  const [value, setValue] = useState(animate ? 0 : target);
  const done = useRef(!animate);
  useEffect(() => {
    if (done.current) {
      setValue(target);
      return;
    }
    done.current = true;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / 700);
      setValue(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target, animate]);
  return value;
}

/**
 * The home surface, hard rules kept: at rest, three numbers, one pulse
 * line, one CTA. The CTA always names the next step; when nothing needs
 * you, it says so, because that trust is the return loop.
 */
export function Home() {
  const {
    vitality,
    heal,
    healing,
    healableOpen,
    healed,
    go,
    justLaunched,
    clearLaunchArrival,
    returned,
    dismissReturn,
    transformAccepted,
    inbox,
    seenTips,
  } = useStore();
  const [reveal] = useState(justLaunched);
  useEffect(() => {
    if (justLaunched) clearLaunchArrival();
  }, [justLaunched, clearLaunchArrival]);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const shown = useRevealCount(vitality, reveal);
  const healedSomething = healed.size > 1; // the guilt banner starts healed in the seed
  const pulseLine = healedSomething ? pulseLineAfterHeal : pulseLineAtRest;
  const unread = inbox.filter((e) => !e.read).length;
  const healables = issues.filter((i) => healableOpen.includes(i.id));

  return (
    <Page>
      {returned && (
        <div className="card card-solid since-card fade-in">
          <div className="since-label">Since you left</div>
          <p style={{ fontSize: 15, lineHeight: 1.6, marginTop: 10, color: "var(--ink-body)" }}>
            SkyRecall stayed up and served its pilots. Nine sessions today,
            four stalled at the weather briefing, the broken key is still the
            likely cause. Vitality held at {vitality}.
          </p>
          <div style={{ display: "flex", gap: 12, marginTop: 16, alignItems: "center" }}>
            <button className="pill pill-sm" onClick={() => { dismissReturn(); go("inbox"); }}>
              Catch up in the Inbox{unread > 0 ? `, ${unread} new` : ""}
            </button>
            <button className="topbar-quiet" onClick={dismissReturn} style={{ padding: 0 }}>
              Skip
            </button>
          </div>
        </div>
      )}

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 8,
          paddingTop: returned ? 0 : 40,
        }}
      >
        <span className="instrument-label">Vitality</span>
        <button className="instrument" onClick={() => go("exam")} title="See the ten lenses">
          {shown}
        </button>
        <Tip id="vitality">
          The weighted health of your app across ten lenses. The number is
          the truth; tap it for the why.
        </Tip>

        <div className="pulse-line" style={{ marginTop: 10 }}>
          <span className={`pulse-dot${healedSomething ? " swell" : ""}`} />
          <span>{pulseLine}</span>
        </div>

        <div
          style={{
            display: "flex",
            gap: 40,
            marginTop: 32,
            color: "var(--gray-meta)",
            fontSize: 13,
          }}
        >
          <span>
            <strong style={{ color: "var(--ink)", fontWeight: 510 }}>99.9</strong>{" "}
            uptime, 30 days
          </span>
          <span>
            <strong style={{ color: "var(--ink)", fontWeight: 510 }}>61st</strong>{" "}
            percentile, aviation training
          </span>
        </div>

        <div style={{ marginTop: 40, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          {healableOpen.length > 0 || healing ? (
            <>
              <button className="pill pill-dark" onClick={heal} disabled={healing}>
                {healing
                  ? "Healing"
                  : `Heal ${numberWordLower(healableOpen.length)} issue${healableOpen.length === 1 ? "" : "s"}`}
                <Sparkle size={13} />
              </button>
              {seenTips.has("vitality") && (
                <Tip id="heal">
                  Heal applies safe repairs itself. Everything is annotated,
                  nothing is deleted.
                </Tip>
              )}
              {!healing && (
                <button
                  className="topbar-quiet"
                  style={{ padding: 0 }}
                  onClick={() => setReceiptOpen(!receiptOpen)}
                >
                  {receiptOpen ? "Hide the list" : "What will Heal touch"}
                </button>
              )}
              {receiptOpen && !healing && (
                <div className="receipt fade-in" style={{ marginBottom: 90 }}>
                  {healables.map((i) => (
                    <div key={i.id} className="receipt-row">
                      <span className="pulse-dot" style={{ animation: "none", width: 6, height: 6 }} />
                      {i.title}
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : !transformAccepted ? (
            <button className="pill pill-dark" onClick={() => go("transform")}>
              See what changed
              <Sparkle size={13} />
            </button>
          ) : keyStillBroken(healed) ? (
            <>
              <div className="pulse-line">
                <span>One thing waits on you: the weather key.</span>
              </div>
              <button className="pill pill-dark" onClick={() => go("issues")}>
                Open the Fix Prompt
                <Sparkle size={13} />
              </button>
            </>
          ) : (
            <>
              <div className="pulse-line">
                <span>Nothing needs you. The Art Director watches.</span>
              </div>
              <button className="pill" onClick={() => go("exam")}>
                See the report
              </button>
            </>
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
