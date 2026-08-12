import { useEffect, useState } from "react";
import { useStore } from "../store";
import { FlowSteps, Icon, Sparkle } from "../components/chrome";
import { Theater } from "../components/Theater";
import { materials, type Material } from "../data/seed";
import type { AnalyzedProject, ProjectFile } from "../engine/types";

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
 * What the examination actually did, once it is done. The same
 * checklist that ran during the reading stays on the surface with its
 * marks filled in, each line carrying the number it measured, so the
 * step never ends in silence.
 */
function ExaminedSummary({ project }: { project: AnalyzedProject | null }) {
  const findings = project ? project.lenses.flatMap((l) => l.findings).length : 9;
  const rows: Array<[string, string]> = project
    ? [
        ["Uploaded the files", `${project.inventory.fileCount} files, ${Math.round(project.inventory.totalBytes / 1024)} KB`],
        ["Reassembled the app", `${project.inventory.framework}, ${project.inventory.componentCount} components`],
        ["Read the strategy", project.understanding],
        ["Judged the design", `${project.lenses.length} lenses weighed`],
        ["Walked the journeys", `${project.inventory.screens.length} screens found`],
        ["Checked for breakage", `${findings} finding${findings === 1 ? "" : "s"}, each with evidence`],
      ]
    : [
        ["Uploaded the files", `${materials.length} materials, 3 screens`],
        ["Reassembled the app", "React, 14 components"],
        ["Read the strategy", "A confidence instrument for pilots who fly rarely"],
        ["Judged the design", "Ten lenses weighed"],
        ["Walked the journeys", "Three screens, two flows"],
        ["Checked for breakage", "Nine findings, each with evidence"],
      ];
  return (
    <div className="theater-list examined-list">
      <div className="section-label" style={{ marginBottom: 6 }}>
        {project ? "What was examined" : "What was examined, example"}
      </div>
      {rows.map(([label, detail]) => (
        <div key={label}>
          <div className="theater-row is-done">
            <span className="theater-row-mark">
              <Icon name="check" size={13} />
            </span>
            <span className="theater-row-label">{label}</span>
          </div>
          <div className="theater-row-sub">{detail}</div>
        </div>
      ))}
    </div>
  );
}

/**
 * The materials on the canvas. For a real project everything shown is
 * measured from the dropped bytes: the inventory, each file, each note.
 * For the example, the seeded cards say Example out loud.
 */
export function Assets() {
  const { uploadPhase, go, project, pendingDrop, togglePanel } = useStore();
  const reading = uploadPhase === "reading";
  const understood = uploadPhase === "understood";
  /* while the examination runs, the files stay inside the closed folder
     and the checklist stands beside it; understanding opens the folder */
  const busy = reading || (pendingDrop !== null && project === null);
  const [assetsOpen, setAssetsOpen] = useState(project !== null && !reading);
  const [closing, setClosing] = useState(false);
  useEffect(() => {
    if (!busy && (understood || project !== null)) setAssetsOpen(true);
  }, [busy, understood, project]);

  /* the files return first, then the folder reads as closed */
  function closeFolder() {
    if (closing) return;
    setClosing(true);
    window.setTimeout(() => {
      setAssetsOpen(false);
      setClosing(false);
    }, 420);
  }

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
        {/* one surface, no waiting room: the checklist does the work in
            the open, and the folder holds the files beside it */}
        {busy && <Theater />}
        {!busy && <ExaminedSummary project={project} />}

        {/* the folder never leaves the table; open, it stands emptied
            beside its files, and the X rides its own edge */}
        {!assetsOpen ? (
          <button
            className={`asset-folder${busy ? " is-reading" : ""}`}
            onClick={() => setAssetsOpen(true)}
            aria-label="Open the materials"
          >
            {/* the shapes share one skin: near each other they merge */}
            <span className="asset-goo" aria-hidden>
              <span className="asset-back" />
              <span className="asset-peek asset-peek-1" />
              <span className="asset-peek asset-peek-2" />
              <span className="asset-peek asset-peek-3" />
            </span>
            <span className="asset-front" aria-hidden />
            <span className="asset-folder-name">App files</span>
            <span className="asset-folder-count">
              {project ? project.files.size : pendingDrop ? "reading" : materials.length}
            </span>
            {!project && !pendingDrop && (
              <span className="chip asset-folder-chip">Example</span>
            )}
          </button>
        ) : (
          /* the whole open folder is a door back; the X is the label */
          <div
            className={`asset-folder is-open${closing ? " is-refilling" : ""}`}
            onClick={closeFolder}
            title="Close the folder"
          >
            <span className="asset-front" aria-hidden />
            <span className="asset-folder-name">App files</span>
            <span className="asset-folder-count">
              {project ? project.files.size : pendingDrop ? "reading" : materials.length}
            </span>
            {!project && !pendingDrop && (
              <span className="chip asset-folder-chip">Example</span>
            )}
            <button
              className="circle asset-folder-x"
              onClick={closeFolder}
              aria-label="Close the materials"
            >
              <svg width="11" height="11" viewBox="0 0 8 8" fill="none" aria-hidden>
                <path d="M1 1l6 6M7 1L1 7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        )}
        {assetsOpen && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(148px, 1fr))",
            gap: 12,
            flex: 1,
            minWidth: 280,
            alignContent: "flex-start",
          }}
        >
          {project
            ? (() => {
                /* around ten files on the table; the rest wait behind one
                   card that opens the file room */
                const all = [...project.files.values()];
                const shown = all.slice(0, 10);
                const rest = all.length - shown.length;
                const motion = `${reading ? " is-reading" : ""}${understood ? " is-understood" : ""}${!reading ? (closing ? " fly-out" : " fly-in") : ""}`;
                return (
                  <>
                    {shown.map((f, i) => (
                      <div
                        key={f.path}
                        className={`file-card${motion}`}
                        style={{ animationDelay: `${i * (reading ? 90 : 45)}ms` }}
                      >
                        <div className="file-name">{f.path.split("/").pop()}</div>
                        <div className="file-size">{f.path.includes("/") ? f.path.slice(0, f.path.lastIndexOf("/")) : ""}</div>
                        <div className="file-summary">{fileNote(f)}</div>
                      </div>
                    ))}
                    {rest > 0 && (
                      <button
                        className={`file-card file-card-more${motion}`}
                        style={{ animationDelay: `${shown.length * 45}ms` }}
                        onClick={() => togglePanel("resident")}
                        title="Every file, in the file room"
                      >
                        <span className="file-more-n">+{rest}</span>
                        <span className="file-summary">more files, all in the file room</span>
                      </button>
                    )}
                  </>
                );
              })()
            : pendingDrop
              ? /* your own drop, still being read: quiet placeholders,
                   never the example's cards over your bytes */
                Array.from({ length: 6 }, (_, i) => (
                  <div
                    key={i}
                    className="file-card is-reading"
                    style={{ animationDelay: `${i * 90}ms`, minHeight: 92 }}
                    aria-hidden
                  />
                ))
              : materials.map((m, i) => (
                  <div
                    key={m.id}
                    className={`file-card${reading ? " is-reading" : ""}${understood ? " is-understood" : ""}${!reading ? (closing ? " fly-out" : " fly-in") : ""}`}
                    style={{ animationDelay: `${i * (reading ? 90 : 45)}ms` }}
                  >
                    <ExampleVisual m={m} understood={understood} />
                  </div>
                ))}
        </div>
        )}
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
        {!reading && (
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
