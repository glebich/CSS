import { useCallback, useEffect, useState } from "react";
import { useStore } from "../store";
import { Page, Sparkle } from "../components/chrome";
import { monitorEvents, responseMs, uptimeDays } from "../data/seed";

interface Pulse {
  files: number;
  bytes: number;
  indexOk: boolean;
  brokenRefs: number;
  lookedAt: string;
}

function when(iso: string): string {
  return `${iso.slice(0, 10)}, ${iso.slice(11, 16)}`;
}

function kb(bytes: number): string {
  return bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/**
 * The Monitor for a real app: nothing invented. Every number here is
 * something the stack measured on its own rounds, or a door this page
 * knocked on a moment ago. When the app has not moved onto the stack
 * there is nothing to watch, and the page says exactly that.
 */
function RealMonitor() {
  const { project, realSlug, stack, go, togglePanel } = useStore();
  const [pulse, setPulse] = useState<Pulse | null>(null);
  const [history, setHistory] = useState<Pulse[]>([]);
  const [door, setDoor] = useState<boolean | null>(null);
  const [asking, setAsking] = useState(false);
  const watching = stack.on && stack.up === true && !!realSlug;

  const read = useCallback(() => {
    if (!watching) return;
    fetch(`${stack.base}/residents/${realSlug}/pulse`, { credentials: "include" })
      .then((r) => (r.ok ? (r.json() as Promise<{ pulse: Pulse | null; history: Pulse[] }>) : null))
      .then((b) => {
        if (!b) return;
        setPulse(b.pulse);
        setHistory(b.history ?? []);
      })
      .catch(() => undefined);
  }, [watching, stack.base, realSlug]);

  useEffect(() => {
    read();
    if (!watching) return;
    /* the door is knocked on the way a visitor's browser would knock */
    const ctl = new AbortController();
    fetch(`${stack.base}/serve/${realSlug}/`, { method: "HEAD", signal: ctl.signal })
      .then((r) => setDoor(r.ok))
      .catch(() => setDoor(false));
    return () => ctl.abort();
  }, [read, watching, stack.base, realSlug]);

  const askForALook = () => {
    if (!watching) return;
    setAsking(true);
    fetch(`${stack.base}/residents/${realSlug}/pulse`, {
      method: "POST",
      credentials: "include",
    })
      .then(() => read())
      .catch(() => undefined)
      .finally(() => setAsking(false));
  };

  if (!watching || !pulse) {
    return (
      <Page>
        <h1 className="statement statement-page">
          Watching <span className="quiet">begins on the stack.</span>
        </h1>
        <p style={{ color: "var(--gray-meta)", marginTop: 8, maxWidth: 620 }}>
          {project?.inventory.name ?? "This app"} lives on this machine so far.
          Move it onto the stack from the address and the caretaker starts its
          rounds: the front door knocked on, the files counted, every local
          reference followed. Until then there is nothing true to show, so
          nothing is shown.
        </p>
        <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
          <button className="pill pill-dark" onClick={() => go("address")}>
            Go to the address
            <Sparkle size={13} />
          </button>
          <button className="pill" onClick={() => go("home")}>
            Back to the home
          </button>
        </div>
      </Page>
    );
  }

  return (
    <Page>
      <h1 className="statement statement-page">
        Watched, <span className="quiet">for real.</span>
      </h1>
      <p style={{ color: "var(--gray-meta)", marginTop: 8, maxWidth: 640 }}>
        Everything below is measured, never estimated. The caretaker last
        looked {when(pulse.lookedAt)}.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginTop: 28 }}>
        <div className="card card-pad">
          <div className="instrument-label">The front door</div>
          <div style={{ fontSize: 22, fontWeight: 550, marginTop: 8 }}>
            {door === null ? "Knocking" : door ? "Answers" : "Silent"}
          </div>
          <p style={{ color: "var(--gray-meta)", fontSize: 12.5, marginTop: 10 }}>
            {door
              ? `The stack serves this app at /serve/${realSlug}/ right now.`
              : door === false
                ? "The stack holds the resident, but no page answered at its root."
                : "Asking the serving door the way a visitor would."}
          </p>
        </div>
        <div className="card card-pad">
          <div className="instrument-label">What the Vault holds</div>
          <div style={{ fontSize: 22, fontWeight: 550, marginTop: 8 }}>
            {pulse.files} file{pulse.files === 1 ? "" : "s"}
          </div>
          <p style={{ color: "var(--gray-meta)", fontSize: 12.5, marginTop: 10 }}>
            {kb(pulse.bytes)} across the newest version of every path, versioned
            on the way in.
          </p>
        </div>
        <div className="card card-pad">
          <div className="instrument-label">References that land</div>
          <div style={{ fontSize: 22, fontWeight: 550, marginTop: 8 }}>
            {pulse.brokenRefs === 0 ? "All of them" : `${pulse.brokenRefs} broken`}
          </div>
          <p style={{ color: "var(--gray-meta)", fontSize: 12.5, marginTop: 10 }}>
            {pulse.brokenRefs === 0
              ? "Every local script, style, and image the pages ask for is in the Vault."
              : "That many local files the pages ask for are not in the Vault."}
          </p>
        </div>
      </div>

      <div className="section-label" style={{ marginTop: 34 }}>
        What the caretaker saw
      </div>
      <div className="card" style={{ padding: "6px 24px" }}>
        {history.map((p) => (
          <div key={p.lookedAt} className="inbox-item">
            <span
              className="inbox-dot"
              style={{
                background:
                  p.brokenRefs > 0 || !p.indexOk ? "var(--bad)" : "var(--ok)",
              }}
            />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14 }}>
                {p.files} file{p.files === 1 ? "" : "s"}, {kb(p.bytes)}.{" "}
                {p.indexOk ? "A front door was found" : "No front door was found"}.{" "}
                {p.brokenRefs === 0
                  ? "Every reference landed"
                  : `${p.brokenRefs} reference${p.brokenRefs === 1 ? "" : "s"} did not land`}
                .
              </div>
              <div style={{ fontSize: 12, color: "var(--gray-meta)", marginTop: 3 }}>
                {when(p.lookedAt)}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 36 }}>
        <button className="pill pill-dark" onClick={askForALook} disabled={asking}>
          {asking ? "Looking" : "Ask for a fresh look"}
          <Sparkle size={13} />
        </button>
        <button className="pill" onClick={() => togglePanel("resident")}>
          Your app
        </button>
        <button className="pill" onClick={() => go("home")}>
          Back to the home
        </button>
      </div>
    </Page>
  );
}

/** The Monitor: the resident's day, watched quietly. */
export function Monitor() {
  const { project } = useStore();
  const [copied, setCopied] = useState(false);
  const max = Math.max(...responseMs);
  const points = responseMs
    .map((ms, i) => `${(i / (responseMs.length - 1)) * 100},${34 - (ms / max) * 30}`)
    .join(" ");

  /* a real app is watched with real measurements; the seeded day below
     belongs to the example and says so */
  if (project) return <RealMonitor />;

  return (
    <Page>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <h1 className="statement statement-page">
          Watched, <span className="quiet">quietly.</span>
        </h1>
        <span className="chip">Example</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginTop: 30 }}>
        <div className="card card-pad">
          <div className="instrument-label">Uptime, 30 days</div>
          <div style={{ fontSize: 22, fontWeight: 550, marginTop: 8 }}>99.9</div>
          <div style={{ display: "flex", gap: 3, marginTop: 12 }}>
            {uptimeDays.map((ok, i) => (
              <span key={i} className={`uptime-cell${ok ? "" : " down"}`} />
            ))}
          </div>
        </div>
        <div className="card card-pad">
          <div className="instrument-label">Response, median</div>
          <div style={{ fontSize: 22, fontWeight: 550, marginTop: 8 }}>
            88 ms
          </div>
          <svg viewBox="0 0 100 36" style={{ width: "100%", height: 34, marginTop: 10 }} preserveAspectRatio="none">
            <polyline
              points={points}
              fill="none"
              stroke="var(--pulse)"
              strokeWidth="1.6"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <div className="card card-pad">
          <div className="instrument-label">Sessions today</div>
          <div style={{ fontSize: 22, fontWeight: 550, marginTop: 8 }}>9</div>
          <p style={{ color: "var(--gray-meta)", fontSize: 12.5, marginTop: 10 }}>
            Four stalled at the weather briefing. The Art Director would step in
            within the hour. He arrives in a later stage.
          </p>
        </div>
      </div>

      <div className="section-label" style={{ marginTop: 34 }}>
        What happened
      </div>
      <div className="card" style={{ padding: "6px 24px" }}>
        {monitorEvents.map((ev) => (
          <div key={ev.id} className="inbox-item">
            <span
              className="inbox-dot"
              style={ev.kind === "dropoff" ? { background: "var(--bad)" } : ev.kind === "recovery" ? { background: "var(--ok)" } : { background: "var(--gray-faint)" }}
            />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14 }}>{ev.text}</div>
              <div style={{ fontSize: 12, color: "var(--gray-meta)", marginTop: 3 }}>{ev.when}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "center", marginTop: 36 }}>
        <button
          className="pill pill-dark"
          onClick={() => {
            navigator.clipboard
              ?.writeText("SkyRecall weather connector returns 401. See Issues for the Fix Prompt.")
              .catch(() => undefined);
            setCopied(true);
          }}
        >
          {copied ? "Copied for your builder" : "Copy the stall report"}
          <Sparkle size={13} />
        </button>
      </div>
    </Page>
  );
}
