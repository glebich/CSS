import { useEffect, useState } from "react";
import { createClient } from "@osyle/sdk";
import { buildSrcDoc } from "../engine/analyze";
import { contrastRatio, parseColor } from "../engine/color";
import type { ProjectFile } from "../engine/types";
import { motionFor, styleCatalog } from "../data/seed";

/**
 * The resident, living at its address. The skyrecall slug serves the
 * example app; every other slug serves an app someone actually dropped,
 * reassembled from the files the address holds. Either way, the address
 * is not a metaphor: it serves.
 */

type StoredResident = {
  name: string;
  vitality: number;
  styleId: string;
  savedAt: string;
  files: Array<{ path: string; text: string }>;
  media?: Array<{ path: string; dataUri: string; bytes: number }>;
};

/** A dropped app, served from its address: the files it arrived with. */
function RealResident({ slug }: { slug: string }) {
  const registry = readChoice<Record<string, StoredResident>>("osyle.residents", {});
  const stored = registry[slug];

  if (!stored) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#f3f1ef",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 14,
          fontFamily: "var(--font)",
          color: "#141210",
        }}
      >
        <div style={{ fontSize: 26, fontWeight: 510, letterSpacing: "-0.02em" }}>
          Nothing lives at {slug}.osyle.app yet.
        </div>
        <p style={{ fontSize: 14, color: "rgba(20,18,16,0.55)", maxWidth: 420, textAlign: "center" }}>
          An address appears when an examined app moves in. Place your app,
          read its report, and give it the address.
        </p>
        <a className="pill" href="#/" style={{ textDecoration: "none" }}>
          Back to Osyle
        </a>
      </div>
    );
  }

  const files = new Map<string, ProjectFile>(
    stored.files.map((f) => [f.path, { path: f.path, text: f.text, bytes: f.text.length }]),
  );
  for (const m of stored.media ?? []) {
    files.set(m.path, { path: m.path, text: null, bytes: m.bytes, dataUri: m.dataUri });
  }
  const doc = buildSrcDoc(files);

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#f3f1ef" }}>
      {doc ? (
        <iframe
          title={stored.name}
          sandbox="allow-scripts"
          srcDoc={doc}
          style={{ flex: 1, width: "100%", border: "none", background: "#fff" }}
        />
      ) : (
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            fontFamily: "var(--font)",
            color: "#141210",
          }}
        >
          <div style={{ fontSize: 22, fontWeight: 510 }}>
            {stored.name} lives here, holding {stored.files.length} file
            {stored.files.length === 1 ? "" : "s"}.
          </div>
          <p style={{ fontSize: 14, color: "rgba(20,18,16,0.55)", maxWidth: 460, textAlign: "center" }}>
            No page arrived to serve yet. Frameworks that need a build step
            get their full runtime with the Studio's deeper pass.
          </p>
        </div>
      )}
      <footer
        style={{
          padding: "10px 18px",
          fontSize: 11.5,
          color: "rgba(20,18,16,0.5)",
          display: "flex",
          gap: 8,
          alignItems: "center",
          fontFamily: "var(--font)",
          borderTop: "1px solid rgba(20,18,16,0.06)",
        }}
      >
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#7b6bff", display: "inline-block" }} />
        {slug}.osyle.app, alive at Osyle
        <span style={{ flex: 1 }} />
        <span>Vitality {stored.vitality} when it moved in</span>
      </footer>
    </div>
  );
}

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
  if (slug !== "skyrecall") return <RealResident slug={slug} />;
  return <SkyRecall slug={slug} />;
}

function SkyRecall({ slug }: { slug: string }) {
  const styleId = readChoice("osyle.demo.style", "st-paper");
  const comfort = readChoice("osyle.demo.comfort", false);
  const style = styleCatalog.find((s) => s.id === styleId) ?? styleCatalog[0];
  /* Adaptation: the primary archetype's age range sets scale and pace.
     An older audience gets bigger and calmer, a younger one denser. */
  const audience = readChoice<{
    archetypes: Array<{ id: string; ageRange: [number, number] }>;
    primaryId: string;
  }>("osyle.demo.audience", { archetypes: [], primaryId: "" });
  const primary = audience.archetypes.find((a) => a.id === audience.primaryId);
  const mid = primary ? (primary.ageRange[0] + primary.ageRange[1]) / 2 : 47;
  const adapt = mid >= 45 ? "calm" : mid <= 32 ? "dense" : "neutral";
  const scale = (comfort ? 1.2 : 1) * (adapt === "calm" ? 1.08 : adapt === "dense" ? 0.95 : 1);
  const motion = motionFor(style);
  const sdk = createClient(slug);

  /* X-ray: one gesture flips the live app into blueprint view */
  const [xray, setXray] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "x" && !(e.target instanceof HTMLInputElement)) {
        setXray((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  /* the blueprint's numbers are measured, not decorative */
  const surfaceHex = style.swatch.match(/#[0-9a-fA-F]{6}/)?.[0] ?? "#ffffff";
  const inkRgb = parseColor(style.ink);
  const surfaceRgb = parseColor(surfaceHex);
  const accentRgb = parseColor(style.accent);
  const inkContrast = inkRgb && surfaceRgb ? contrastRatio(inkRgb, surfaceRgb) : 0;
  const accentContrast = accentRgb && surfaceRgb ? contrastRatio(accentRgb, surfaceRgb) : 0;

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
        transition: `all ${motion.ms}ms ${motion.ease}`,
      }}
    >
      {label}
    </button>
  );

  return (
    <div
      data-adapt={adapt}
      data-xray={xray ? "on" : "off"}
      className={xray ? "xray-on" : undefined}
      style={{
        minHeight: "100vh",
        background: style.swatch,
        color: style.ink,
        fontFamily: "var(--font)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "0 20px",
        position: "relative",
      }}
    >
      {xray && (
        <aside className="xray-panel">
          <div style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", opacity: 0.7 }}>
            X-ray, measured live
          </div>
          <div style={{ marginTop: 8, display: "grid", gap: 3, fontSize: 12 }}>
            <span>Type ramp: {Math.round(30 * scale)} / {Math.round(26 * scale)} / {Math.round(17 * scale)} / {Math.round(14.5 * scale)} / {Math.round(12 * scale)}</span>
            <span>Spacing: 28 / 22 / 12 / 10</span>
            <span>Radius: {style.radius} on cards, full on actions</span>
            <span>
              Ink on surface {inkContrast.toFixed(1)} to 1{inkContrast >= 4.5 ? ", clears AA" : ", below AA 4.5"}
            </span>
            <span>
              Accent on surface {accentContrast.toFixed(1)} to 1, large text needs 3
            </span>
            <span>Motion: {motion.name}, {motion.ms}ms</span>
          </div>
          <div style={{ marginTop: 8, fontSize: 11, opacity: 0.65 }}>Press x to close</div>
        </aside>
      )}
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

      <footer style={{ paddingBottom: 18, fontSize: 11.5, color: faint, display: "flex", gap: 12, alignItems: "center" }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#7b6bff", display: "inline-block" }} />
        Alive at Osyle
        <button
          onClick={() => setXray((v) => !v)}
          style={{ background: "none", border: "none", color: faint, cursor: "pointer", fontSize: 11.5, fontFamily: "inherit", textDecoration: "underline", padding: 0 }}
        >
          {xray ? "Close X-ray" : "X-ray"}
        </button>
        <a href={`#/mark/${slug}`} style={{ color: faint, fontSize: 11.5 }}>
          Hallmark
        </a>
      </footer>
    </div>
  );
}
