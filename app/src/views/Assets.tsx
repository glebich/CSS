import { useStore } from "../store";
import { FlowSteps, Sparkle } from "../components/chrome";
import { Theater } from "../components/Theater";
import { materials, type Material } from "../data/seed";
import type { ProjectFile } from "../engine/types";

/** An honest one-line note about what a real file is. */
function fileNote(f: ProjectFile): string {
  if (!f.text) return `${Math.round(f.bytes / 1024)} KB, binary`;
  const lines = f.text.split("\n").length;
  if (/\.(css|scss|less)$/i.test(f.path)) {
    const colors = new Set(f.text.match(/#[0-9a-f]{3,6}\b|rgba?\([^)]+\)/gi) ?? []).size;
    const sizes = new Set(f.text.match(/font-size\s*:\s*[^;}]+/gi) ?? []).size;
    return `${lines} lines, ${colors} colors, ${sizes} font sizes`;
  }
  if (/\.[jt]sx?$/.test(f.path)) {
    const components = (f.text.match(/export\s+(default\s+)?(function|const)\s+[A-Z]\w*/g) ?? []).length;
    return components > 0 ? `${lines} lines, ${components} component${components === 1 ? "" : "s"}` : `${lines} lines`;
  }
  if (/\.html?$/i.test(f.path)) {
    const buttons = (f.text.match(/<button\b|<a\b/gi) ?? []).length;
    return `${lines} lines, ${buttons} actions`;
  }
  return `${lines} lines`;
}

function ExampleVisual({ m, understood }: { m: Material; understood: boolean }) {
  if (!understood) {
    return (
      <>
        <div className="file-name">{m.name}</div>
        <div className="file-size">{m.size}</div>
      </>
    );
  }
  if (m.kind === "image") {
    return (
      <>
        <div
          style={{
            height: 64,
            borderRadius: 10,
            background: "linear-gradient(140deg, #cfd9e6 0%, #8fa5bd 55%, #e8b06a 100%)",
            marginBottom: 8,
          }}
        />
        <div className="file-name">{m.name}</div>
        <div className="file-summary">{m.understood}</div>
      </>
    );
  }
  if (m.kind === "video") {
    return (
      <>
        <div
          style={{
            height: 64,
            borderRadius: 10,
            background: "linear-gradient(140deg, #1c222c 0%, #39445a 100%)",
            marginBottom: 8,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M8 5.5v13l10-6.5L8 5.5Z" />
          </svg>
        </div>
        <div className="file-name">{m.name}</div>
        <div className="file-summary">{m.understood}</div>
      </>
    );
  }
  if (m.kind === "fig") {
    return (
      <>
        <div
          style={{
            height: 64,
            borderRadius: 10,
            background: "linear-gradient(140deg, #b9a5ff 0%, #8f7bf2 100%)",
            marginBottom: 8,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span className="file-kind-pill">FIG</span>
        </div>
        <div className="file-name">{m.name}</div>
        <div className="file-summary">{m.understood}</div>
      </>
    );
  }
  if (m.kind === "link") {
    return (
      <>
        <div
          style={{
            height: 64,
            borderRadius: 10,
            background: "linear-gradient(140deg, #f2d16b 0%, #e8b93d 100%)",
            marginBottom: 8,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span className="file-kind-pill" style={{ color: "#7a5c10" }}>Link</span>
        </div>
        <div className="file-name">{m.name}</div>
        <div className="file-summary">{m.understood}</div>
      </>
    );
  }
  return (
    <>
      <div className="file-name">{m.name}</div>
      <div className="file-size">{m.size}</div>
      <div className="file-summary">{m.understood}</div>
    </>
  );
}

/**
 * The materials on the canvas. For a real project everything shown is
 * measured from the dropped bytes: the inventory, each file, each note.
 * For the example, the seeded cards say Example out loud.
 */
export function Assets() {
  const { uploadPhase, go, project, progress } = useStore();
  const reading = uploadPhase === "reading";
  const understood = uploadPhase === "understood";
  const realRun = progress.length > 0 || project !== null;

  return (
    <main className="canvas canvas-dotted" style={{ position: "relative" }}>
      <FlowSteps current="assets" />
      <div
        style={{
          display: "flex",
          gap: 24,
          alignItems: "flex-start",
          padding: "76px 60px 160px",
          maxWidth: 1240,
          margin: "0 auto",
          flexWrap: "wrap",
        }}
      >
        {!realRun && (
          <p
            className="fade-in"
            style={{ flexBasis: "100%", textAlign: "center", fontSize: 13, color: "var(--gray-small)" }}
          >
            Example resident. Drop your own files on the Place step for a real
            examination of your bytes.
          </p>
        )}

        {/* The inventory: what this project actually is. */}
        <div
          className={`card card-solid card-pad${reading ? " is-reading" : ""}`}
          style={{ width: 300, flex: "none", position: "relative", overflow: "hidden" }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 18, fontWeight: 510 }}>
              {project ? project.inventory.name : "SkyRecall"}
            </span>
            {!project && <span className="chip">Example</span>}
          </div>
          {project ? (
            <div style={{ marginTop: 10, fontSize: 13, color: "var(--gray-secondary)", lineHeight: 1.8 }}>
              {project.inventory.framework}
              <br />
              {project.inventory.fileCount} files, {Math.round(project.inventory.totalBytes / 1024)} KB
              <br />
              {project.inventory.screens.length} screen{project.inventory.screens.length === 1 ? "" : "s"},{" "}
              {project.inventory.componentCount} component{project.inventory.componentCount === 1 ? "" : "s"}
              {project.inventory.truncated && (
                <>
                  <br />
                  <span style={{ color: "var(--warn)" }}>Read the first 40 files, honestly capped</span>
                </>
              )}
            </div>
          ) : (
            <div style={{ marginTop: 10, fontSize: 13, color: "var(--gray-secondary)", lineHeight: 1.8 }}>
              The seeded resident
              <br />
              {materials.length} materials, 3 screens
              <br />A recall instrument for pilots
            </div>
          )}
          {understood && (
            <p style={{ marginTop: 12, fontSize: 12.5, fontStyle: "italic", color: "var(--gray-small)", lineHeight: 1.6 }}>
              {project ? project.understanding : "A confidence instrument for pilots who fly rarely."}
            </p>
          )}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(148px, 1fr))",
            gap: 12,
            flex: 1,
            minWidth: 280,
          }}
        >
          {project
            ? [...project.files.values()].slice(0, 12).map((f, i) => (
                <div
                  key={f.path}
                  className={`file-card${reading ? " is-reading" : ""}${understood ? " is-understood" : ""}`}
                  style={reading ? { animationDelay: `${i * 90}ms` } : undefined}
                >
                  <div className="file-name">{f.path.split("/").pop()}</div>
                  <div className="file-size">{f.path.includes("/") ? f.path.slice(0, f.path.lastIndexOf("/")) : ""}</div>
                  <div className="file-summary">{fileNote(f)}</div>
                </div>
              ))
            : materials.map((m, i) => (
                <div
                  key={m.id}
                  className={`file-card${reading ? " is-reading" : ""}${understood ? " is-understood" : ""}`}
                  style={reading ? { animationDelay: `${i * 90}ms` } : undefined}
                >
                  <ExampleVisual m={m} understood={understood} />
                </div>
              ))}
        </div>

        {reading && <Theater />}
      </div>

      <div
        style={{
          position: "absolute",
          bottom: 22,
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        {reading ? (
          <div className="pulse-line glass" style={{ padding: "14px 24px", borderRadius: 30 }}>
            <span className="pulse-dot" />
            <span>
              {realRun
                ? "Measuring your files, line by line."
                : "Reading the example. Under a minute."}
            </span>
          </div>
        ) : (
          <button
            className="pill pill-dark fade-in"
            onClick={() => go(project ? "report" : "style")}
          >
            {project
              ? `Vitality ${project.vitality}. See the report`
              : "Everything understood. Explore a style"}
            <Sparkle size={13} />
          </button>
        )}
      </div>
    </main>
  );
}
