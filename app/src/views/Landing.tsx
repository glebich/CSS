import { useEffect, useRef, useState } from "react";
import { useStore } from "../store";
import { MiniApp } from "../components/MiniApp";
import { Sparkle, Wordmark } from "../components/chrome";
import { stackHere, stackIsNamedByBuild } from "../stack";

/** Nominative marks only: we integrate with these, nothing implied.
    A mark with a logo wears it; one without wears its name until its
    logo arrives, and never a placeholder pretending to be a logo. */
const WORKS_WITH: Array<{ name: string; does: string; logo?: string }> = [
  {
    name: "GitHub",
    does: "Connect a repository and Osyle reads the app from it",
    logo: "https://upload.wikimedia.org/wikipedia/commons/5/54/GitHub_Logo.png",
  },
  {
    name: "Lovable",
    does: "Lovable output imports as files, a zip, or a repo",
    logo: "https://i.logos-download.com/114333/31864-bcf98d2366aebe43b78dae62f0b34cb3.png/Lovable_Logo_2025.png",
  },
  {
    name: "Cursor",
    does: "Cursor projects import as files, a zip, or a repo",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/42/Cursor_logo.svg/3840px-Cursor_logo.svg.png",
  },
  {
    name: "Claude",
    does: "Your Claude key powers live Studio edits with Real Mode",
    logo: "https://i.logos-download.com/114232/31116-s1280-fa091cbf2b0bebc0fad188b896376d53.png/Claude_Logo_2023-s1280.png",
  },
  {
    name: "OpenAI",
    does: "Code built with ChatGPT imports as files, a zip, or a repo",
    logo: "https://1000logos.net/wp-content/uploads/2024/07/OpenAI-Logo-2022.png",
  },
  {
    name: "Bolt",
    does: "Bolt projects import as files, a zip, or a repo",
    logo: "https://vectorseek.com/wp-content/uploads/2025/07/bolt-ai-logo-01.png",
  },
  {
    name: "Replit",
    does: "Replit projects import as files, a zip, or a repo",
    logo: "https://replit-creators.replit.app/logos/Logotype-Transparent-Light@512h.png",
  },
  {
    name: "Figma",
    does: "Figma exports arrive as materials for the identity",
    logo: "https://1000logos.net/wp-content/uploads/2024/09/Figma-Logo.png",
  },
];

/**
 * The page arrives rather than appearing. Anything wearing `rise`
 * waits just below where it belongs and settles into place as it comes
 * into view, once, on the same curve the rest of the product moves on.
 * A person who asked for less motion gets none: everything is simply
 * already there.
 */
function useRise(): void {
  useEffect(() => {
    const marked = [...document.querySelectorAll<HTMLElement>(".rise")];
    if (marked.length === 0) return;
    const settle = (el: HTMLElement) => el.classList.add("is-in");
    const still =
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ||
      typeof IntersectionObserver === "undefined";
    if (still) {
      marked.forEach(settle);
      return;
    }
    const seen = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          settle(e.target as HTMLElement);
          seen.unobserve(e.target);
        });
      },
      /* a little before the fold, so nothing animates under the thumb */
      { rootMargin: "0px 0px -8% 0px", threshold: 0.06 },
    );
    marked.forEach((el) => seen.observe(el));
    return () => seen.disconnect();
  }, []);
}

/** One mark: the logo when there is one and it loads, the name when
    there is not, and the name again if the logo refuses to arrive. */
function WorksMark({ name, does, logo }: { name: string; does: string; logo?: string }) {
  const [shown, setShown] = useState(!!logo);
  return (
    /* the mark is found by its name whether it wears a logo or the
       word, so nothing downstream depends on which one showed */
    <span className="works-mark" data-mark={name} title={does}>
      {shown && logo ? (
        <img
          className="works-logo"
          src={logo}
          alt={name}
          loading="lazy"
          onError={() => setShown(false)}
        />
      ) : (
        name
      )}
    </span>
  );
}

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

/**
 * The loop drawn as a loop: the four stages stand around a ring built
 * from the same ticks as the Vitality instrument, and the ring lights
 * up to the stage in hand. Standing still is a straight row of cards;
 * this says the thing the word means, that Run feeds Examine.
 */
function LoopRing() {
  const [at, setAt] = useState(0);
  const [held, setHeld] = useState(false);
  const seats = ["at-12", "at-3", "at-6", "at-9"];

  /* the ring walks itself so the whole loop is seen without a click,
     and stands still the moment a person takes it over */
  useEffect(() => {
    if (held) return;
    const t = window.setInterval(() => setAt((n) => (n + 1) % LOOP.length), 4200);
    return () => window.clearInterval(t);
  }, [held]);

  const ticks = 48;
  const lit = Math.round(((at + 1) / LOOP.length) * ticks);

  return (
    <div
      className="loop-ring"
      onMouseEnter={() => setHeld(true)}
      onMouseLeave={() => setHeld(false)}
    >
      <svg className="loop-dial" viewBox="0 0 200 200" aria-hidden>
        <circle cx="100" cy="100" r="78" fill="none" stroke="var(--hairline)" strokeWidth="1" />
        {Array.from({ length: ticks }, (_, i) => {
          const a = (i / ticks) * Math.PI * 2 - Math.PI / 2;
          const on = i < lit;
          /* the same two-radius mark the Vitality instrument wears */
          return (
            <g key={i}>
              <line
                x1={100 + Math.cos(a) * 72}
                y1={100 + Math.sin(a) * 72}
                x2={100 + Math.cos(a) * 84}
                y2={100 + Math.sin(a) * 84}
                stroke="rgba(12, 12, 14, 0.06)"
                strokeWidth="0.7"
              />
              <circle
                cx={100 + Math.cos(a) * 78}
                cy={100 + Math.sin(a) * 78}
                r={on ? 1.7 : 1.2}
                fill={on ? "var(--pulse)" : "rgba(12, 12, 14, 0.12)"}
              />
            </g>
          );
        })}
        {/* a knot where each stage stands, so the seats belong to the ring */}
        {[
          [100, 22],
          [178, 100],
          [100, 178],
          [22, 100],
        ].map(([cx, cy], i) => (
          <circle
            key={`knot-${cx}-${cy}`}
            cx={cx}
            cy={cy}
            r={i === at ? 4.6 : 3}
            fill={i === at ? "var(--pulse)" : "var(--paper)"}
            stroke={i === at ? "var(--pulse)" : "rgba(12, 12, 14, 0.22)"}
            strokeWidth="1.2"
          />
        ))}
      </svg>

      {LOOP.map((step, i) => (
        <button
          key={step.n}
          className={`loop-seat ${seats[i]}${i === at ? " is-here" : ""}`}
          /* the phone rail drops the ring and reads the sentence here */
          data-body={step.body}
          onMouseEnter={() => setAt(i)}
          onFocus={() => {
            setHeld(true);
            setAt(i);
          }}
          onBlur={() => setHeld(false)}
          onClick={() => setAt(i)}
        >
          <span className="loop-seat-n">{step.n}</span>
          <span className="loop-seat-title">{step.title}</span>
        </button>
      ))}

      <div className="loop-core" key={at}>
        <span className="instrument-label">Stage {LOOP[at].n} of four</span>
        <h3>{LOOP[at].title}</h3>
        <p>{LOOP[at].body}</p>
      </div>
    </div>
  );
}

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
/** One cell of the credential wall: the mark if it loads, the name if not. */
function LogoCell({ name, src }: { name: string; src: string }) {
  const [broken, setBroken] = useState(false);
  return (
    <span
      className="land-mark"
      title="Named for the design career behind the taste system, nothing implied beyond it"
    >
      {broken ? (
        name
      ) : (
        <img
          className="land-mark-img"
          src={src}
          alt={name}
          loading="lazy"
          onError={() => setBroken(true)}
        />
      )}
    </span>
  );
}

/**
 * The word on the door. Dropping a real app leads into work that is
 * still being built, and a visitor who walks in meets it half made, so
 * that path asks for a word first. The example stays open to everyone.
 *
 * This is a doorbell, not a lock: the word ships inside the bundle and
 * anyone determined can read it. It keeps a passer-by out of unfinished
 * rooms, which is all it is for.
 */
const GATE_WORD = (import.meta.env.VITE_OSYLE_GATE ?? "milkinside").toLowerCase();
const GATE_KEY = "osyle.gate";

function gateIsOpen(): boolean {
  try {
    return localStorage.getItem(GATE_KEY) === GATE_WORD;
  } catch {
    return false;
  }
}

export function Landing() {
  useRise();
  const { go, resetDemo } = useStore();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [gateAsking, setGateAsking] = useState(false);
  const [gateWord, setGateWord] = useState("");
  const [gateWrong, setGateWrong] = useState(false);

  /* the example walks straight in; a real drop knocks first */
  const enterProduct = () => {
    if (gateIsOpen()) {
      go("place");
      return;
    }
    setGateWord("");
    setGateWrong(false);
    setGateAsking(true);
  };
  const tryTheWord = () => {
    if (gateWord.trim().toLowerCase() !== GATE_WORD) {
      setGateWrong(true);
      return;
    }
    try {
      localStorage.setItem(GATE_KEY, GATE_WORD);
    } catch {
      /* the door still opens for this visit */
    }
    setGateAsking(false);
    go("place");
  };
  const [realMode, setRealMode] = useState(() => stackHere().on);
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
          <button className="pill pill-dark pill-sm" onClick={enterProduct}>
            Drop your app
          </button>
        </div>
      </nav>

      <header className="land-hero">
        <div className="land-hero-copy">
          <span className="section-label rise-load">The last mile for generated apps</span>
          <h1 className="rise-load rise-1">You built it with AI. We make it ready for the world.</h1>
          <p className="rise-load rise-2">
            Osyle is the last mile between a vibe-coded app and a
            professional product. Drop what you built, from any tool; it
            gets examined across eight real lenses, healed with receipts,
            dressed by a taste system built on twenty-five years of product
            design, and given an address where it keeps living.
          </p>
          <div className="land-hero-ctas rise-load rise-3">
            <button className="pill pill-dark" onClick={enterProduct}>
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
          <div className="phone-frame land-phone rise-load rise-2">
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

      {/* the credential band runs the full width of the hero above it;
          each cell tries the real mark and falls back to the name */}
      <section className="land-marks">
        <p className="land-marks-lede">
          <strong>Design led by 25 years building products</strong> for the
          companies whose work set the bar.
        </p>
        <div className="land-marks-row rise rise-2">
          {[
            { n: "Apple", src: "https://1000logos.net/wp-content/uploads/2016/10/Apple-Logo.png" },
            { n: "Google", src: "https://cdn.freebiesupply.com/images/large/2x/google-logo-black-transparent.png" },
            { n: "OpenAI", src: "https://1000logos.net/wp-content/uploads/2024/07/OpenAI-Logo-2022.png" },
            { n: "Samsung", src: "https://logos-world.net/wp-content/uploads/2020/06/Samsung-Logo.png" },
          ].map((m) => (
            <LogoCell key={m.n} name={m.n} src={m.src} />
          ))}
        </div>
      </section>

      <section className="land-stats">
        <p className="land-stats-lede">
          The market flipped. Generating software became easy; trusting it did
          not.
        </p>
        <div className="land-stats-row rise rise-1">
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
        <span className="section-label rise">The moment we own</span>
        <h2 className="rise rise-1">I built it. Now what?</h2>
        <p>
          Every builder ends at the same cliff: a working-looking app and no
          idea whether it holds. That moment is Osyle's front door. Output
          from any of these walks in and becomes a resident.
        </p>
        <div className="land-works rise rise-2" style={{ padding: "18px 0 0" }}>
          {WORKS_WITH.map((w) => (
            <WorksMark key={w.name} name={w.name} does={w.does} logo={w.logo} />
          ))}
        </div>
        <button className="pill pill-dark" style={{ marginTop: 18 }} onClick={enterProduct}>
          Drop your app
          <Sparkle size={13} />
        </button>
      </section>

      <section id="address" className="land-loop">
        {/* the words hold one side, the loop turns on the other */}
        <div className="loop-grid rise rise-2">
          <div className="loop-say">
            <span className="section-label rise">The loop</span>
            <h2 className="rise rise-1">Import. Examine. Heal. Run.</h2>
            <p className="land-loop-lede">
              It does not end at Run. What the app does in the world becomes
              the next examination, which is why this is a loop and not a
              launch.
            </p>
            <div className="section-label rise" style={{ marginTop: 26 }}>
              The eight lenses
            </div>
            <div className="land-lens-grid">
              {LENSES.map((l) => (
                <span key={l} className="land-lens">
                  {l}
                </span>
              ))}
            </div>
          </div>
          <LoopRing />
        </div>
      </section>

      <section id="life" className="land-problems">
        <span className="section-label rise">The three unsolved problems</span>
        <h2 className="rise rise-1">Everyone generates. Nobody holds the seam.</h2>
        {/* the seam itself: what the industry leaves open on one side,
            what Osyle holds on the other, one line running through */}
        <div className="seam rise rise-2">
          {PROBLEMS.map((p) => (
            <div key={p.title} className="seam-row">
              <div className="seam-open">
                <span className="seam-n">{p.n}</span>
                <h3>{p.title}</h3>
                <p>{p.pain}</p>
              </div>
              <span className="seam-knot" aria-hidden />
              <div className="seam-held">
                <span className="seam-label">Held here</span>
                <p>{p.answer}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="land-makers">
          Designers and agencies run their clients' residents here; every
          shipped app becomes a lasting relationship, not a handoff.
        </p>
      </section>

      <section id="laws" className="land-laws">
        <span className="section-label rise">The laws we keep</span>
        <h2 className="rise rise-1">Honesty is the interface.</h2>
        <div className="land-laws-row rise rise-2">
          {LAWS.map((law) => (
            <div key={law.title} className="land-law">
              <h3>{law.title}</h3>
              <p>{law.body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="land-close">
        <h2 className="rise rise-1">A billion apps are about to be generated. None of them have a home.</h2>
        <p className="land-close-sub">Yours can, today.</p>
        <div className="brand-promises">Safe. Designed. Usable. Tested. Evolving. Shared.</div>
        <button className="brand-enter" onClick={enterProduct}>
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

      {gateAsking && (
        <>
          <div className="resident-backdrop" onClick={() => setGateAsking(false)} />
          <div className="glass-panel fade-in land-gate" role="dialog" aria-label="The word on the door">
            <div className="panel-title" style={{ fontSize: 18 }}>
              This part is still being built
            </div>
            <p style={{ fontSize: 12.5, color: "var(--gray-small)", marginTop: 8, lineHeight: 1.55 }}>
              Dropping a real app walks into rooms that are half made. The
              example below is finished and open to everyone. If you have the
              word, go through.
            </p>
            <div className="ask-pill" style={{ minWidth: 0, height: 44, marginTop: 16 }}>
              <input
                type="password"
                placeholder="The word"
                aria-label="The word on the door"
                value={gateWord}
                autoFocus
                onChange={(e) => {
                  setGateWord(e.target.value);
                  setGateWrong(false);
                }}
                onKeyDown={(e) => e.key === "Enter" && tryTheWord()}
              />
            </div>
            {gateWrong && (
              <p style={{ fontSize: 12, color: "var(--gray-small)", marginTop: 8 }}>
                Not that word.
              </p>
            )}
            <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
              <button className="pill pill-dark pill-sm" onClick={tryTheWord}>
                Go through
              </button>
              <button
                className="pill pill-sm"
                onClick={() => {
                  setGateAsking(false);
                  go("place");
                }}
              >
                Watch the example instead
              </button>
            </div>
          </div>
        </>
      )}

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
            {stackIsNamedByBuild()
              ? "This build knows a stack and speaks to it. Switch it off to watch the app work with no server at all."
              : "This build names no stack, so the switch looks for one on this machine at port 8787. Demo Mode never dies in a room."}
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
