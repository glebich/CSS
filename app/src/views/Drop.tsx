import { useStore } from "../store";
import { Sparkle } from "../components/chrome";

/**
 * The drop state, matched to the Figma statement frames: the two-tone
 * statement with a Thin quiet word, type pills floating at 70px on the
 * dotted canvas, the selected one carrying the gradient, one outlined.
 */
const PILLS: Array<{
  label: string;
  variant?: "selected" | "outline";
  style: React.CSSProperties;
}> = [
  { label: "GitHub", variant: "selected", style: { left: "3%", top: "44%" } },
  { label: "Lovable", style: { left: "10%", top: "28%" } },
  { label: "Cursor", style: { left: "18%", top: "60%" } },
  { label: "Zip", style: { left: "9%", top: "76%" } },
  { label: "Live URL", style: { right: "16%", top: "26%" } },
  { label: "Figma Design", variant: "selected", style: { right: "3%", top: "44%" } },
  { label: "v0", style: { right: "20%", top: "60%" } },
  { label: "Anything", variant: "outline", style: { right: "7%", top: "74%" } },
];

export function Drop() {
  const { go } = useStore();
  return (
    <main className="canvas canvas-dotted" style={{ position: "relative" }}>
      {PILLS.map((p) => (
        <span
          key={p.label}
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
          gap: 40,
          paddingBottom: 60,
        }}
      >
        <h1 className="statement statement-center">
          Drop
          <br />
          your app
          <br />
          <span className="quiet">here</span>
        </h1>
        <button className="pill pill-dark" onClick={() => go("home")}>
          Import SkyRecall, the demo resident
          <Sparkle size={14} />
        </button>
      </div>
    </main>
  );
}
