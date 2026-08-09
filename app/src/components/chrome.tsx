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

function Chevron() {
  return (
    <svg width="10" height="6" viewBox="0 0 10 6" fill="none" aria-hidden>
      <path d="M1 1l4 3.6L9 1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** 24px stroke icons for the bottom bar circles. */
function Icon({ name }: { name: "home" | "monitor" | "inbox" | "sdk" | "promote" }) {
  const paths: Record<string, ReactNode> = {
    home: <path d="M4 10.5 12 4l8 6.5V20h-5.5v-5h-5v5H4Z" />,
    monitor: <path d="M3 12h4l2.5-6 4 12 2.5-6h5" />,
    inbox: <path d="M4 5h16v14H4Z M4 13h5c0 1.6 1.3 3 3 3s3-1.4 3-3h5" />,
    sdk: <path d="m9 8-4.5 4L9 16m6-8 4.5 4L15 16" />,
    promote: <path d="M7 17 17 7m0 0H9m8 0v8" />,
  };
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {paths[name]}
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
        <div style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", display: "flex", alignItems: "center", gap: 5 }}>
          <span className="topbar-resident">
            {resident.name}
            <Chevron />
          </span>
        </div>
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

const LIFE_NAV: Array<{ view: View; label: string; icon: "home" | "monitor" | "inbox" | "sdk" | "promote" }> = [
  { view: "address", label: "Address", icon: "home" },
  { view: "monitor", label: "Monitor", icon: "monitor" },
  { view: "inbox", label: "Inbox", icon: "inbox" },
  { view: "sdk", label: "SDK", icon: "sdk" },
  { view: "promote", label: "Promote", icon: "promote" },
];

export function BottomBar() {
  const { view, go, inbox } = useStore();
  const unread = inbox.filter((e) => !e.read).length;
  const active = (v: View) =>
    v === view || (v === "transform" && view === "reveal") ? " is-active" : "";
  return (
    <nav className="bottombar">
      <div className="bar-shell">
        {NAV.map((item) => (
          <button
            key={item.view}
            className={`bar-pill${active(item.view)}`}
            onClick={() => go(item.view)}
          >
            {item.label}
          </button>
        ))}
        <div className="ask-pill">
          <span className="pulse-dot" aria-hidden />
          <input placeholder="Ask anything about SkyRecall" readOnly />
        </div>
        {LIFE_NAV.map((item) => (
          <button
            key={item.view}
            className={`circle${active(item.view)}`}
            onClick={() => go(item.view)}
            title={item.label}
            aria-label={item.label}
          >
            <Icon name={item.icon} />
            {item.view === "inbox" && unread > 0 && <span className="badge" />}
          </button>
        ))}
      </div>
    </nav>
  );
}

/** A working-canvas page: paper, centered column. */
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
