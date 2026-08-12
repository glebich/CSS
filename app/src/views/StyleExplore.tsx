import { useState } from "react";
import { useStore } from "../store";
import { Icon, Sparkle } from "../components/chrome";
import { styleCatalog, styleCategories, tasteSources, type StyleCard } from "../data/seed";

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
          Continue
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
  const [sort, setSort] = useState<"curated" | "name" | "designer">("curated");
  const [tasteId, setTasteId] = useState<string | null>(null);
  const taste = tasteId ? (tasteSources.find((t) => t.id === tasteId) ?? null) : null;

  const q = query.trim().toLowerCase();
  const shown = styleCatalog
    .filter(
      (s) =>
        (!category || s.category === category) &&
        (!q ||
          s.name.toLowerCase().includes(q) ||
          s.by.toLowerCase().includes(q) ||
          s.category.toLowerCase().includes(q)),
    )
    .sort((a, b) =>
      sort === "name"
        ? a.name.localeCompare(b.name)
        : sort === "designer"
          ? a.by.localeCompare(b.by)
          : 0,
    );
  const chosen = styleCatalog.find((s) => s.id === styleId);

  return (
    <main className="canvas" style={{ position: "relative" }}>
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
        {/* one field does everything: typing filters the gallery live,
            Enter asks the feeling road in plain words */}
        <input
          placeholder="e.g. make it grandma friendly"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && query.trim()) {
              applyFeeling(query.trim());
              setQuery("");
            }
          }}
        />
        {feelingCaption && (
          <span className="chip fade-in" key={feelingCaption}>
            {feelingCaption}
          </span>
        )}
      </div>

      <div style={{ textAlign: "center", padding: "56px 0 18px" }}>
        <h1 className="statement" style={{ fontSize: "clamp(56px, 6.5vw, 96px)" }}>
          Explore a style
        </h1>
        <p className="statement-sub">Curated by the world&apos;s top designers</p>
      </div>

      {/* one calm row: sort on the left, categories in the middle, the
          three feelings on the right, nothing else */}
      <div className="explore-filters">
        <select
          className="sort-pill"
          value={sort}
          aria-label="Sort the styles"
          onChange={(e) => setSort(e.target.value as "curated" | "name" | "designer")}
        >
          <option value="curated">Curated</option>
          <option value="name">A to Z</option>
          <option value="designer">By designer</option>
        </select>
        <div className="cat-band" style={{ padding: 0 }}>
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
        <div style={{ display: "flex", gap: 8 }}>
          {["Calm", "Minimal", "Bold"].map((chip) => (
            <button key={chip} className="pill pill-sm" onClick={() => applyFeeling(chip)}>
              {chip}
            </button>
          ))}
        </div>
      </div>

      <div className="style-grid">
        {shown.map((s) => (
          <div key={s.id} className="style-tile" onClick={() => setStyleId(s.id)}>
            <StyleThumb s={s} />
            {styleId === s.id ? (
              <span className="picked" style={{ left: "auto", right: 12, top: "auto", bottom: 12 }}>
                <Sparkle size={10} />
                Yours
              </span>
            ) : (
              <span className="add">Select</span>
            )}
          </div>
        ))}
      </div>

      {/* Taste Transfer, lite: principles from admired work, never pixels */}
      <div style={{ maxWidth: 1240, margin: "10px auto 130px", padding: "0 60px" }}>
        <div className="section-label">Taste Transfer</div>
        <p style={{ fontSize: 13, color: "var(--gray-meta)", maxWidth: 620 }}>
          Name a product you admire and the system studies its principles,
          density, rhythm, tone, hierarchy, never its pixels. The demo
          studies three admired patterns; links arrive with Real Mode.
        </p>
        <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
          {tasteSources.map((t) => (
            <button
              key={t.id}
              className="pill pill-sm"
              style={tasteId === t.id ? { boxShadow: "inset 0 0 0 1.5px var(--ink-strong)" } : undefined}
              onClick={() => setTasteId(tasteId === t.id ? null : t.id)}
            >
              {t.name}
            </button>
          ))}
        </div>
        {taste && (
          <div className="card card-pad fade-in" style={{ marginTop: 14, maxWidth: 640 }}>
            <div style={{ display: "grid", gap: 5, fontSize: 13.5, color: "var(--ink-body)" }}>
              <span>Density: {taste.principles.density}</span>
              <span>Rhythm: {taste.principles.rhythm}</span>
              <span>Tone: {taste.principles.tone}</span>
              <span>Hierarchy: {taste.principles.hierarchy}</span>
            </div>
            <p style={{ fontSize: 12.5, color: "var(--gray-small)", marginTop: 10 }}>{taste.caption}</p>
            <button
              className="pill pill-sm"
              style={{ marginTop: 12 }}
              onClick={() => setStyleId(taste.variantStyleId)}
            >
              {styleId === taste.variantStyleId
                ? "Worn. The variant is yours"
                : `Wear the variant, ${styleCatalog.find((s) => s.id === taste.variantStyleId)?.name}`}
            </button>
          </div>
        )}
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
