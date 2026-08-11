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
};

function humanKind(kind: string): string {
  return KIND_LINES[kind] ?? kind.replace(/\./g, " ");
}

export function WorkspacePreview() {
  const { styleId, mood, personaId, device, comfort, ledgerCount } = useStore();
  /* ledgerCount keys the reread so new decisions appear as they land */
  void ledgerCount;
  const history = readLedger().slice(-5).reverse();

  return (
    <aside className="workspace-preview" aria-label="Your app, live">
      <div className="workspace-preview-caption">
        <span className="pulse-dot" />
        Your app, live. It follows every dial.
      </div>
      <div className="phone-frame workspace-phone">
        <div className="phone-screen">
          <MiniApp
            variant="live"
            styleId={styleId}
            mood={mood}
            personaId={personaId}
            device={previewDevice(device)}
            comfort={comfort}
          />
        </div>
      </div>
      <a
        className="pill pill-sm"
        href="#/r/skyrecall"
        target="_blank"
        rel="noreferrer"
        style={{ textDecoration: "none", alignSelf: "center" }}
      >
        Open at the address
      </a>

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
