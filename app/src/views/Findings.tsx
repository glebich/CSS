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

/** A real finding: severity, evidence with file and line, its grounding. */
function RealFindingCard({ finding }: { finding: import("../engine/types").RealFinding }) {
  const { realDecisions, decideReal } = useStore();
  const decision = realDecisions[finding.id];
  const sevClass =
    finding.severity === "high" ? "regressed" : finding.severity === "medium" ? "recurring" : "new";
  return (
    <div className="card card-pad" style={decision === "aside" ? { opacity: 0.5 } : undefined}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span className={`issue-state ${sevClass}`}>{finding.severity}</span>
        <span style={{ fontSize: 15, fontWeight: 510 }}>{finding.title}</span>
        <span className="topbar-spacer" />
        <span className="chip">{finding.lens}</span>
      </div>
      <p style={{ color: "var(--gray-meta)", marginTop: 8, maxWidth: 660 }}>{finding.detail}</p>
      <div style={{ marginTop: 10 }}>
        {finding.evidence.slice(0, 4).map((e, i) => (
          <div key={i} className="mono" style={{ fontSize: 12, color: "var(--gray-secondary)", padding: "3px 0" }}>
            {e.file}
            {e.line ? `:${e.line}` : ""} {"  "}{e.value}
          </div>
        ))}
      </div>
      <p style={{ fontSize: 12, color: "var(--gray-small)", marginTop: 8 }}>
        {finding.grounding}
        {finding.methodNote ? ` ${finding.methodNote}` : ""}
      </p>
      <div style={{ display: "flex", gap: 10, marginTop: 14, alignItems: "center" }}>
        {!decision && (
          <>
            <button className="pill pill-sm" onClick={() => decideReal(finding.id, "accepted")}>
              Accept, add to the plan
              <Sparkle size={12} />
            </button>
            <button
              className="topbar-quiet"
              style={{ padding: 0 }}
              onClick={() => decideReal(finding.id, "aside")}
            >
              Set aside
            </button>
          </>
        )}
        {decision === "accepted" && <span className="issue-state healed">in the plan</span>}
        {decision === "aside" && (
          <span style={{ fontSize: 12.5, color: "var(--gray-meta)" }}>
            Set aside. It stays in the report, quietly.
          </span>
        )}
      </div>
    </div>
  );
}

/** The desk for a really analyzed project: nothing invented, everything cited. */
function RealFindings() {
  const { project, realDecisions, go } = useStore();
  const all = project!.lenses.flatMap((l) => l.findings);
  const strengthsReal = project!.lenses.flatMap((l) => l.strengths);
  const undecided = all.filter((f) => !realDecisions[f.id]);
  const accepted = all.filter((f) => realDecisions[f.id] === "accepted");
  const allDecided = undecided.length === 0;

  return (
    <Page>
      <h1 className="statement statement-page">
        {allDecided ? (
          <>
            All decided. <span className="quiet">Well done.</span>
          </>
        ) : (
          <>
            Findings, <span className="quiet">with their evidence.</span>
          </>
        )}
      </h1>
      <p style={{ color: "var(--gray-meta)", marginTop: 6, maxWidth: 680 }}>
        {allDecided
          ? "Every finding has an answer. The accepted ones are the plan."
          : `${undecided.length} finding${undecided.length === 1 ? "" : "s"} from your actual files, each with the line it lives on and the research it rests on. Accept what you trust, set aside what you do not.`}
      </p>

      {undecided.length > 0 && (
        <>
          <div className="section-label" style={{ marginTop: 30 }}>
            To decide
          </div>
          <div style={{ display: "grid", gap: 14 }}>
            {undecided.map((f) => (
              <RealFindingCard key={f.id} finding={f} />
            ))}
          </div>
        </>
      )}

      {accepted.length > 0 && (
        <>
          <div className="section-label" style={{ marginTop: 30 }}>
            The plan, {accepted.length} accepted
          </div>
          <div style={{ display: "grid", gap: 14 }}>
            {accepted.map((f) => (
              <RealFindingCard key={f.id} finding={f} />
            ))}
          </div>
        </>
      )}

      {strengthsReal.length > 0 && (
        <>
          <div className="section-label" style={{ marginTop: 30 }}>
            What is genuinely good
          </div>
          <div style={{ display: "grid", gap: 14 }}>
            {strengthsReal.map((s) => (
              <div key={s.id} className="card card-pad">
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span className="pulse-dot" style={{ animation: "none" }} />
                  <span style={{ fontSize: 15, fontWeight: 510 }}>{s.title}</span>
                  <span className="topbar-spacer" />
                  <span className="chip">{s.lens}</span>
                </div>
                <p style={{ color: "var(--gray-meta)", marginTop: 8, maxWidth: 660 }}>{s.detail}</p>
              </div>
            ))}
          </div>
        </>
      )}

      <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 36 }}>
        {allDecided ? (
          <button className="pill pill-dark" onClick={() => go("transform")}>
            See both futures
            <Sparkle size={13} />
          </button>
        ) : (
          <button className="pill" onClick={() => go("transform")}>
            Preview first, decide after
          </button>
        )}
      </div>
    </Page>
  );
}

/**
 * The Findings Desk: everything the examination knows, decidable. For a
 * real project the findings come from the engine with their evidence;
 * for the example, the seeded report with its estimated values.
 */
export function Findings() {
  const { decisions, restoreAside, go, healed, project } = useStore();
  if (project) return <RealFindings />;

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
