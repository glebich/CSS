import { useStore } from "../store";
import { FlowSteps, Sparkle } from "../components/chrome";
import { materials, type Material } from "../data/seed";

function FileVisual({ m, understood }: { m: Material; understood: boolean }) {
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
 * The materials land on the dotted canvas. While the system reads them
 * the gradient sweeps through every card; when it is done, each card
 * shows what was understood, so trust needs no explaining.
 */
export function Assets() {
  const { uploadPhase, go, droppedName } = useStore();
  const reading = uploadPhase === "reading";
  const understood = uploadPhase === "understood";

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
        {droppedName && (
          <p
            className="fade-in"
            style={{
              flexBasis: "100%",
              textAlign: "center",
              fontSize: 13,
              color: "var(--gray-small)",
            }}
          >
            {reading
              ? `${droppedName} noted. Real Mode will read it. Meanwhile, meet SkyRecall, the seeded resident.`
              : `${droppedName} is waiting for Real Mode. SkyRecall is ready now.`}
          </p>
        )}
        <div className={`folder-card${reading ? " is-reading" : ""}`}>
          <div className="folder-title">
            Explore
            <br />a style
          </div>
          <span style={{ flex: 1 }} />
          <div className="folder-sub">Curated by the world&apos;s top designers</div>
        </div>

        <div className={`folder-card${reading ? " is-reading" : ""}`} style={{ width: 200, height: 260 }}>
          <div className="folder-title" style={{ fontSize: 16 }}>
            Assets
          </div>
          <span style={{ flex: 1 }} />
          <div className="folder-count">{materials.length}</div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(148px, 1fr))",
            gap: 12,
            flex: 1,
          }}
        >
          {materials.map((m, i) => (
            <div
              key={m.id}
              className={`file-card${reading ? " is-reading" : ""}${understood ? " is-understood" : ""}`}
              style={reading ? { animationDelay: `${i * 90}ms` } : undefined}
            >
              <FileVisual m={m} understood={understood} />
            </div>
          ))}
        </div>
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
            <span>Reading everything you placed. A minute, not more.</span>
          </div>
        ) : (
          <button className="pill pill-dark fade-in" onClick={() => go("style")}>
            Everything understood. Explore a style
            <Sparkle size={13} />
          </button>
        )}
      </div>
    </main>
  );
}
