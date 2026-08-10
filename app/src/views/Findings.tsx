import { useState } from "react";
import { currentState, useStore } from "../store";
import { Page, Sparkle } from "../components/chrome";
import { fixPrompt, issues, lenses, strengths, type Issue } from "../data/seed";

function lensName(key: string): string {
  return lenses.find((l) => l.key === key)?.name ?? key;
}

function FindingCard({ issue }: { issue: Issue }) {
  const { decisions, decide, healed } = useStore();
  const [promptOpen, setPromptOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const decision = decisions[issue.id];
  const isHealed = healed.has(issue.id);

  return (
    <div className="card card-pad" style={decision === "aside" ? { opacity: 0.5 } : undefined}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 15, fontWeight: 510 }}>{issue.title}</span>
        <span className="topbar-spacer" />
        <span className="chip">{lensName(issue.lens)}</span>
      </div>
      <p style={{ color: "var(--gray-meta)", marginTop: 8, maxWidth: 660 }}>{issue.detail}</p>
      <p style={{ marginTop: 10, fontSize: 13.5, maxWidth: 660 }}>
        <strong style={{ fontWeight: 510 }}>
          Worth about ${issue.valueMonthly} a month.
        </strong>{" "}
        <span style={{ color: "var(--gray-meta)" }}>{issue.valueWhy}</span>
      </p>

      <div style={{ display: "flex", gap: 10, marginTop: 16, alignItems: "center" }}>
        {!decision && (
          <>
            <button className="pill pill-sm" onClick={() => decide(issue.id, "accepted")}>
              {issue.healable ? "Accept and heal" : "Accept, I will fix the key"}
              <Sparkle size={12} />
            </button>
            <button className="topbar-quiet" style={{ padding: 0 }} onClick={() => decide(issue.id, "aside")}>
              Set aside
            </button>
          </>
        )}
        {decision === "accepted" && issue.healable && (
          <span className={`issue-state ${isHealed ? "healed" : "new"}`}>
            {isHealed ? "healed" : "healing"}
          </span>
        )}
        {decision === "accepted" && !issue.healable && (
          <>
            <span className="issue-state recurring">waiting on your key</span>
            <button className="pill pill-sm" onClick={() => setPromptOpen(!promptOpen)}>
              {promptOpen ? "Close the Fix Prompt" : "Fix Prompt"}
            </button>
          </>
        )}
        {decision === "aside" && (
          <span style={{ fontSize: 12.5, color: "var(--gray-meta)" }}>
            Set aside. It stays in the report, quietly.
          </span>
        )}
      </div>

      {promptOpen && decision === "accepted" && !issue.healable && (
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
            className="pill pill-sm"
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
}

/**
 * The Findings Desk: everything the examination knows, priced and
 * decidable. What is wrong carries its estimated value; what is good is
 * said plainly; every card takes one decision, and when every decision
 * is made there is one door back to rest.
 */
export function Findings() {
  const { decisions, restoreAside, go, healed } = useStore();

  const open = issues.filter(
    (i) => currentState(i.id, healed) !== "healed" || decisions[i.id] === "accepted",
  );
  const undecided = open.filter((i) => !decisions[i.id]);
  const aside = open.filter((i) => decisions[i.id] === "aside");
  const valueWaiting = undecided.reduce((sum, i) => sum + i.valueMonthly, 0);
  const allDecided = undecided.length === 0;

  return (
    <Page>
      <div style={{ display: "flex", alignItems: "baseline", gap: 20 }}>
        <h1 className="statement statement-page">
          {allDecided ? (
            <>
              All decided. <span className="quiet">Well done.</span>
            </>
          ) : (
            <>
              Findings, <span className="quiet">priced and yours to decide.</span>
            </>
          )}
        </h1>
      </div>
      <p style={{ color: "var(--gray-meta)", marginTop: 6, maxWidth: 660 }}>
        {allDecided
          ? "Everything the examination found has an answer. The rest is watching, and that is not your job."
          : `About $${valueWaiting} a month is waiting in ${undecided.length} undecided finding${undecided.length === 1 ? "" : "s"}, an estimate. Accept what you trust, set aside what you do not.`}
      </p>

      {undecided.length > 0 && (
        <>
          <div className="section-label" style={{ marginTop: 30 }}>
            To decide
          </div>
          <div style={{ display: "grid", gap: 14 }}>
            {undecided.map((i) => (
              <FindingCard key={i.id} issue={i} />
            ))}
          </div>
        </>
      )}

      {open.some((i) => decisions[i.id] === "accepted") && (
        <>
          <div className="section-label" style={{ marginTop: 30 }}>
            Accepted
          </div>
          <div style={{ display: "grid", gap: 14 }}>
            {open
              .filter((i) => decisions[i.id] === "accepted")
              .map((i) => (
                <FindingCard key={i.id} issue={i} />
              ))}
          </div>
        </>
      )}

      <div className="section-label" style={{ marginTop: 30 }}>
        What is genuinely good
      </div>
      <div style={{ display: "grid", gap: 14 }}>
        {strengths.map((s) => (
          <div key={s.id} className="card card-pad">
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span className="pulse-dot" style={{ animation: "none" }} />
              <span style={{ fontSize: 15, fontWeight: 510 }}>{s.title}</span>
              <span className="topbar-spacer" />
              <span className="chip">{lensName(s.lens)}</span>
            </div>
            <p style={{ color: "var(--gray-meta)", marginTop: 8, maxWidth: 660 }}>{s.why}</p>
          </div>
        ))}
      </div>

      {aside.length > 0 && (
        <div style={{ display: "flex", gap: 14, alignItems: "center", marginTop: 26 }}>
          <span style={{ fontSize: 13, color: "var(--gray-meta)" }}>
            {aside.length} set aside
          </span>
          <button className="topbar-quiet" style={{ padding: 0 }} onClick={restoreAside}>
            Bring back
          </button>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 36 }}>
        {allDecided ? (
          <button className="pill pill-dark" onClick={() => go("home")}>
            Back to the rest
            <Sparkle size={13} />
          </button>
        ) : (
          <button className="pill" onClick={() => go("issues")}>
            The issues&apos; lives, across examinations
          </button>
        )}
      </div>
    </Page>
  );
}
