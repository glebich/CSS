import { useEffect, useRef, useState, type ReactNode } from "react";
import { useStore, type Device, type View } from "../store";
import { promptSuggestions } from "../data/seed";

export function Sparkle({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <path d="M8 0c.6 4.4 3 6.8 8 8-5 1.2-7.4 3.6-8 8-.6-4.4-3-6.8-8-8 5-1.2 7.4-3.6 8-8Z" />
    </svg>
  );
}

function Chevron({ up = false }: { up?: boolean }) {
  return (
    <svg width="10" height="6" viewBox="0 0 10 6" fill="none" aria-hidden style={up ? { transform: "rotate(180deg)" } : undefined}>
      <path d="M1 1l4 3.6L9 1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function X({ size = 8 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 8 8" fill="none" aria-hidden>
      <path d="M1 1l6 6M7 1L1 7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

export type IconName =
  | "home"
  | "monitor"
  | "inbox"
  | "sdk"
  | "promote"
  | "mood"
  | "persona"
  | "play"
  | "phone"
  | "laptop"
  | "globe"
  | "watch"
  | "plus"
  | "mic"
  | "back"
  | "edit"
  | "clip"
  | "copy"
  | "check";

/** 24px stroke icons drawn to match the Osyle_N icon sheet: 1.6 stroke, round caps. */
export function Icon({ name, size = 22 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, ReactNode> = {
    home: <path d="M4 10.5 12 4l8 6.5V20h-5.5v-5h-5v5H4Z" />,
    monitor: <path d="M3 12h4l2.5-6 4 12 2.5-6h5" />,
    inbox: <path d="M4 5h16v14H4Z M4 13h5c0 1.6 1.3 3 3 3s3-1.4 3-3h5" />,
    sdk: <path d="m9 8-4.5 4L9 16m6-8 4.5 4L15 16" />,
    promote: <path d="M7 17 17 7m0 0H9m8 0v8" />,
    mood: <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm-3.5-8c.8 1.8 2 2.7 3.5 2.7s2.7-.9 3.5-2.7M9 9.5h.01M15 9.5h.01" />,
    persona: <path d="M12 11.5a3.75 3.75 0 1 0 0-7.5 3.75 3.75 0 0 0 0 7.5ZM5 20c.8-3.3 3.5-5 7-5s6.2 1.7 7 5" />,
    play: <path d="M8 5.5v13l10-6.5L8 5.5Z" />,
    phone: <path d="M8 3h8a1.5 1.5 0 0 1 1.5 1.5v15A1.5 1.5 0 0 1 16 21H8a1.5 1.5 0 0 1-1.5-1.5v-15A1.5 1.5 0 0 1 8 3Zm2 15h4" />,
    laptop: <path d="M5 6h14v10H5Z M3 19h18" />,
    globe: <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm-9-9h18M12 3c2.5 2.4 3.75 5.4 3.75 9S14.5 18.6 12 21c-2.5-2.4-3.75-5.4-3.75-9S9.5 5.4 12 3Z" />,
    watch: <path d="M9 7h6a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Zm0 0 .8-4h4.4L15 7M9 17l.8 4h4.4l.8-4" />,
    plus: <path d="M12 5v14M5 12h14" />,
    mic: <path d="M12 4a2.6 2.6 0 0 1 2.6 2.6v5a2.6 2.6 0 1 1-5.2 0v-5A2.6 2.6 0 0 1 12 4Zm-6 8a6 6 0 0 0 12 0M12 18v3" />,
    back: <path d="M14 6l-6 6 6 6" />,
    edit: <path d="m5 19 .9-3.6L16.6 4.7a2 2 0 0 1 2.8 2.8L8.7 18.1 5 19Z" />,
    clip: (
      <path d="M18.5 11.5 12 18a4 4 0 0 1-5.7-5.7l7-7a2.7 2.7 0 0 1 3.8 3.8l-7 7a1.4 1.4 0 0 1-2-2l6.4-6.4" />
    ),
    copy: <path d="M9 9h11v12H9Z M5 15V3h11" />,
    check: <path d="m5 13 4.5 4.5L19 8" />,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
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

const DEVICES: Array<{ id: Device; label: string; icon: IconName }> = [
  { id: "mobile", label: "Mobile app", icon: "phone" },
  { id: "desktop", label: "Desktop app", icon: "laptop" },
  { id: "website", label: "Website", icon: "globe" },
  { id: "watch", label: "Wearables", icon: "watch" },
];

export function DeviceSwitcher() {
  const { device, setDevice } = useStore();
  const [open, setOpen] = useState(false);
  const current = DEVICES.find((d) => d.id === device) ?? DEVICES[0];
  return (
    <>
      <button className="device-pill" onClick={() => setOpen(!open)} aria-label="Device">
        <Icon name={current.icon} size={16} />
        {current.label.replace(" app", "")}
        <Chevron up={open} />
      </button>
      {open && (
        <div className="device-menu fade-in">
          {DEVICES.map((d) => (
            <div key={d.id}>
              <button
                className={`device-row${d.id === device ? " is-active" : ""}`}
                onClick={() => {
                  setDevice(d.id);
                  setOpen(false);
                }}
              >
                {d.label}
                <Icon name={d.icon} size={16} />
              </button>
              {d.id === device && d.id === "mobile" && (
                <div className="device-sub">
                  <span>iPhone</span>
                  <span className="on">6.1&quot;</span>
                  <span>6.7&quot;</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

export function TopBar({ inResident }: { inResident: boolean }) {
  const { go, resetDemo, tabs, activeTab, switchTab, addTab, closeTab, project, togglePanel } =
    useStore();
  return (
    <header className="topbar">
      <button onClick={() => go(inResident ? "home" : "landing")} aria-label="Osyle">
        <Wordmark />
      </button>
      <div className="tabs" style={{ marginLeft: 10 }}>
        {tabs.map((tab) => {
          /* a real project owns its tab; the example never speaks for it */
          const label = tab.isDemo && project ? project.inventory.name : tab.name;
          return (
            <span key={tab.id} className={`tab${tab.id === activeTab ? " is-active" : ""}`}>
              <button onClick={() => switchTab(tab.id)}>{label}</button>
              {tabs.length > 1 && (
                <button className="tab-x" onClick={() => closeTab(tab.id)} aria-label={`Close ${label}`}>
                  <X />
                </button>
              )}
            </span>
          );
        })}
        {tabs.length < 10 && (
          <button className="tab-add" onClick={addTab} aria-label="New tab">
            <Icon name="plus" size={14} />
          </button>
        )}
      </div>
      <span className="topbar-spacer" />
      <button className="topbar-quiet topbar-keep" onClick={() => togglePanel("resident")}>
        Your app
      </button>
      <button className="topbar-quiet" onClick={resetDemo}>
        {project ? "Start over" : "Reset demo"}
      </button>
      {inResident && !project && <DeviceSwitcher />}
      <span className="avatar-chip">GK</span>
    </header>
  );
}

const NAV: Array<{ view: View; label: string }> = [
  { view: "home", label: "Home" },
  { view: "exam", label: "Examination" },
  { view: "findings", label: "Findings" },
  { view: "transform", label: "Preview" },
];

const LIFE_NAV: Array<{ view: View; label: string; icon: IconName }> = [
  { view: "address", label: "Address", icon: "home" },
  { view: "monitor", label: "Monitor", icon: "monitor" },
  { view: "inbox", label: "Inbox", icon: "inbox" },
  { view: "sdk", label: "SDK", icon: "sdk" },
  { view: "studio", label: "Studio", icon: "edit" },
  { view: "audience", label: "Audience", icon: "persona" },
  { view: "promote", label: "Promote", icon: "promote" },
];

/**
 * The prompt bar never faces anyone with a blank line: the placeholder
 * rotates through real asks, and focus opens tappable suggestions.
 */
function AskInput() {
  const { go, ask } = useStore();
  const [focused, setFocused] = useState(false);
  const [value, setValue] = useState("");
  const [idx, setIdx] = useState(0);
  const timer = useRef<number>();

  useEffect(() => {
    timer.current = window.setInterval(
      () => setIdx((i) => (i + 1) % promptSuggestions.length),
      3600,
    );
    return () => window.clearInterval(timer.current);
  }, []);

  return (
    <>
      {focused && (
        <div className="suggest-pop">
          {promptSuggestions.map((s) => (
            <button
              key={s.text}
              className="suggest-chip"
              onMouseDown={(e) => {
                e.preventDefault();
                setValue("");
                setFocused(false);
                go(s.view as View);
              }}
            >
              {s.text}
            </button>
          ))}
        </div>
      )}
      <div className="ask-pill">
        <span className="pulse-dot" aria-hidden />
        <input
          placeholder={promptSuggestions[idx].text}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              /* typed words act: routed deterministically, recorded */
              if (value.trim()) ask(value.trim());
              else go("findings");
              setValue("");
              e.currentTarget.blur();
            }
          }}
        />
      </div>
    </>
  );
}

export function BottomBar() {
  const { view, go, inbox, panel, togglePanel, project } = useStore();
  const unread = inbox.filter((e) => !e.read).length;
  /* A real project lives on one Report; navigation would only dilute it. */
  if (project) return null;
  const active = (v: View) =>
    v === view ||
    (v === "transform" && view === "reveal") ||
    (v === "findings" && view === "issues")
      ? " is-active"
      : "";
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
        <AskInput />
        {/* every icon says its name; a bar nobody has to decode.
            Mood and People open sheets, so they wear the dial look
            and stand apart from the rooms. */}
        <button
          className={`nav-stack nav-stack-sheet${panel === "mood" ? " is-active" : ""}`}
          onClick={() => togglePanel("mood")}
          aria-label="Mood"
        >
          <span className="nav-stack-icon">
            <Icon name="mood" size={19} />
          </span>
          <span className="nav-stack-label">Mood</span>
        </button>
        <button
          className={`nav-stack nav-stack-sheet${panel === "personas" ? " is-active" : ""}`}
          onClick={() => togglePanel("personas")}
          aria-label="Personas"
        >
          <span className="nav-stack-icon">
            <Icon name="persona" size={19} />
          </span>
          <span className="nav-stack-label">People</span>
        </button>
        <span className="bar-divide" aria-hidden />
        {LIFE_NAV.map((item) => (
          <button
            key={item.view}
            className={`nav-stack${active(item.view)}`}
            onClick={() => go(item.view)}
            aria-label={item.label}
          >
            <span className="nav-stack-icon">
              <Icon name={item.icon} size={19} />
              {item.view === "inbox" && unread > 0 && <span className="badge" />}
            </span>
            <span className="nav-stack-label">{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}

const FLOW_STEPS: Array<{ view: View; label: string }> = [
  { view: "place", label: "Place" },
  { view: "assets", label: "Materials" },
  { view: "style", label: "Style" },
  { view: "launch", label: "Launch" },
];

const FLOW_STEPS_REAL: Array<{ view: View; label: string }> = [
  { view: "place", label: "Place" },
  { view: "assets", label: "Materials" },
  { view: "report", label: "The report" },
  { view: "address", label: "The address" },
];

/**
 * The journey breadcrumb: four quiet steps across the setup flow, so it
 * is always visible where you are and what remains. Steps already passed
 * are doors back; steps ahead wait their turn.
 */
export function FlowSteps({ current, top }: { current: View; top?: number }) {
  const { go, project, progress } = useStore();
  const steps = project || progress.length > 0 ? FLOW_STEPS_REAL : FLOW_STEPS;
  const idx = steps.findIndex((s) => s.view === current);
  return (
    <div className="flow-steps" style={top !== undefined ? { top } : undefined}>
      {steps.map((step, i) => (
        <button
          key={step.view}
          className={`flow-step${i === idx ? " is-current" : ""}${i < idx ? " is-done" : ""}`}
          onClick={() => i < idx && go(step.view)}
          disabled={i >= idx && i !== idx}
        >
          {i < idx ? (
            <svg width="9" height="8" viewBox="0 0 11 9" fill="none" aria-hidden>
              <path d="M1 4.5 4 7.5 10 1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <span className="flow-step-n">{i + 1}</span>
          )}
          {step.label}
        </button>
      ))}
    </div>
  );
}

/**
 * A first-run explainer: one sentence, shown once, dismissed forever.
 * The product explains itself exactly one time, then trusts you.
 */
export function Tip({ id, children }: { id: string; children: ReactNode }) {
  const { seenTips, markTipSeen } = useStore();
  if (seenTips.has(id)) return null;
  return (
    <div className="tip fade-in">
      <span>{children}</span>
      <button className="tip-got" onClick={() => markTipSeen(id)}>
        Got it
      </button>
    </div>
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
