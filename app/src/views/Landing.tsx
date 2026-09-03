import { useEffect, useRef, useState } from "react";
import { useStore } from "../store";
import { Sparkle } from "../components/chrome";

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

/** The six promises, each with the part of the product that keeps it. */
const PROMISES: Array<{ word: string; line: string }> = [
  { word: "Safe", line: "Every drop is examined before it is shown. Findings arrive with what to do about them." },
  { word: "Designed", line: "The identity is extracted, not invented. Style explores, then the reveal." },
  { word: "Usable", line: "Ten lenses read the app the way a person would, and say what they saw." },
  { word: "Tested", line: "A report card with real numbers, one per lens, nothing hidden." },
  { word: "Evolving", line: "The monitor watches vitality over time. Every issue gets an address." },
  { word: "Shared", line: "Every resident gets a door. Promote it, find its audience, be discovered." },
];

/**
 * The hero image. The Figma frame (Blue UI Design, node 2292:6611, the
 * Pixel 10 Pro XL render) is rebuilt below in markup so the page never
 * depends on a download. To use the exported PNG instead, drop it at
 * public/brand/hero-phone.png and set this to "brand/hero-phone.png"
 * (relative, so it resolves under any base path the build serves at).
 */
const HERO_IMAGE: string | null = null;

function validKey(kind: "anthropic" | "gemini", value: string): boolean | null {
  if (!value) return null;
  return kind === "anthropic" ? /^sk-ant-/.test(value) : /^AIza/.test(value);
}

/**
 * Scroll-linked progress for the hero transition. The dark frame opens
 * edge to edge, and as the page scrolls it settles into a rounded card
 * inset on the light paper. Progress lives in a CSS custom property so
 * the whole transition is declarative and never touches layout twice.
 */
function useHeroProgress(scroller: React.RefObject<HTMLDivElement>) {
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      el.style.setProperty("--p", "1");
      return;
    }
    let frame = 0;
    const update = () => {
      frame = 0;
      const distance = Math.max(240, window.innerHeight * 0.6);
      const p = Math.min(1, Math.max(0, el.scrollTop / distance));
      el.style.setProperty("--p", p.toFixed(4));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    el.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      el.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [scroller]);
}

/** The phone from the Figma frame: obsidian body, the lock screen at 08:45. */
function HeroPhone() {
  if (HERO_IMAGE) {
    return (
      <img
        className="lp-phone-image"
        src={HERO_IMAGE}
        alt="A phone showing the app's lock screen: a ride two minutes away, a message waiting for approval"
      />
    );
  }
  return (
    <div className="lp-phone" role="img" aria-label="A phone showing an app's lock screen: a ride two minutes away, a message waiting for approval">
      <div className="lp-phone-screen">
        <div className="lp-phone-camera" />
        <div className="lp-phone-date">Tue, Aug 18 <span className="lp-phone-temp">31°</span></div>
        <div className="lp-phone-clock">08:45</div>
        <div className="lp-phone-hey">Hey Omar</div>
        <p className="lp-phone-lines">
          Your ride arrives in two minutes.
          <br />
          You have three tasks due today, and
          <br />
          Meenz is waiting for your approval.
        </p>
        <div className="lp-phone-card lp-phone-ride">
          <div className="lp-phone-map" aria-hidden />
          <div className="lp-phone-card-title">Your ride is 2 min away</div>
          <div className="lp-phone-card-sub">Arriving at 11:42 AM</div>
          <div className="lp-phone-plate">
            <span className="lp-phone-plate-dot" />
            <span>CA YZ918XR</span>
          </div>
        </div>
        <div className="lp-phone-row">
          <div className="lp-phone-card lp-phone-people" aria-hidden>
            <span className="lp-phone-face f1" />
            <span className="lp-phone-face f2" />
            <span className="lp-phone-face f3" />
            <span className="lp-phone-face f4" />
          </div>
          <div className="lp-phone-card lp-phone-chat">
            <div className="lp-phone-chat-head">
              <span className="lp-phone-chat-bubble" aria-hidden />
            </div>
            <div className="lp-phone-card-title">
              Meenz <span className="lp-phone-chat-when">1 m</span>
            </div>
            <div className="lp-phone-card-sub">Can you transfer $4.99 to Hala?</div>
            <div className="lp-phone-pay">$4.99</div>
          </div>
        </div>
        <div className="lp-phone-dots" aria-hidden>
          <span className="on" />
          <span />
        </div>
        <div className="lp-phone-dock" aria-hidden>
          <span className="lp-phone-app a1">31</span>
          <span className="lp-phone-app a2" />
          <span className="lp-phone-app a3" />
          <span className="lp-phone-dock-gap" />
          <span className="lp-phone-pill" />
          <span className="lp-phone-pill" />
        </div>
      </div>
    </div>
  );
}

/**
 * The brand surface, with the demo's hidden controls per the spec:
 * R three times resets to pristine in under a second; period opens the
 * settings sheet with the Real Mode toggle and the BYO key fields.
 */
export function Landing() {
  const { go, resetDemo } = useStore();
  const scroller = useRef<HTMLDivElement>(null);
  useHeroProgress(scroller);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [realMode, setRealMode] = useState(
    () => {
      try {
        return localStorage.getItem("osyle.realMode") === "true";
      } catch {
        return false;
      }
    },
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
    <div className="lp" ref={scroller}>
      <header className="lp-nav">
        <div className="lp-wordmark">OSYLE</div>
        <nav className="lp-nav-links">
          <a href="#/discover">Discover</a>
          <a href="#/owner">Owner</a>
        </nav>
        <button className="lp-cta lp-cta-sm" onClick={() => go("place")}>
          Drop your app
        </button>
      </header>

      {/* The stage: the frame is pinned while the page scrolls the first
          sixty percent of a viewport, and the transition plays on --p. */}
      <div className="lp-stage">
        <section className="lp-hero">
          <div className="lp-frame">
            <div className="lp-frame-glow" aria-hidden />
            <div className="lp-frame-horizon" aria-hidden />
            <div className="lp-hero-copy">
              <span className="lp-eyebrow">Where generated software lives</span>
              <h1 className="lp-headline">
                Drop your app.
                <br />
                See everything
                <br />
                <span className="lp-headline-quiet">it could be.</span>
              </h1>
              <p className="lp-lede">
                Osyle reads the app you generated, shows what it could become,
                and gives it an address where it keeps evolving. Free.
              </p>
              <button className="lp-cta" onClick={() => go("place")}>
                <Sparkle size={13} />
                Drop your app
              </button>
            </div>
            <div className="lp-hero-visual">
              <HeroPhone />
            </div>
            <dl className="lp-stats">
              <div className="lp-stat">
                <dt>10</dt>
                <dd>lenses read every app</dd>
                <span className="lp-stat-more">design, safety, usability and seven more</span>
              </div>
              <div className="lp-stat">
                <dt>8</dt>
                <dd>tools it works with</dd>
                <span className="lp-stat-more">GitHub, Lovable, Cursor and five more</span>
              </div>
              <div className="lp-stat">
                <dt>$0</dt>
                <dd>to drop an app</dd>
                <span className="lp-stat-more">free, your own keys optional</span>
              </div>
            </dl>
          </div>
        </section>
      </div>

      <section className="lp-section lp-intro">
        <p className="lp-two-tone">
          Generated software deserves a place to live.{" "}
          <span className="quiet">
            Osyle takes what Lovable, Cursor, v0 or Bolt made, examines it
            through ten lenses, dresses it in an identity that is truly its
            own, and moves it in at an address of its own.
          </span>
        </p>
        <span className="lp-side-label">What Osyle is</span>
      </section>

      <section className="lp-section lp-promise-section">
        <div className="lp-promise-head">
          <h2 className="lp-h2">
            Six
            <br />
            promises
          </h2>
          <div>
            <p className="lp-two-tone lp-two-tone-sm">
              We keep the app honest by{" "}
              <span className="quiet">showing what it is and what it can become.</span>
            </p>
            <div className="brand-promises">
              Safe. Designed. Usable. Tested. Evolving. Shared.
            </div>
          </div>
        </div>
        <ol className="lp-promise-list">
          {PROMISES.map((p, i) => (
            <li key={p.word} className={`lp-promise${i === 1 ? " is-raised" : ""}`}>
              <span className="lp-promise-num">{String(i + 1).padStart(2, "0")}</span>
              <div className="lp-promise-body">
                <span className="lp-promise-word">{p.word}</span>
                <span className="lp-promise-line">{p.line}</span>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="lp-section lp-works">
        {/* the rail: worn openly, monochrome, nominative, every mark
            saying exactly what its integration does */}
        <div className="brand-works">
          <span className="works-label">Works with</span>
          {WORKS_WITH.map((w) => (
            <span key={w.name} className="works-mark" title={w.does}>
              {w.name}
            </span>
          ))}
        </div>
      </section>

      <footer className="lp-foot">
        <h2 className="lp-foot-statement">
          Where generated
          <br />
          software <span className="lp-headline-quiet">lives.</span>
        </h2>
        <div className="lp-foot-actions">
          <button className="lp-cta" onClick={() => go("place")}>
            <Sparkle size={13} />
            Drop your app
          </button>
          <a href="#/discover" className="lp-foot-link">
            See who lives here
          </a>
        </div>
        <div className="brand-foot lp-foot-line">
          Osyle. Press period for demo settings, R three times to reset.
        </div>
      </footer>

      {sheetOpen && (
        <div
          className="glass-panel fade-in"
          style={{
            position: "fixed",
            right: 24,
            top: 88,
            width: 320,
            padding: 22,
            color: "var(--ink-body)",
            textAlign: "left",
            zIndex: 60,
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
