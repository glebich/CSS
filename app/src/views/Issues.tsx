import { useState } from "react";
import { currentState, useStore } from "../store";
import { Page, Sparkle } from "../components/chrome";
import { examDates, fixPrompt, issues, lenses, type IssueState } from "../data/seed";

function stateAt(history: IssueState[], examIdx: number): IssueState | null {
  if (examIdx < (3 - history.length)) return null;
  return history[examIdx - (3 - history.length)] ?? null;
}

/** The issue lifecycle: new, recurring, regressed, healed, across examinations. */
export function Issues() {
  const { healed, heal, healing, healableOpen } = useStore();
  const [promptOpen, setPromptOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  return (
    <Page>
      <h1 className="statement statement-page">
        Issues, <span className="quiet">and their lives.</span>
      </h1>
      <p style={{ color: "var(--gray-meta)", marginTop: 6 }}>
        Tracked across three examinations. About the software, never the person.
      </p>

      <div style={{ marginTop: 30, display: "grid", gap: 14 }}>
        {issues.map((issue) => {
          const state = currentState(issue.id, healed) as IssueState;
          return (
            <div key={issue.id} className="card card-pad">
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span className={`issue-state ${state}`}>{state}</span>
                <span style={{ fontSize: 15, fontWeight: 550 }}>{issue.title}</span>
                <span className="topbar-spacer" />
                <span className="chip">{lensName(issue.lens)}</span>
              </div>
              <p style={{ color: "var(--gray-meta)", marginTop: 8, maxWidth: 660 }}>
                {issue.detail}
              </p>

              <div style={{ display: "flex", gap: 18, marginTop: 14, alignItems: "center" }}>
                {examDates.map((date, examIdx) => {
                  const s =
                    examIdx === 2 && healed.has(issue.id)
                      ? "healed"
                      : stateAt(issue.history, examIdx);
                  return (
                    <span
                      key={date}
                      style={{ fontSize: 11, color: "var(--gray-meta)", display: "inline-flex", gap: 6, alignItems: "center" }}
                    >
                      <span
                        style={{
                          width: 7,
                          height: 7,
                          borderRadius: "50%",
                          background: dotColor(s),
                          display: "inline-block",
                        }}
                      />
                      {date}
                    </span>
                  );
                })}
                <span className="topbar-spacer" />
                {issue.id === "weather-key" && (
                  <button className="pill pill-sm" onClick={() => setPromptOpen(!promptOpen)}>
                    {promptOpen ? "Close the Fix Prompt" : "Fix Prompt"}
                  </button>
                )}
              </div>

              {issue.id === "weather-key" && promptOpen && (
                <div className="fade-in" style={{ marginTop: 14 }}>
                  <pre
                    className="mono"
                    style={{
                      background: "var(--card-solid)",
                      border: "1px solid var(--hairline)",
                      borderRadius: 14,
                      padding: 18,
                      whiteSpace: "pre-wrap",
                      color: "var(--ink-soft)",
                    }}
                  >
                    {fixPrompt}
                  </pre>
                  <button
                    className="pill"
                    style={{ marginTop: 10 }}
                    onClick={() => {
                      navigator.clipboard?.writeText(fixPrompt).catch(() => undefined);
                      setCopied(true);
                    }}
                  >
                    {copied ? "Copied" : "Copy the prompt"}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {(healableOpen.length > 0 || healing) && (
        <div style={{ display: "flex", justifyContent: "center", marginTop: 34 }}>
          <button className="pill pill-dark" onClick={heal} disabled={healing}>
            {healing ? "Healing" : "Heal everything healable"}
            <Sparkle size={13} />
          </button>
        </div>
      )}
    </Page>
  );
}

function lensName(key: string): string {
  return lenses.find((l) => l.key === key)?.name ?? key;
}

function dotColor(s: IssueState | null): string {
  switch (s) {
    case "healed":
      return "var(--ok)";
    case "regressed":
      return "var(--bad)";
    case "recurring":
      return "var(--warn)";
    case "new":
      return "var(--ink-soft)";
    default:
      return "var(--gray-faint)";
  }
}
