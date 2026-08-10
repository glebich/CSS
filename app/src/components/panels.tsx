import { useRef } from "react";
import { useStore, type Mood } from "../store";
import { personas } from "../data/seed";
import { Icon } from "./chrome";
import { MiniApp, previewDevice } from "./MiniApp";

function useDragValue(onValue: (frac: number) => void) {
  const ref = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  function fromEvent(clientX: number) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    onValue(Math.min(1, Math.max(0, (clientX - rect.left) / rect.width)));
  }
  return {
    ref,
    onPointerDown: (e: React.PointerEvent) => {
      dragging.current = true;
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      fromEvent(e.clientX);
    },
    onPointerMove: (e: React.PointerEvent) => dragging.current && fromEvent(e.clientX),
    onPointerUp: () => (dragging.current = false),
  };
}

function MoodRow({
  name,
  min,
  max,
  value,
  onChange,
}: {
  name: string;
  min: string;
  max: string;
  value: number;
  onChange: (v: number) => void;
}) {
  const drag = useDragValue((frac) => onChange(Math.round(frac * 100)));
  return (
    <div className="mood-row" {...drag}>
      <div className="mood-fill" style={{ width: `${value}%` }} />
      <div className="mood-thumb" style={{ left: `calc(${value}% - 10px)` }}>
        <svg width="6" height="12" viewBox="0 0 6 12" fill="none" aria-hidden>
          <path d="M1 1v10M5 1v10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      </div>
      <span className="mood-name">{name}</span>
      <span className="mood-min">{min}</span>
      <span className="mood-max">{max}</span>
    </div>
  );
}

/**
 * The Mood panel: not words, dials. Three feelings on draggable bands,
 * and the live render follows the hand.
 */
export function MoodPanel() {
  const { mood, setMood, togglePanel, styleId, personaId, device } = useStore();
  const rows: Array<{ key: keyof Mood; name: string; min: string; max: string }> = [
    { key: "energy", name: "Energy", min: "Calm", max: "Energetic" },
    { key: "style", name: "Style", min: "Minimal", max: "Bold" },
    { key: "tone", name: "Tone", min: "Playful", max: "Serious" },
  ];
  return (
    <aside className="glass-panel floating-panel fade-in">
      <button className="panel-x" onClick={() => togglePanel("mood")} aria-label="Close mood">
        <svg width="10" height="10" viewBox="0 0 8 8" fill="none" aria-hidden>
          <path d="M1 1l6 6M7 1L1 7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      </button>
      <div className="panel-title">Mood</div>
      {rows.map((row) => (
        <MoodRow
          key={row.key}
          name={row.name}
          min={row.min}
          max={row.max}
          value={mood[row.key]}
          onChange={(v) => setMood({ [row.key]: v })}
        />
      ))}
      <div className="panel-thumb">
        <MiniApp variant="live" styleId={styleId} mood={mood} personaId={personaId} device={previewDevice(device)} />
      </div>
      <p style={{ fontSize: 11.5, color: "var(--gray-tertiary)", marginTop: 10, lineHeight: 1.5 }}>
        The render follows the dials. Nothing to type.
      </p>
    </aside>
  );
}

/**
 * The Personas panel: the audience as people you can look at,
 * with the age dial breathing a live reach estimate.
 */
export function PersonasPanel() {
  const { personaId, setPersonaId, togglePanel, styleId, mood, device } = useStore();
  const active = personas.find((p) => p.id === personaId) ?? personas[0];
  const drag = useDragValue(() => undefined);
  return (
    <aside className="glass-panel floating-panel fade-in" style={{ width: 320 }}>
      <button className="panel-x" onClick={() => togglePanel("personas")} aria-label="Close personas">
        <svg width="10" height="10" viewBox="0 0 8 8" fill="none" aria-hidden>
          <path d="M1 1l6 6M7 1L1 7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      </button>
      <div className="panel-title">Who this is for</div>
      {personas.map((p) => (
        <div
          key={p.id}
          className={`persona-card${p.id === personaId ? " is-active" : ""}`}
          onClick={() => setPersonaId(p.id)}
          role="button"
        >
          <span className="persona-portrait" style={{ background: p.portrait }} />
          <div style={{ minWidth: 0 }}>
            <div className="persona-name">{p.name}</div>
            <div className="persona-meta">
              {p.age} &middot; {p.role}
            </div>
            <div className="persona-line">{p.line}</div>
          </div>
        </div>
      ))}
      <div className="age-track" {...drag}>
        <div
          className="mood-fill"
          style={{ width: `${((active.age - 18) / (65 - 18)) * 100}%` }}
        />
        <span className="mood-name" style={{ top: 9, fontSize: 12.5 }}>
          Age {active.age}
        </span>
        <span className="mood-max" style={{ bottom: 10, fontSize: 11 }}>
          {active.reach}, an estimate
        </span>
      </div>
      <div className="panel-thumb">
        <MiniApp variant="live" styleId={styleId} mood={mood} personaId={personaId} device={previewDevice(device)} />
      </div>
      <p style={{ fontSize: 11.5, color: "var(--gray-tertiary)", marginTop: 10, lineHeight: 1.5 }}>
        The primary persona changes the render, the Twin, and what counts as
        a qualified view.
      </p>
    </aside>
  );
}

/** Run mode: the resident wearing the chosen device, live. */
export function RunOverlay() {
  const { device, styleId, mood, personaId, togglePanel } = useStore();
  const frame =
    device === "watch"
      ? { frame: "watch-frame", screen: "watch-screen" }
      : device === "mobile"
        ? { frame: "phone-frame", screen: "phone-screen" }
        : { frame: "desktop-frame", screen: "desktop-screen" };
  return (
    <div className="run-overlay fade-in" onClick={() => togglePanel("run")}>
      <div className="run-stage" onClick={(e) => e.stopPropagation()}>
        <div className={frame.frame}>
          <div className={frame.screen}>
            <MiniApp
              variant="live"
              styleId={styleId}
              mood={mood}
              personaId={personaId}
              device={device}
            />
          </div>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginTop: 20,
            gap: 10,
            alignItems: "center",
          }}
        >
          <span style={{ fontSize: 13, color: "var(--gray-small)" }}>
            Live at skyrecall.osyle.app
          </span>
          <button
            className="pill pill-sm pill-dark"
            onClick={() => togglePanel("run")}
            style={{ height: 40 }}
          >
            <Icon name="back" size={14} />
            Back to the desk
          </button>
        </div>
      </div>
    </div>
  );
}
