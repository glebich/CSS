import { useRef, useState } from "react";
import { useStore } from "../store";
import { Page, Sparkle } from "../components/chrome";
import { MiniApp } from "../components/MiniApp";

/** The before-and-after slider, one of the signature interactions. */
export function Transform() {
  const { transformAccepted, acceptTransform, go } = useStore();
  const [pos, setPos] = useState(0.5);
  const frameRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  function move(clientX: number) {
    const frame = frameRef.current;
    if (!frame) return;
    const rect = frame.getBoundingClientRect();
    setPos(Math.min(0.97, Math.max(0.03, (clientX - rect.left) / rect.width)));
  }

  return (
    <Page>
      <h1 className="statement" style={{ fontSize: 44 }}>
        Everything it <span className="quiet">could be.</span>
      </h1>
      <p style={{ color: "var(--gray-meta)", marginTop: 6 }}>
        Drag the line. The identity stays. The clutter goes.
      </p>

      <div
        ref={frameRef}
        className="ba-frame"
        style={{ height: 440, marginTop: 28 }}
        onPointerDown={(e) => {
          dragging.current = true;
          (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
          move(e.clientX);
        }}
        onPointerMove={(e) => dragging.current && move(e.clientX)}
        onPointerUp={() => (dragging.current = false)}
      >
        <MiniApp variant="before" />
        <div className="ba-after" style={{ clipPath: `inset(0 0 0 ${pos * 100}%)` }}>
          <MiniApp variant="after" />
        </div>
        <span className="ba-tag" style={{ left: 14 }}>
          Before
        </span>
        <span className="ba-tag" style={{ right: 14 }}>
          After
        </span>
        <div className="ba-divider" style={{ left: `${pos * 100}%` }}>
          <span className="ba-handle">&lsaquo;&rsaquo;</span>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 12,
          marginTop: 32,
          alignItems: "center",
        }}
      >
        {transformAccepted ? (
          <>
            <span style={{ color: "var(--gray-meta)", fontSize: 13 }}>
              Accepted. Every repair is annotated in the Reveal.
            </span>
            <button className="pill pill-dark" onClick={() => go("reveal")}>
              Open the Reveal
              <Sparkle size={13} />
            </button>
          </>
        ) : (
          <>
            <button className="pill" onClick={() => go("reveal")}>
              See why, first
            </button>
            <button
              className="pill pill-dark"
              onClick={() => {
                acceptTransform();
                go("reveal");
              }}
            >
              Accept the transformation
              <Sparkle size={13} />
            </button>
          </>
        )}
      </div>
    </Page>
  );
}
