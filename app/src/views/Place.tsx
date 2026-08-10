import { useRef, useState } from "react";
import { useStore } from "../store";
import { FlowSteps, Icon, Sparkle } from "../components/chrome";

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
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const depth = useRef(0);

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    depth.current = 0;
    setDragging(false);
    const name = e.dataTransfer.files?.[0]?.name;
    beginUpload(name);
  }

  return (
    <main
      className={`canvas${dragging ? " is-dragging" : ""}`}
      style={{ position: "relative", overflow: "hidden" }}
      onDragEnter={(e) => {
        e.preventDefault();
        depth.current += 1;
        setDragging(true);
      }}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={() => {
        depth.current -= 1;
        if (depth.current <= 0) setDragging(false);
      }}
      onDrop={onDrop}
    >
      <FlowSteps current="place" />
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
          {dragging ? (
            <>
              Let
              <br />
              <span className="quiet">go</span>
            </>
          ) : (
            <>
              Place
              <br />
              something
              <br />
              <span className="quiet">here</span>
            </>
          )}
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
        <input
          ref={fileRef}
          type="file"
          style={{ display: "none" }}
          onChange={(e) => beginUpload(e.target.files?.[0]?.name)}
        />
        <button
          className="circle"
          style={{ width: 48, height: 48 }}
          onClick={() => fileRef.current?.click()}
          aria-label="Choose a file"
        >
          <Icon name="plus" size={18} />
        </button>
        <div className="ask-pill" style={{ minWidth: 340 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden>
            <path d="M12 21a9 9 0 1 0-9-9c0 1.8.5 3.4 1.4 4.8L3 21l4.4-1.2A9 9 0 0 0 12 21Z" />
          </svg>
          <input placeholder="type interested links" readOnly />
        </div>
        <button className="pill pill-dark" onClick={() => beginUpload()}>
          Drop the SkyRecall materials
          <Sparkle size={13} />
        </button>
      </div>
    </main>
  );
}
