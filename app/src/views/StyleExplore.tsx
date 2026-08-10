import { useState } from "react";
import { useStore } from "../store";
import { FlowSteps, Icon, Sparkle } from "../components/chrome";
import { styleCatalog, styleCategories, type StyleCard } from "../data/seed";

/** A miniature interface drawn in the style's own materials. */
function StyleThumb({ s }: { s: StyleCard }) {
  const soft = s.dark ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.7)";
  return (
    <div
      style={{
        background: s.swatch,
        color: s.ink,
        height: s.tall ? 236 : 168,
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
        <span style={{ width: 16, height: 16, borderRadius: 5, background: s.accent }} />
        <span style={{ fontSize: 11, fontWeight: 650, opacity: 0.85 }}>{s.name}</span>
      </div>
      <div style={{ background: soft, borderRadius: 10, flex: 1, padding: 10 }}>
        <div style={{ width: "62%", height: 7, borderRadius: 4, background: s.ink, opacity: 0.75 }} />
        <div style={{ width: "40%", height: 5, borderRadius: 3, background: s.ink, opacity: 0.3, marginTop: 6 }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 9.5, opacity: 0.55 }}>by {s.by}</span>
        <span
          style={{
            padding: "4px 10px",
            borderRadius: 999,
            background: s.accent,
            color: s.dark ? "#0c0c0e" : "#fff",
            fontSize: 9,
            fontWeight: 700,
          }}
        >
          CTA
        </span>
      </div>
    </div>
  );
}

/**
 * Explore a style: the glass search bar with its filter tokens, the
 * category band whose hover shows the style itself, the statement,
 * and the gallery. Add is the only verb.
 */
export function StyleExplore() {
  const { styleId, setStyleId, go, applyFeeling, feelingCaption } = useStore();
  const [category, setCategory] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [feeling, setFeeling] = useState("");

  const shown = styleCatalog.filter(
    (s) =>
      (!category || s.category === category) &&
      (!query || s.name.toLowerCase().includes(query.toLowerCase())),
  );
  const chosen = styleCatalog.find((s) => s.id === styleId);

  return (
    <main className="canvas" style={{ position: "relative" }}>
      <FlowSteps current="style" top={88} />
      <div className="explore-bar">
        <button className="circle" style={{ width: 48, height: 48 }} onClick={() => go("assets")} aria-label="Back">
          <Icon name="back" size={18} />
        </button>
        {category && (
          <span className="filter-token">
            {category}
            <span className="x" onClick={() => setCategory(null)} role="button" aria-label="Clear filter">
              <svg width="9" height="9" viewBox="0 0 8 8" fill="none" aria-hidden>
                <path d="M1 1l6 6M7 1L1 7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
            </span>
          </span>
        )}
        <input
          placeholder="What type of design are you interested in?"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <span className="explore-side">
          <span>Top designers</span>
          <span className="off">My own</span>
        </span>
        <span className="explore-dark-seg" aria-hidden>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "currentColor" }} />
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "currentColor", opacity: 0.5 }} />
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "currentColor", opacity: 0.5 }} />
        </span>
      </div>

      <div className="cat-band">
        {styleCategories.map((c) => (
          <button
            key={c}
            className={`cat${category === c ? " is-active" : ""}`}
            onClick={() => setCategory(category === c ? null : c)}
          >
            {c}
          </button>
        ))}
      </div>

      <div style={{ textAlign: "center", padding: "12px 0 24px" }}>
        <h1 className="statement" style={{ fontSize: "clamp(56px, 6.5vw, 96px)" }}>
          Explore a style
        </h1>
        <p className="statement-sub">Curated by the world&apos;s top designers</p>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          flexWrap: "wrap",
          padding: "0 16px 30px",
        }}
      >
        <span style={{ fontSize: 13.5, color: "var(--gray-small)" }}>Or say the feeling</span>
        {["Calm", "Minimal", "Bold"].map((chip) => (
          <button key={chip} className="pill pill-sm" onClick={() => applyFeeling(chip)}>
            {chip}
          </button>
        ))}
        <div className="ask-pill" style={{ minWidth: 260, height: 44 }}>
          <input
            placeholder="e.g. make it grandma friendly"
            value={feeling}
            onChange={(e) => setFeeling(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && feeling.trim()) {
                applyFeeling(feeling.trim());
                setFeeling("");
              }
            }}
          />
        </div>
        {feelingCaption && (
          <span className="chip fade-in" key={feelingCaption}>
            {feelingCaption}
          </span>
        )}
      </div>

      <div className="style-grid">
        {shown.map((s) => (
          <div key={s.id} className="style-tile" onClick={() => setStyleId(s.id)}>
            <StyleThumb s={s} />
            {styleId === s.id ? (
              <span className="picked">
                <Sparkle size={10} />
                Yours
              </span>
            ) : (
              <span className="add">Add</span>
            )}
          </div>
        ))}
      </div>

      <div
        style={{
          position: "fixed",
          bottom: 22,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 26,
        }}
      >
        <button className="pill pill-dark" onClick={() => go("launch")}>
          Continue with {chosen ? chosen.name : "your style"}
          <Sparkle size={13} />
        </button>
      </div>
    </main>
  );
}
