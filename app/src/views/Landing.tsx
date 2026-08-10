import { useEffect, useRef, useState } from "react";
import { useStore } from "../store";
import { Sparkle } from "../components/chrome";

function validKey(kind: "anthropic" | "gemini", value: string): boolean | null {
  if (!value) return null;
  return kind === "anthropic" ? /^sk-ant-/.test(value) : /^AIza/.test(value);
}

/**
 * The brand surface, with the demo's hidden controls per the spec:
 * R three times resets to pristine in under a second; period opens the
 * settings sheet with the Real Mode toggle and the BYO key fields.
 */
export function Landing() {
  const { go, resetDemo } = useStore();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [realMode, setRealMode] = useState(
    () => localStorage.getItem("osyle.realMode") === "true",
  );
  const [anthropicKey, setAnthropicKey] = useState("");
  const [geminiKey, setGeminiKey] = useState("");
  const presses = useRef<number[]>([]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === ".") setSheetOpen((v) => !v);
      if (e.key.toLowerCase() === "r") {
        const now = Date.now();
        presses.current = [...presses.current.filter((t) => now - t < 800), now];
        if (presses.current.length >= 3) {
          presses.current = [];
          resetDemo();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [resetDemo]);

  const aOk = validKey("anthropic", anthropicKey);
  const gOk = validKey("gemini", geminiKey);

  return (
    <div className="brand-surface">
      <div className="brand-glow" style={{ transform: "translateX(-190px)" }} />
      <div style={{ position: "relative", textAlign: "center" }}>
        <div className="brand-wordmark">OSYLE</div>
        <p className="brand-tagline">
          Drop your app. See everything it could be. Free.
        </p>
        <button className="brand-enter" onClick={() => go("place")}>
          <Sparkle size={13} />
          Drop your app
        </button>
      </div>
      <div className="brand-foot">Where generated software lives</div>

      {sheetOpen && (
        <div
          className="glass-panel fade-in"
          style={{
            position: "absolute",
            right: 24,
            top: 24,
            width: 320,
            padding: 22,
            color: "var(--ink-body)",
            textAlign: "left",
          }}
        >
          <div className="panel-title" style={{ fontSize: 18 }}>
            Demo settings
          </div>
          <label
            style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13.5, cursor: "pointer" }}
          >
            <input
              type="checkbox"
              checked={realMode}
              onChange={(e) => {
                setRealMode(e.target.checked);
                localStorage.setItem("osyle.realMode", String(e.target.checked));
              }}
            />
            Real Mode
          </label>
          <p style={{ fontSize: 11.5, color: "var(--gray-small)", marginTop: 4, lineHeight: 1.5 }}>
            The switch is wired; the platform arrives with its stage. Demo
            Mode never dies in a room.
          </p>
          <div style={{ marginTop: 14, display: "grid", gap: 8 }}>
            <input
              placeholder="Anthropic key, sk-ant-..."
              value={anthropicKey}
              onChange={(e) => setAnthropicKey(e.target.value)}
              style={{ padding: "9px 12px", borderRadius: 10, border: "1px solid var(--hairline)", fontSize: 12.5 }}
            />
            {aOk !== null && (
              <span style={{ fontSize: 11.5, color: aOk ? "var(--ok)" : "var(--bad)" }}>
                {aOk ? "Looks right" : "Not a key we recognize"}
              </span>
            )}
            <input
              placeholder="Gemini key, AIza..."
              value={geminiKey}
              onChange={(e) => setGeminiKey(e.target.value)}
              style={{ padding: "9px 12px", borderRadius: 10, border: "1px solid var(--hairline)", fontSize: 12.5 }}
            />
            {gOk !== null && (
              <span style={{ fontSize: 11.5, color: gOk ? "var(--ok)" : "var(--bad)" }}>
                {gOk ? "Looks right" : "Not a key we recognize"}
              </span>
            )}
          </div>
          <p style={{ fontSize: 11, color: "var(--gray-small)", marginTop: 10 }}>
            Keys stay on this machine. R three times resets the demo.
          </p>
        </div>
      )}
    </div>
  );
}
