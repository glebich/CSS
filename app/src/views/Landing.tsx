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

/* The market flip, in published numbers. Sources named below the row. */
const STATS: Array<{ figure: string; caption: string }> = [
  {
    figure: "84%",
    caption: "of developers now build with AI coding tools. Generation is no longer the hard part.",
  },
  {
    figure: "3%",
    caption: "report high trust in AI-generated code. Trust is the scarce good now.",
  },
  {
    figure: "66%",
    caption: "name almost right, but not quite as their top frustration with generated code.",
  },
  {
    figure: "45%",
    caption: "of AI-generated code samples carry an OWASP Top 10 security flaw.",
  },
];

/* The loop, exactly as the product runs it. */
const LOOP: Array<{ n: string; title: string; body: string }> = [
  {
    n: "1",
    title: "Import",
    body: "Drop a zip, a folder, or a repo. It becomes a resident with its own address.",
  },
  {
    n: "2",
    title: "Examine",
    body: "Eight lenses, one Vitality score, evidence on every finding.",
  },
  {
    n: "3",
    title: "Heal and transform",
    body: "One-tap repairs with receipts. Nothing applies without you.",
  },
  {
    n: "4",
    title: "Run, watch, promote",
    body: "Served at its address, watched, and carried to the audience it was built to win.",
  },
];

/* The three problems the whole industry agrees are unsolved. */
const PROBLEMS: Array<{ n: string; title: string; pain: string; answer: string }> = [
  {
    n: "01",
    title: "Nobody knows if it works",
    pain: "A third of generated apps ship with no testing at all.",
    answer: "Eight lenses. File and line evidence. No dead ends.",
  },
  {
    n: "02",
    title: "Everything looks the same",
    pain: "Identical prompts, identical apps. Users can feel it.",
    answer: "A taste system that makes the same app feel authored.",
  },
  {
    n: "03",
    title: "Nobody owns it after it ships",
    pain: "Vulnerabilities land at many times the human rate.",
    answer: "Residency: versioned, watched, healed after the tab closes.",
  },
];

const LAWS: Array<{ title: string; body: string }> = [
  { title: "Estimates say so", body: "Every guess is labeled a guess. Every measured number carries its evidence." },
  { title: "Examples say so", body: "Demo data wears the word Example. Your data speaks live." },
  {
    title: "Unbuilt stages name themselves",
    body: "Nothing pretends to exist. What has not arrived names its stage.",
  },
];

function validKey(kind: "anthropic" | "gemini", value: string): boolean | null {
  if (!value) return null;
  return kind === "anthropic" ? /^sk-ant-/.test(value) : /^AIza/.test(value);
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
  /* the concept film plays when its host answers; the live render steps in when it cannot */
  const [videoAlive, setVideoAlive] = useState(true);
  const [videoReady, setVideoReady] = useState(false);
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
          <a href="#examination">The moment</a>
          <a href="#address">The loop</a>
          <a href="#life">The problems</a>
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
          <span className="section-label">The last mile for generated apps</span>
          <h1>You built it with AI. We make it ready for the world.</h1>
          <p>
            Osyle is the last mile between a vibe-coded app and a
            professional product. Drop what you built, from any tool; it
            gets examined across eight real lenses, healed with receipts,
            dressed by a taste system built on twenty-five years of product
            design, and given an address where it keeps living.
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
          <div className="land-cred">
            <span className="works-label">Design led by 25 years building products for</span>
            {["Apple", "Google", "OpenAI", "Samsung"].map((n) => (
              <span key={n} className="works-mark" title="Named for the design career behind the taste system, nothing implied beyond it">
                {n}
              </span>
            ))}
          </div>
        </div>
        <figure className="land-hero-render">
          <div className="phone-frame land-phone">
            <div className="phone-screen" style={{ position: "relative" }}>
              {/* the live render holds the frame; the film fades in only
                  once it has buffered enough to play without stutter */}
              {(!videoAlive || !videoReady) && <MiniApp variant="live" />}
              {videoAlive && (
                <video
                  className="land-hero-video"
                  style={
                    videoReady
                      ? undefined
                      : { position: "absolute", inset: 0, opacity: 0, pointerEvents: "none" }
                  }
                  src="https://dl.dropboxusercontent.com/scl/fi/me20l4e9nwo59wsuexjes/0519-concept.mp4?rlkey=4k7tppfpbjf5cg54qwn941phl"
                  preload="auto"
                  autoPlay
                  muted
                  loop
                  playsInline
                  onCanPlayThrough={() => setVideoReady(true)}
                  onError={() => setVideoAlive(false)}
                />
              )}
            </div>
          </div>
          <figcaption>
            {videoAlive && videoReady
              ? "The concept film. The live product is one drop away."
              : "A live render, not a screenshot. It follows every dial inside."}
          </figcaption>
        </figure>
      </header>

      <section className="land-stats">
        <p className="land-stats-lede">
          The market flipped. Generating software became easy; trusting it did
          not.
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
          Stack Overflow Developer Survey 2026, forty-nine thousand
          respondents; Cloud Security Alliance 2026.
        </p>
      </section>

      <section id="examination" className="land-now-what">
        <span className="section-label">The moment we own</span>
        <h2>I built it. Now what?</h2>
        <p>
          Every builder ends at the same cliff: a working-looking app and no
          idea whether it holds. That moment is Osyle's front door. Output
          from any of these walks in and becomes a resident.
        </p>
        <div className="land-works" style={{ padding: "18px 0 0" }}>
          {WORKS_WITH.map((w) => (
            <span key={w.name} className="works-mark" title={w.does}>
              {w.name}
            </span>
          ))}
        </div>
        <button className="pill pill-dark" style={{ marginTop: 18 }} onClick={() => go("place")}>
          Drop your app
          <Sparkle size={13} />
        </button>
      </section>

      <section id="address" className="land-loop">
        <span className="section-label">The loop</span>
        <h2>Import. Examine. Heal. Run.</h2>
        <div className="land-loop-row">
          {LOOP.map((step) => (
            <div key={step.n} className="land-loop-step card card-pad">
              <span className="land-loop-n">{step.n}</span>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </div>
          ))}
        </div>
        <div className="land-lens-grid" style={{ marginTop: 22, justifyContent: "center" }}>
          {LENSES.map((l) => (
            <span key={l} className="land-lens">
              {l}
            </span>
          ))}
        </div>
      </section>

      <section id="life" className="land-problems">
        <span className="section-label">The three unsolved problems</span>
        <h2>Everyone generates. Nobody holds the seam.</h2>
        <div className="land-laws-row">
          {PROBLEMS.map((p) => (
            <div key={p.title} className="land-problem card card-pad">
              <span className="land-problem-n">{p.n}</span>
              <h3>{p.title}</h3>
              <p>{p.pain}</p>
              <p className="land-answer">{p.answer}</p>
            </div>
          ))}
        </div>
        <p className="land-makers">
          Designers and agencies run their clients' residents here; every
          shipped app becomes a lasting relationship, not a handoff.
        </p>
      </section>

      <section id="laws" className="land-laws">
        <span className="section-label">The laws we keep</span>
        <h2>Honesty is the interface.</h2>
        <div className="land-laws-row">
          {LAWS.map((law) => (
            <div key={law.title} className="land-law">
              <h3>{law.title}</h3>
              <p>{law.body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="land-close">
        <h2>A billion apps are about to be generated. None of them have a home.</h2>
        <p className="land-close-sub">Yours can, today.</p>
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
