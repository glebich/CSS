import { useState } from "react";
import { readLedger, useStore } from "../store";
import { MiniApp, previewDevice } from "./MiniApp";

/**
 * The workspace rail: the app you are shaping, always visible and
 * live, the way a builder's room keeps the work on the bench. The
 * frame reacts to every dial, the address door opens the real thing,
 * and the history beneath is the Decision Ledger speaking in human
 * lines. Nothing here is a thumbnail; it is the render itself.
 */

const KIND_LINES: Record<string, string> = {
  "style.selected": "Style chosen",
  "mood.changed": "Mood adjusted",
  "persona.selected": "Persona chosen",
  "feeling.applied": "Feeling applied",
  "heal.applied": "Healed",
  "transform.accepted": "Transform accepted",
  "finding.decided": "Finding decided",
  "finding.decided.real": "Finding decided",
  "studio.accepted": "Studio edit applied",
  "audience.described": "Archetype composed",
  "audience.adopted": "Archetype adopted",
  "audience.primary": "Primary archetype set",
  "address.given": "The address given",
  "repo.connected": "Repository connected",
  "stack.claimed": "Claimed on the stack",
  "ask.asked": "You asked",
  "name.changed": "Renamed",
  "files.added": "Files added",
  "file.replaced": "File replaced",
  "file.edited": "File edited",
};

function humanKind(kind: string): string {
  return KIND_LINES[kind] ?? kind.replace(/\./g, " ");
}

export function WorkspacePreview() {
  const { styleId, mood, personaId, device, comfort, ledgerCount, go } = useStore();
  /* ledgerCount keys the reread so new decisions appear as they land */
  void ledgerCount;
  const history = readLedger().slice(-5).reverse();
  const [folded, setFolded] = useState(false);
  /* the bench wears the chosen device: a phone, a watch, or a wide
     desktop frame, and the render composes for it */
  const shown = previewDevice(device);
  const frame =
    device === "watch"
      ? "watch-frame workspace-watch"
      : shown === "mobile"
        ? "phone-frame workspace-phone"
        : "desktop-frame workspace-desktop";

  /* the fold control keeps its seat; only the arrow turns around */
  const foldArrow = (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
      {folded ? (
        <path d="M7.5 2.5 4 6l3.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <path d="M4.5 2.5 8 6l-3.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      )}
    </svg>
  );

  if (folded) {
    return (
      <div className="workspace-preview workspace-preview-folded">
        <button
          className="circle workspace-fold"
          onClick={() => setFolded(false)}
          aria-label="Show the live preview"
          title="Show the live preview"
        >
          {foldArrow}
        </button>
      </div>
    );
  }

  return (
    <aside className="workspace-preview" aria-label="Your app, live">
      <div className="workspace-preview-caption">
        <span className="pulse-dot" />
        Your app, live. It follows every dial.
        <span className="topbar-spacer" />
        {/* the clear way out, and the clear way back */}
        <button
          className="circle workspace-fold"
          onClick={() => setFolded(true)}
          aria-label="Hide the live preview"
          title="Hide the live preview"
        >
          {foldArrow}
        </button>
      </div>
      <div className={frame}>
        <div className={device === "watch" ? "watch-screen" : shown === "mobile" ? "phone-screen" : "desktop-screen"}>
          <MiniApp
            variant="live"
            styleId={styleId}
            mood={mood}
            personaId={personaId}
            device={device === "watch" ? "watch" : shown}
            comfort={comfort}
          />
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, alignSelf: "center", flexWrap: "wrap", justifyContent: "center" }}>
        {/* the theme door rides the bench: the chosen style, one tap away */}
        <button className="pill pill-sm" onClick={() => go("style")}>
          Change the style
        </button>
        <a
          className="pill pill-sm"
          href="#/r/skyrecall"
          target="_blank"
          rel="noreferrer"
          style={{ textDecoration: "none" }}
        >
          Open at the address
        </a>
      </div>

      {history.length > 0 && (
        <div style={{ width: "100%" }}>
          <div className="section-label" style={{ marginBottom: 6 }}>
            History
          </div>
          {history.map((e, i) => (
            <div key={`${e.at}-${i}`} className="workspace-history-row">
              <span>{humanKind(e.kind)}</span>
              <span style={{ color: "var(--gray-tertiary)" }}>{e.at.slice(11, 16)}</span>
            </div>
          ))}
        </div>
      )}
    </aside>
  );
}
