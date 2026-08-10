import { useStore } from "../store";
import { Icon, Sparkle } from "../components/chrome";

/**
 * The place state, matched to the Osyle_N frame: the statement with its
 * Thin last word, type pills floating around it, and the quiet bottom
 * row of a plus circle, the interested-links input, and one dark action.
 */
const PILLS: Array<{
  label: string;
  variant?: "selected" | "outline";
  style: React.CSSProperties;
}> = [
  { label: "Audio", variant: "outline", style: { left: "10%", top: "26%" } },
  { label: "Brandbook", variant: "selected", style: { left: "2%", top: "44%" } },
  { label: "Video", style: { left: "12%", top: "62%" } },
  { label: "Prototype", style: { left: "31%", top: "26%" } },
  { label: "Links", style: { left: "26%", top: "48%" } },
  { label: "Wireframe", style: { left: "27%", top: "62%" } },
  { label: "Figma Design", variant: "selected", style: { right: "27%", top: "26%" } },
  { label: "Brief", style: { right: "29%", top: "48%" } },
  { label: "Audio", style: { right: "13%", top: "48%" } },
  { label: "Anything", variant: "outline", style: { right: "24%", top: "63%" } },
  { label: "Figma Design", variant: "selected", style: { right: "3%", top: "63%" } },
];

export function Place() {
  const { beginUpload } = useStore();
  return (
    <main className="canvas" style={{ position: "relative", overflow: "hidden" }}>
      {PILLS.map((p, i) => (
        <span
          key={`${p.label}-${i}`}
          className={`type-pill${p.variant === "selected" ? " is-selected" : ""}${p.variant === "outline" ? " is-outline" : ""}`}
          style={{ position: "absolute", ...p.style }}
        >
          {p.label}
        </span>
      ))}
      <div
        style={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          zIndex: 1,
          pointerEvents: "none",
        }}
      >
        <h1 className="statement statement-center">
          Place
          <br />
          something
          <br />
          <span className="quiet">here</span>
        </h1>
      </div>
      <div
        style={{
          position: "absolute",
          bottom: 22,
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          alignItems: "center",
          gap: 10,
          zIndex: 2,
        }}
      >
        <span className="circle" style={{ width: 48, height: 48 }} aria-hidden>
          <Icon name="plus" size={18} />
        </span>
        <div className="ask-pill" style={{ minWidth: 340 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden>
            <path d="M12 21a9 9 0 1 0-9-9c0 1.8.5 3.4 1.4 4.8L3 21l4.4-1.2A9 9 0 0 0 12 21Z" />
          </svg>
          <input placeholder="type interested links" readOnly />
        </div>
        <button className="pill pill-dark" onClick={beginUpload}>
          Drop the SkyRecall materials
          <Sparkle size={13} />
        </button>
      </div>
    </main>
  );
}
