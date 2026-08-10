import { useMemo, useState } from "react";
import { useStore } from "../store";
import { FlowSteps, Page, Sparkle } from "../components/chrome";
import { motionFor, styleCatalog } from "../data/seed";
import { buildSrcDoc, transformCss } from "../engine/analyze";
import type { AnalyzedProject, RealFinding } from "../engine/types";

/**
 * The Report: one page, the whole truth, in the order a person needs
 * it. The number and how it was made; what is wrong, with evidence,
 * yours to decide; what is good; the same app twice, live; and a
 * repair prompt you can take to any tool you build with. Nothing on
 * this page is staged.
 */

const REPORT_STYLES = ["st-aria", "st-mono", "st-warm", "st-night"];


/** The whole plan as one prompt, ready for the tool that builds. */
function buildRepairPrompt(project: AnalyzedProject, chosen: RealFinding[]): string {
  const lines: string[] = [];
  if (chosen.length > 0) {
    lines.push(`Repair plan for ${project.inventory.name}, from an Osyle examination of ${project.inventory.fileCount} files.`);
    lines.push("");
    lines.push("Apply each repair exactly as named. Do not change behavior, structure, or copy beyond what a repair requires.");
    lines.push("");
    chosen.forEach((f, i) => {
      lines.push(`${i + 1}. ${f.title} [${f.severity}]`);
      lines.push(`   ${f.detail}`);
      for (const e of f.evidence.slice(0, 4)) {
        lines.push(`   Evidence: ${e.file}${e.line ? `:${e.line}` : ""} ${e.value}`);
      }
      lines.push(`   Grounding: ${f.grounding}`);
      lines.push("");
    });
    lines.push("After the repairs, list what changed, file by file.");
    return lines.join("\n");
  }
  /* Nothing measurable failed. The prompt still improves the app,
     honestly framed as what a deeper examination examines. */
  const na = project.lenses.filter((l) => l.notApplicable).map((l) => l.name);
  lines.push(`Improvement plan for ${project.inventory.name}, from an Osyle examination of ${project.inventory.fileCount} files.`);
  lines.push("");
  lines.push(`Measured: ${project.inventory.framework}, ${project.inventory.screens.length} screens, ${project.inventory.componentCount} components. The static lenses found nothing below their floors.`);
  if (na.length > 0) {
    lines.push(`Lenses that could not see this project's styling or code: ${na.join(", ")}.`);
  }
  lines.push("");
  lines.push("Improve the app along these lines, changing behavior only where named:");
  lines.push("1. Walk the first-time path and remove every step that is not the product's one job. Ground: Nielsen's usability heuristics, aesthetic and minimalist design.");
  lines.push("2. Give every screen its empty, loading, and error state, each with one plain sentence and one action.");
  lines.push("3. Run a full WCAG 2.1 AA audit in the browser, contrast, focus order, labels, keyboard paths; static reading cannot see computed styles.");
  lines.push("4. Lab-test Core Web Vitals on a mid-range phone; budget script under 300 KB shipped.");
  lines.push("5. Read every string aloud; delete urgency, guilt, and filler. Calm converts better than pressure over time.");
  lines.push("");
  lines.push("After the pass, list what changed, file by file.");
  return lines.join("\n");
}

function FindingCard({ finding }: { finding: RealFinding }) {
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
            {e.line ? `:${e.line}` : ""} {"  "}
            {e.value}
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
          <button className="topbar-quiet" style={{ padding: 0 }} onClick={() => decideReal(finding.id, "accepted")}>
            Set aside. Bring back
          </button>
        )}
      </div>
    </div>
  );
}

export function Report() {
  const { project, realDecisions, styleId, setStyleId, comfort, giveAddress } = useStore();
  const [copied, setCopied] = useState(false);
  const [promptOpen, setPromptOpen] = useState(false);

  if (!project) return null;

  const findings = project.lenses.flatMap((l) => l.findings);
  const strengths = project.lenses.flatMap((l) => l.strengths);
  const undecided = findings.filter((f) => !realDecisions[f.id]);
  const accepted = findings.filter((f) => realDecisions[f.id] === "accepted");
  const planFindings = accepted.length > 0 ? accepted : findings;

  const style =
    styleCatalog.find((s) => s.id === styleId && REPORT_STYLES.includes(s.id)) ??
    styleCatalog.find((s) => s.id === REPORT_STYLES[0])!;

  const before = useMemo(() => buildSrcDoc(project.files), [project]);
  const after = useMemo(
    () =>
      before
        ? buildSrcDoc(
            project.files,
            transformCss({
              ink: style.ink,
              paper: style.dark ? "#101014" : "#fbfaf8",
              accent: style.accent,
              radius: style.radius,
              fontStack: '"SF Pro Display", -apple-system, "Inter", "Segoe UI", Roboto, sans-serif',
              scale: comfort ? 1.2 : 1,
            }) +
              `/* the style's motion DNA, compiled */\n` +
              `button, a, input, [role="button"] { transition: all ${motionFor(style).ms}ms ${motionFor(style).ease}; }`,
          )
        : null,
    [project, before, style, comfort],
  );

  const repairPrompt = buildRepairPrompt(project, planFindings);

  return (
    <Page wide>
      <FlowSteps current="report" />
      {/* 1. The number, and how it was made */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 10 }}>
        <span className="instrument-label">Vitality</span>
        <div className="instrument" style={{ fontSize: "clamp(110px, 15vw, 190px)" }}>
          {project.vitality}
        </div>
        <p
          style={{
            fontStyle: "italic",
            fontSize: 15.5,
            color: "var(--ink-body)",
            maxWidth: 620,
            textAlign: "center",
            lineHeight: 1.6,
          }}
        >
          {project.understanding}
        </p>
        <p style={{ fontSize: 12, color: "var(--gray-small)", maxWidth: 640, textAlign: "center", marginTop: 10 }}>
          {project.vitalityWhy}
        </p>
        {/* the ten lenses, each speaking its own state: a score, an honest
            could-not-see, or the stage it arrives with */}
        <div className="lens-strip">
          {project.lenses.map((l) => (
            <div key={l.key} className="lens-cell">
              <span className="lens-cell-name">{l.name}</span>
              <span className={`lens-cell-score${l.notApplicable ? " is-blind" : ""}`}>
                {l.notApplicable ? "could not see" : l.score}
              </span>
            </div>
          ))}
          {["Backend and data", "Market and benchmarks"].map((name) => (
            <div key={name} className="lens-cell">
              <span className="lens-cell-name">{name}</span>
              <span className="lens-cell-score is-staged">arrives with its stage</span>
            </div>
          ))}
        </div>
      </div>

      {/* 2. What is wrong, yours to decide */}
      {findings.length > 0 && (
        <div className="section-label" style={{ marginTop: 44 }}>
          {undecided.length > 0
            ? `What to fix, ${undecided.length} to decide`
            : "Every finding decided"}
        </div>
      )}
      <div style={{ display: "grid", gap: 14 }}>
        {undecided.map((f) => (
          <FindingCard key={f.id} finding={f} />
        ))}
        {accepted.length > 0 && (
          <>
            <div className="section-label" style={{ marginTop: 12 }}>
              The plan, {accepted.length} accepted
            </div>
            {accepted.map((f) => (
              <FindingCard key={f.id} finding={f} />
            ))}
          </>
        )}
      </div>

      {/* 3. What is good, said plainly */}
      {strengths.length > 0 && (
        <>
          <div className="section-label" style={{ marginTop: 34 }}>
            What is genuinely good
          </div>
          <div style={{ display: "grid", gap: 14 }}>
            {strengths.map((s) => (
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

      {/* 4. The same app, twice, live */}
      {before && (
        <>
          <div className="section-label" style={{ marginTop: 44 }}>
            Same app. Two futures.
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
            {REPORT_STYLES.map((id) => {
              const s = styleCatalog.find((c) => c.id === id)!;
              return (
                <button
                  key={id}
                  className={`pill pill-sm${style.id === id ? "" : ""}`}
                  style={
                    style.id === id
                      ? { boxShadow: "inset 0 0 0 1.5px var(--ink-strong)" }
                      : undefined
                  }
                  onClick={() => setStyleId(id)}
                >
                  <span
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: 4,
                      background: s.accent,
                      display: "inline-block",
                    }}
                  />
                  {s.name}
                </button>
              );
            })}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <div className="section-label">As it arrived</div>
              <iframe title="Before" className="preview-frame" sandbox="allow-scripts" srcDoc={before} />
            </div>
            <div>
              <div className="section-label">Wearing {style.name}</div>
              <iframe title="After" className="preview-frame" sandbox="allow-scripts" srcDoc={after ?? before} />
            </div>
          </div>
          <p style={{ fontSize: 12, color: "var(--gray-small)", marginTop: 10, maxWidth: 660 }}>
            Both frames are your real page, live. The right one carries the{" "}
            {style.name} token layer: type, color, radius, shadows. The
            structural repairs are the plan above.
          </p>
          <p style={{ fontSize: 12, color: "var(--gray-small)", marginTop: 4 }}>
            Motion: {motionFor(style).name}, {motionFor(style).ms}ms.{" "}
            {motionFor(style).line}.
          </p>
        </>
      )}

      {/* 5. The doors: the plan travels, and the app moves in */}
      <div className="card card-solid card-pad" style={{ marginTop: 44, textAlign: "center" }}>
        <div style={{ fontSize: 18, fontWeight: 510 }}>
          {findings.length === 0
            ? "Nothing measurable to repair. There is still a next step."
            : accepted.length > 0
              ? `Your plan holds ${accepted.length} repair${accepted.length === 1 ? "" : "s"}`
              : `The full plan holds ${findings.length} repair${findings.length === 1 ? "" : "s"}`}
        </div>
        <p style={{ color: "var(--gray-meta)", marginTop: 8, maxWidth: 560, margin: "8px auto 0" }}>
          {findings.length === 0
            ? "The improvement prompt below carries what was measured and what a deeper pass would examine. And the app can move in regardless."
            : "Take the prompt to whatever builds your app: Cursor, Lovable, Claude, your editor. Then give the app its address, because a report is not a home."}
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 18, flexWrap: "wrap" }}>
          <button className="pill" onClick={() => setPromptOpen(!promptOpen)}>
            {promptOpen ? "Hide the prompt" : "Read the prompt"}
          </button>
          <button
            className="pill"
            onClick={() => {
              navigator.clipboard?.writeText(repairPrompt).catch(() => undefined);
              setCopied(true);
            }}
          >
            {copied
              ? "Copied"
              : findings.length === 0
                ? "Copy the improvement prompt"
                : "Copy the repair prompt"}
          </button>
          <button className="pill pill-dark" onClick={giveAddress}>
            Give it the address
            <Sparkle size={13} />
          </button>
        </div>
        {promptOpen && (
          <pre
            className="mono fade-in"
            style={{
              textAlign: "left",
              marginTop: 16,
              padding: 18,
              background: "var(--paper)",
              borderRadius: 14,
              whiteSpace: "pre-wrap",
              maxHeight: 320,
              overflowY: "auto",
              color: "var(--ink-soft)",
            }}
          >
            {repairPrompt}
          </pre>
        )}
      </div>
    </Page>
  );
}
