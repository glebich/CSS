import { type ReactNode } from "react";
import { useStore, type View } from "../store";
import { resident } from "../data/seed";

export function Sparkle({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <path d="M8 0c.6 4.4 3 6.8 8 8-5 1.2-7.4 3.6-8 8-.6-4.4-3-6.8-8-8 5-1.2 7.4-3.6 8-8Z" />
    </svg>
  );
}

export function Wordmark() {
  return (
    <span className="wordmark">
      Osyle<sup>&reg;</sup>
    </span>
  );
}

export function TopBar({ inResident }: { inResident: boolean }) {
  const { go, resetDemo } = useStore();
  return (
    <header className="topbar">
      <button onClick={() => go(inResident ? "home" : "landing")} aria-label="Osyle">
        <Wordmark />
      </button>
      {inResident && (
        <>
          <span className="topbar-divider" />
          <span className="topbar-resident">
            {resident.name}
            <svg width="9" height="6" viewBox="0 0 9 6" fill="none" aria-hidden>
              <path d="M1 1l3.5 3.5L8 1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </span>
        </>
      )}
      <span className="topbar-spacer" />
      <button className="topbar-quiet" onClick={resetDemo}>
        Reset demo
      </button>
      <span className="avatar-chip">GK</span>
    </header>
  );
}

const NAV: Array<{ view: View; label: string }> = [
  { view: "home", label: "Home" },
  { view: "exam", label: "Examination" },
  { view: "transform", label: "Transform" },
  { view: "issues", label: "Issues" },
];

const LIFE_NAV: Array<{ view: View; label: string }> = [
  { view: "address", label: "Address" },
  { view: "monitor", label: "Monitor" },
  { view: "inbox", label: "Inbox" },
  { view: "sdk", label: "SDK" },
];

export function BottomBar() {
  const { view, go, inbox } = useStore();
  const unread = inbox.filter((e) => !e.read).length;
  const active = (v: View) =>
    v === view || (v === "transform" && view === "reveal") ? " is-active" : "";
  return (
    <nav className="bottombar">
      <div className="bar-group">
        {NAV.map((item) => (
          <button
            key={item.view}
            className={`bar-item${active(item.view)}`}
            onClick={() => go(item.view)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="ask-pill">
        <span className="pulse-dot" aria-hidden />
        <input placeholder="Ask anything about SkyRecall" readOnly />
      </div>
      <div className="bar-group">
        {LIFE_NAV.map((item) => (
          <button
            key={item.view}
            className={`bar-item${active(item.view)}`}
            onClick={() => go(item.view)}
          >
            {item.label}
            {item.view === "inbox" && unread > 0 ? ` ${unread}` : ""}
          </button>
        ))}
        <button
          className={`bar-item${active("promote")}`}
          onClick={() => go("promote")}
        >
          Promote
        </button>
      </div>
    </nav>
  );
}

/** A working-canvas page: dotted paper, centered column. */
export function Page({
  children,
  dotted = false,
  wide = false,
}: {
  children: ReactNode;
  dotted?: boolean;
  wide?: boolean;
}) {
  return (
    <main className={`canvas${dotted ? " canvas-dotted" : ""}`}>
      <div className="canvas-inner" style={wide ? { maxWidth: 1240 } : undefined}>
        {children}
      </div>
    </main>
  );
}
