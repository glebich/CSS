import { useEffect, useRef, useState } from "react";
import { useStore } from "../store";
import { MiniApp } from "../components/MiniApp";
import { Sparkle, Wordmark } from "../components/chrome";

/** Nominative marks only: we integrate with these, nothing implied. */
const WORKS_WITH: Array<{ name: string; does: string }> = [
  { name: "GitHub", does: "Connect a repository and Osyle reads the app from it" },
  { name: "Lovable", does: "Lovable output imports as files, a zip, or a repo" },
  { name: "Cursor", does: "Cursor projects import as files, a zip, or a repo" },
  { name: "Claude", does: "Your Claude key powers live Studio edits with Real Mode" },
  { name: "v0", does: "v0 output imports as files, a zip, or a repo" },
  { name: "Bolt", does: "Bolt projects import as files, a zip, or a repo" },
  { name: "Replit", does: "Replit projects import as files, a zip, or a repo" },
  { name: "Figma", does: "Figma exports arrive as materials for the identity" },
];

const LENSES = [
  "Accessibility and contrast",
  "Typography",
  "Color discipline",
  "Attention and choice",
  "Psychology and honesty",
  "Code health",
  "Security",
  "Performance weight",
];

/* Every number on this page is real and says where it came from. */
const STATS: Array<{ figure: string; caption: string }> = [
  {
    figure: "8 lenses",
    caption: "Each a real analyzer that cites the file and line it read, never a vibe.",
  },
  {
    figure: "36 ms",
    caption: "p95 across 1400 calls in the 200 person drill, measured on the build machine.",
  },
  {
    figure: "0.3 s",
    caption: "Cold start after the rehearsal destroyed the data and restored it from backup.",
  },
];

const LAWS: Array<{ title: string; body: string }> = [
  {
    title: "Estimates say so",
    body: "Every number that is a guess is labeled a guess, with the reasoning waiting under the cursor. Measured numbers carry their evidence.",
  },
  {
    title: "Examples say so",
    body: "Seeded rows wear the word Example. Your own rows say live, because they are. The two never dress alike.",
  },
  {
    title: "Unbuilt stages name themselves",
    body: "A feature that has not arrived tells you the stage it arrives with, instead of pretending. Demo Mode never dies in a room.",
  },
];

function validKey(kind: "anthropic" | "gemini", value: string): boolean | null {
  if (!value) return null;
  return kind === "anthropic" ? /^sk-ant-/.test(value) : /^AIza/.test(value);
}

function Feature({ id, label, heading, lede, points, extra }: {
  id: string;
  label: string;
  heading: string;
  lede: string;
  points: string[];
  extra?: React.ReactNode;
}) {
  return (
    <section id={id} className="land-feature">
      <div className="land-feature-head">
        <span className="section-label">{label}</span>
        <h2>{heading}</h2>
        <p>{lede}</p>
      </div>
      <div className="land-feature-body">
        <ul className="land-points">
          {points.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
        {extra}
      </div>
    </section>
  );
}

/**
 * The front door: what Osyle is, exactly what it does, and why the
 * page itself can be trusted. The render in the hero is the real
 * MiniApp, live, not a screenshot. The demo's hidden controls stay:
 * R three times resets, period opens the settings sheet.
 */
export function Landing() {
  const { go, resetDemo } = useStore();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [realMode, setRealMode] = useState(() => {
    try {
      return localStorage.getItem("osyle.realMode") === "true";
    } catch {
      return false;
    }
  });
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
    <div className="land">
      <nav className="land-nav">
        <Wordmark />
        <div className="land-nav-links">
          <a href="#examination">The examination</a>
          <a href="#address">The address</a>
          <a href="#life">The life</a>
          <a href="#laws">The laws</a>
        </div>
        <div className="land-nav-cta">
          <a href="#/discover" className="land-quiet-link">
            See who lives here
          </a>
          <button className="pill pill-dark pill-sm" onClick={() => go("place")}>
            Drop your app
          </button>
        </div>
      </nav>

      <header className="land-hero">
        <div className="land-hero-copy">
          <span className="section-label">Where generated software lives</span>
          <h1>Turn a generated app into software people can trust.</h1>
          <p>
            Drop the app your AI built, or connect its repository. Osyle examines
            it across eight real lenses with file and line evidence, heals what
            it can with a receipt for every repair, and gives it an address
            where it keeps living, versioned, served, and watched.
          </p>
          <div className="land-hero-ctas">
            <button className="pill pill-dark" onClick={() => go("place")}>
              <Sparkle size={13} />
              Drop your app
            </button>
            <button className="pill" onClick={() => go("place")}>
              Watch the example first
            </button>
          </div>
          <span className="land-hero-note">
            Free. The examination asks for no account.
          </span>
        </div>
        <figure className="land-hero-render">
          <div className="phone-frame land-phone">
            <div className="phone-screen">
              <MiniApp variant="live" />
            </div>
          </div>
          <figcaption>A live render, not a screenshot. It follows every dial inside.</figcaption>
        </figure>
      </header>

      <section className="land-stats">
        <p className="land-stats-lede">
          Built for people whose app was written in an afternoon, and who still
          have to stand behind it.
        </p>
        <div className="land-stats-row">
          {STATS.map((s) => (
            <div key={s.figure} className="land-stat card">
              <div className="land-stat-figure">{s.figure}</div>
              <p>{s.caption}</p>
            </div>
          ))}
        </div>
        <p className="land-stats-foot">
          Every push runs both test suites and both drills in public before
          anything ships.
        </p>
      </section>

      <Feature
        id="examination"
        label="The examination"
        heading="It reads the app the way a senior team would."
        lede="Minutes after the drop you hold a report where every line can defend itself."
        points={[
          "Every finding cites its file and line; nothing arrives as an opinion.",
          "What a repair is worth is said in dollars a month and labeled an estimate.",
          "Heal applies the repairs it can and shows the receipt for each one.",
          "A clean app is never a dead end; the improvement prompt carries the deeper pass to whatever builds your app.",
        ]}
        extra={
          <div className="land-lens-grid">
            {LENSES.map((l) => (
              <span key={l} className="land-lens">
                {l}
              </span>
            ))}
          </div>
        }
      />

      <Feature
        id="address"
        label="The address"
        heading="A report is not a home."
        lede="The app moves in, and moving in means it keeps existing after the tab closes."
        points={[
          "It serves at its own address, openable and shareable from day one.",
          "The Vault versions every file; nothing is ever overwritten, and one click restores any earlier version forward.",
          "The resident panel keeps the files, the latest updates, pull requests, visibility, and the domain door in one place.",
          "The Survival Index counts a resident alive when its own users touch it, not when a dashboard says so.",
        ]}
      />

      <Feature
        id="life"
        label="The life"
        heading="Software that keeps being worked on."
        lede="The room around the app: who is inside it, how it feels, and how it changes."
        points={[
          "The people inside: live rows from the SDK, streaks, drills, and where they drop off.",
          "The Studio takes a change in plain words and shows the diff; nothing applies without you, and your own key powers the live edits.",
          "Mood, personas, and devices reshape the same app live, from a phone to a watch.",
          "The store kit and the report card leave the building with you when it is time to ship.",
        ]}
      />

      <section id="laws" className="land-laws">
        <span className="section-label">The laws we keep</span>
        <h2>Why you can trust the page in front of you.</h2>
        <div className="land-laws-row">
          {LAWS.map((law) => (
            <div key={law.title} className="land-law">
              <h3>{law.title}</h3>
              <p>{law.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="land-works">
        <span className="works-label">Works with</span>
        {WORKS_WITH.map((w) => (
          <span key={w.name} className="works-mark" title={w.does}>
            {w.name}
          </span>
        ))}
      </section>

      <footer className="land-close">
        <div className="brand-glow" style={{ transform: "translateX(-190px)" }} />
        <h2>Drop the app. Watch it examined. Give it the address.</h2>
        <div className="brand-promises">Safe. Designed. Usable. Tested. Evolving. Shared.</div>
        <button className="brand-enter" onClick={() => go("place")}>
          <Sparkle size={13} />
          Drop your app
        </button>
        <div className="brand-foot">
          Where generated software lives
          <a href="#/discover" className="land-close-link">
            See who lives here
          </a>
        </div>
      </footer>

      {sheetOpen && (
        <div
          className="glass-panel fade-in"
          style={{
            position: "fixed",
            right: 24,
            top: 24,
            width: 320,
            padding: 22,
            color: "var(--ink-body)",
            textAlign: "left",
            zIndex: 40,
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
                try {
                  localStorage.setItem("osyle.realMode", String(e.target.checked));
                } catch {
                  /* the toggle still flips for this session */
                }
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
