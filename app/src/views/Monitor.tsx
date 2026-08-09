import { useState } from "react";
import { Page, Sparkle } from "../components/chrome";
import { monitorEvents, responseMs, uptimeDays } from "../data/seed";

/** The Monitor: the resident's day, watched quietly. */
export function Monitor() {
  const [copied, setCopied] = useState(false);
  const max = Math.max(...responseMs);
  const points = responseMs
    .map((ms, i) => `${(i / (responseMs.length - 1)) * 100},${34 - (ms / max) * 30}`)
    .join(" ");

  return (
    <Page>
      <h1 className="statement" style={{ fontSize: 44 }}>
        Watched, <span className="quiet">quietly.</span>
      </h1>

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
