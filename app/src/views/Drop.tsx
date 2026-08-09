import { useStore } from "../store";
import { Sparkle } from "../components/chrome";

const GHOSTS = [
  { label: "GitHub repo", style: { left: "4%", top: "38%", width: 128, height: 128 } },
  { label: "Live URL", style: { left: "21%", top: "62%", width: 88, height: 88 } },
  { label: "Zip", style: { right: "22%", top: "18%", width: 90, height: 90 } },
  { label: "Figma file", style: { right: "5%", top: "44%", width: 138, height: 138 } },
  { label: "Screens", style: { left: "12%", top: "12%", width: 96, height: 96 } },
];

/** The drop state: dotted canvas, the statement, one dark action. */
export function Drop() {
  const { go } = useStore();
  return (
    <main className="canvas canvas-dotted" style={{ position: "relative" }}>
      {GHOSTS.map((g) => (
        <div
          key={g.label}
          className="ghost-card"
          style={{ position: "absolute", ...g.style }}
        >
          {g.label}
        </div>
      ))}
      <div
        style={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 28,
          paddingBottom: 80,
        }}
      >
        <h1 className="statement statement-center">
          Drop your app
          <br />
          <span className="quiet">here</span>
        </h1>
        <div className="chip-row">
          {["GitHub", "Lovable", "Zip", "Link", "Figma"].map((c) => (
            <span key={c} className="chip">
              {c}
            </span>
          ))}
        </div>
        <button className="pill pill-dark" onClick={() => go("home")}>
          Import SkyRecall, the demo resident
          <Sparkle size={13} />
        </button>
      </div>
    </main>
  );
}
