import { useRef, useState } from "react";
import { useStore } from "../store";
import { FlowSteps, Icon, Sparkle } from "../components/chrome";

/**
 * The place state: a real intake. Dropped files and zips are actually
 * parsed and measured by the engine; the example resident stands by,
 * clearly labeled, for anyone with nothing at hand.
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
  const { beginUpload, analyzeFiles } = useStore();
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const depth = useRef(0);

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    depth.current = 0;
    setDragging(false);
    const dropped = Array.from(e.dataTransfer.files ?? []);
    if (dropped.length > 0) void analyzeFiles(dropped);
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
          multiple
          style={{ display: "none" }}
          onChange={(e) => {
            const chosen = Array.from(e.target.files ?? []);
            if (chosen.length > 0) void analyzeFiles(chosen);
          }}
        />
        <button
          className="circle"
          style={{ width: 48, height: 48 }}
          onClick={() => fileRef.current?.click()}
          aria-label="Choose files"
        >
          <Icon name="plus" size={18} />
        </button>
        <button className="pill pill-dark" onClick={() => fileRef.current?.click()}>
          Choose your files, or drop them anywhere
          <Sparkle size={13} />
        </button>
        <button className="pill" onClick={() => beginUpload()}>
          See the example
        </button>
      </div>
    </main>
  );
}
