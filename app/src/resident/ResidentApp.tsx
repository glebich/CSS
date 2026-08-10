import { useState } from "react";
import { createClient } from "@osyle/sdk";
import { styleCatalog } from "../data/seed";

/**
 * The resident, living at its address. This is SkyRecall itself, a real
 * working app: three radio-call drills, a logbook persisted through the
 * resident's own database, all of it wearing the identity chosen in the
 * studio. Navigation works, identity holds, data stays.
 */

const CALLS = [
  { call: "Runway 27L, cleared for takeoff", hint: "Say it before the throttle" },
  { call: "ILS 114 decimal 30, established", hint: "Confirm the localizer" },
  { call: "Tower 118 decimal 7, going around", hint: "The one nobody rehearses" },
];

function readChoice<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function ResidentApp({ slug }: { slug: string }) {
  const styleId = readChoice("osyle.demo.style", "st-paper");
  const comfort = readChoice("osyle.demo.comfort", false);
  const style = styleCatalog.find((s) => s.id === styleId) ?? styleCatalog[0];
  const scale = comfort ? 1.2 : 1;
  const sdk = createClient(slug);

  const [screen, setScreen] = useState<"home" | "drill" | "done" | "logbook">("home");
  const [step, setStep] = useState(0);
  const [entries, setEntries] = useState(() => sdk.rows("drills").list());

  function completeDrill() {
    sdk.rows("drills").insert({ kind: "radio-calls", calls: CALLS.length, score: 1 });
    sdk.kv.set("streak", sdk.kv.get("streak", 0) + 1);
    setEntries(sdk.rows("drills").list());
    setScreen("done");
  }

  const soft = style.dark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.72)";
  const faint = style.dark ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.5)";

  const button = (label: string, onClick: () => void, primary = true) => (
    <button
      onClick={onClick}
      style={{
        padding: `${12 * scale}px ${26 * scale}px`,
        borderRadius: 999,
        border: "none",
        cursor: "pointer",
        background: primary ? style.accent : soft,
        color: primary ? (style.dark ? "#0c0c0e" : "#fff") : style.ink,
        fontSize: 15 * scale,
        fontWeight: 650,
        fontFamily: "inherit",
      }}
    >
      {label}
    </button>
  );

  return (
    <div
      style={{
        minHeight: "100vh",
        background: style.swatch,
        color: style.ink,
        fontFamily: "var(--font)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "0 20px",
      }}
    >
      <header
        style={{
          width: "100%",
          maxWidth: 560,
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "22px 0",
        }}
      >
        <span
          style={{
            width: 28,
            height: 28,
            borderRadius: 9,
            background: style.accent,
            color: style.dark ? "#0c0c0e" : "#fff",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
            fontSize: 13,
          }}
        >
          S
        </span>
        <strong style={{ fontSize: 17 * scale }}>SkyRecall</strong>
        <span style={{ flex: 1 }} />
        <button
          onClick={() => setScreen(screen === "logbook" ? "home" : "logbook")}
          style={{ background: "none", border: "none", color: style.ink, cursor: "pointer", fontSize: 14 * scale, fontFamily: "inherit", opacity: 0.75 }}
        >
          {screen === "logbook" ? "Close" : `Logbook, ${entries.length}`}
        </button>
      </header>

      <main
        style={{
          width: "100%",
          maxWidth: 560,
          flex: 1,
          background: soft,
          borderRadius: style.radius + 8,
          padding: 28 * scale,
          marginBottom: 24,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {screen === "home" && (
          <>
            <h1 style={{ fontSize: 30 * scale, fontWeight: 700, letterSpacing: "-0.01em", lineHeight: 1.15 }}>
              Radio calls,
              <br />
              ten minutes
            </h1>
            <p style={{ marginTop: 12, fontSize: 14.5 * scale, lineHeight: comfort ? 1.8 : 1.6, color: faint, maxWidth: 380 }}>
              The three calls that decay first. Say each one aloud, tap when it
              came out clean.
            </p>
            <span style={{ flex: 1 }} />
            <div>{button("Begin the drill", () => { setStep(0); setScreen("drill"); })}</div>
          </>
        )}

        {screen === "drill" && (
          <>
            <span style={{ fontSize: 12 * scale, color: faint }}>
              Call {step + 1} of {CALLS.length}
            </span>
            <h1 style={{ fontSize: 26 * scale, fontWeight: 700, lineHeight: 1.3, marginTop: 14 }}>
              {CALLS[step].call}
            </h1>
            <p style={{ marginTop: 10, fontSize: 13.5 * scale, color: faint }}>{CALLS[step].hint}</p>
            <span style={{ flex: 1 }} />
            <div style={{ display: "flex", gap: 10 }}>
              {button(
                step + 1 < CALLS.length ? "Said it, next" : "Said it, log the drill",
                () => (step + 1 < CALLS.length ? setStep(step + 1) : completeDrill()),
              )}
              {button("Stop", () => setScreen("home"), false)}
            </div>
          </>
        )}

        {screen === "done" && (
          <>
            <h1 style={{ fontSize: 30 * scale, fontWeight: 700 }}>Logged.</h1>
            <p style={{ marginTop: 12, fontSize: 14.5 * scale, color: faint }}>
              Three clean calls. Your recall holds, and the logbook remembers.
            </p>
            <span style={{ flex: 1 }} />
            <div style={{ display: "flex", gap: 10 }}>
              {button("Again", () => { setStep(0); setScreen("drill"); })}
              {button("See the logbook", () => setScreen("logbook"), false)}
            </div>
          </>
        )}

        {screen === "logbook" && (
          <>
            <h1 style={{ fontSize: 24 * scale, fontWeight: 700 }}>Your logbook</h1>
            {entries.length === 0 ? (
              <>
                <p style={{ marginTop: 12, fontSize: 14 * scale, color: faint }}>
                  Empty, honestly. One drill fixes that.
                </p>
                <span style={{ flex: 1 }} />
                <div>{button("Start the radio-call drill", () => { setStep(0); setScreen("drill"); })}</div>
              </>
            ) : (
              <div style={{ marginTop: 14 }}>
                {entries
                  .slice()
                  .reverse()
                  .map((e) => (
                    <div
                      key={e.id}
                      style={{
                        padding: `${10 * scale}px 0`,
                        borderBottom: `1px solid ${style.dark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)"}`,
                        fontSize: 13.5 * scale,
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 12,
                      }}
                    >
                      <span>Radio-call drill, {String(e.calls ?? 3)} calls clean</span>
                      <span style={{ color: faint }}>{String(e.createdAt).slice(0, 10)}</span>
                    </div>
                  ))}
              </div>
            )}
          </>
        )}
      </main>

      <footer style={{ paddingBottom: 18, fontSize: 11.5, color: faint, display: "flex", gap: 6, alignItems: "center" }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#7b6bff", display: "inline-block" }} />
        Alive at Osyle
      </footer>
    </div>
  );
}
