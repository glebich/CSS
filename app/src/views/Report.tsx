import { useMemo, useState } from "react";
import { addressTrouble, suggestAddress, useStore } from "../store";
import { Icon, InstrumentBurst, Page, Sparkle } from "../components/chrome";
import { bumpGrowth, drawReportCard } from "../engine/reportcard";
import { motionFor, styleCatalog } from "../data/seed";
import { buildSrcDoc, transformCss } from "../engine/analyze";
import type { AnalyzedProject, RealFinding } from "../engine/types";
import { directionLines } from "../engine/direction";

/**
 * The Report: one page, the whole truth, in the order a person needs
 * it. The number and how it was made; what is wrong, with evidence,
 * yours to decide; what is good; the same app twice, live; and a
 * repair prompt you can take to any tool you build with. Nothing on
 * this page is staged.
 */

const REPORT_STYLES = ["st-aria", "st-mono", "st-warm", "st-night"];

/** The watch glance: the one number that matters, worn small. */
function buildGlance(name: string, vitality: number): string {
  return `<body style="margin:0;height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;background:#0c0c0e;color:#fff;font-family:-apple-system,'SF Pro Display',sans-serif">
<div style="font-size:10px;letter-spacing:2px;opacity:.55">${name.slice(0, 12).toUpperCase()}</div>
<div style="font-size:52px;font-weight:600;letter-spacing:-1px">${vitality}</div>
<div style="font-size:10px;letter-spacing:2px;opacity:.55">VITALITY</div>
</body>`;
}


/** The whole plan as one prompt, ready for the tool that builds. */
function buildRepairPrompt(
  project: AnalyzedProject,
  chosen: RealFinding[],
  direction: string[],
): string {
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
    if (direction.length > 0) {
      lines.push(...direction);
      lines.push("");
    }
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
  if (direction.length > 0) {
    lines.push(...direction);
    lines.push("");
  }
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
  const {
    project,
    realDecisions,
    styleId,
    setStyleId,
    comfort,
    giveAddress,
    realSlug,
    mood,
    people,
    personaId,
  } = useStore();
  const [copied, setCopied] = useState(false);
  /* the prompt stands in the open; hiding it is the choice, not finding it */
  const [promptOpen, setPromptOpen] = useState(true);
  const [cardDrawn, setCardDrawn] = useState(false);
  /* the address is picked before it is given, never derived in silence */
  const [naming, setNaming] = useState(false);
  const [chosen, setChosen] = useState("");
  const trouble = naming ? addressTrouble(chosen) : null;

  async function downloadReportCard() {
    if (!project) return;
    const blob = await drawReportCard(project, realSlug);
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${project.inventory.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-report-card.png`;
    a.click();
    URL.revokeObjectURL(url);
    bumpGrowth("reportcards");
    setCardDrawn(true);
  }

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

  /* the taste chosen in the Style step and on the Mood dials is what
     the builder is actually asked for, rather than decoration the
     person spent time on and never received */
  const audience = people.find((p) => p.id === personaId && p.id.startsWith("p-own-")) ?? null;
  const repairPrompt = buildRepairPrompt(
    project,
    planFindings,
    directionLines(style, mood, audience),
  );

  return (
    <Page wide>
      {/* 1. The number, and how it was made */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 10 }}>
        {/* the number and how it was made stand side by side, one screen */}
        <div className="report-head">
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <span className="instrument-label">Vitality</span>
            <InstrumentBurst score={project.vitality} size={236} fontSize="clamp(52px, 7vw, 72px)" />
          </div>
          <div className="report-head-copy">
            <p
              style={{
                fontStyle: "italic",
                fontSize: 15.5,
                color: "var(--ink-body)",
                lineHeight: 1.6,
              }}
            >
              {project.understanding}
            </p>
            <p style={{ fontSize: 12, color: "var(--gray-small)", marginTop: 10 }}>
              {project.vitalityWhy}
            </p>
          </div>
        </div>
        {project.inventory.services.length > 0 && (
          <p style={{ fontSize: 12.5, color: "var(--gray-meta)", marginTop: 10, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", justifyContent: "center" }}>
            Connections, detected in your files:
            {project.inventory.services.map((s) => (
              <span
                key={s}
                className="chip"
                title="Found by fingerprint in the dropped text. Live status checks arrive with Real Mode."
              >
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--gray-faint)", display: "inline-block", marginRight: 6 }} />
                {s}
              </span>
            ))}
          </p>
        )}
        {/* the ten lenses, each speaking its own state: a score, an honest
            could-not-see, or the stage it arrives with */}
        <div className="lens-strip">
          {project.lenses.map((l) => (
            <div key={l.key} className="lens-cell">
              <span className="lens-cell-name">{l.name}</span>
              <span
                className={`lens-cell-score${l.notApplicable ? " is-blind" : ""}`}
                title={
                  l.notApplicable
                    ? `The static scan found no ${l.name.toLowerCase()} material in these files; the deeper examination reads it in the browser.`
                    : undefined
                }
              >
                {l.notApplicable ? "awaits the deeper scan" : l.score}
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
          <div className="futures-grid" style={{ display: "grid", gap: 16 }}>
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

          {/* the wardrobe: one app, every screen it deserves */}
          <div className="section-label" style={{ marginTop: 44 }}>
            The wardrobe
          </div>
          <p style={{ fontSize: 13, color: "var(--gray-meta)", maxWidth: 640, marginBottom: 16 }}>
            One app wearing every device. The phone and desktop frames are
            your real page at each width; the watch wears the glance pattern,
            one number and nothing else.
          </p>
          <div className="wardrobe" style={{ display: "flex", gap: 26, alignItems: "flex-end", flexWrap: "wrap" }}>
            <div className="phone-frame" style={{ width: 240, height: 490, padding: 8 }}>
              <div className="phone-screen">
                <iframe
                  title="Phone"
                  sandbox="allow-scripts"
                  srcDoc={after ?? before}
                  style={{ width: "100%", height: "100%", border: "none", background: "#fff" }}
                />
              </div>
            </div>
            <div className="desktop-frame" style={{ width: "min(520px, 100%)", aspectRatio: "520 / 350", height: "auto" }}>
              <div className="desktop-screen">
                <iframe
                  title="Desktop"
                  sandbox="allow-scripts"
                  srcDoc={after ?? before}
                  style={{ width: "100%", height: "100%", border: "none", background: "#fff" }}
                />
              </div>
            </div>
            <div className="watch-frame" style={{ width: 150, height: 178, padding: 9 }}>
              <div className="watch-screen">
                <iframe
                  title="Watch"
                  sandbox="allow-scripts"
                  srcDoc={buildGlance(project.inventory.name, project.vitality)}
                  style={{ width: "100%", height: "100%", border: "none" }}
                />
              </div>
            </div>
          </div>
          <p style={{ fontSize: 12, color: "var(--gray-small)", marginTop: 12 }}>
            The tablet composition and the native wrap builds arrive with
            their stage.
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
          <button className="pill" onClick={() => void downloadReportCard()}>
            {cardDrawn ? "The card is yours" : "Download the report card"}
          </button>
          <button
            className="pill pill-dark"
            onClick={() => {
              setChosen(suggestAddress(project.inventory.name));
              setNaming(true);
            }}
          >
            Give it the address
            <Sparkle size={13} />
          </button>
        </div>

        {/* the address is chosen here, before it is given: what the
            files were called is only the first suggestion */}
        {naming && (
          <div className="address-pick card card-pad fade-in">
            <div className="instrument-label">Choose its address</div>
            <p style={{ fontSize: 13, color: "var(--gray-meta)", marginTop: 6 }}>
              This is where the app will live, and where anyone you send will
              find it. Your own domain can point at it later.
            </p>
            <div className="address-field">
              <input
                className="address-input"
                value={chosen}
                autoFocus
                aria-label="The address"
                spellCheck={false}
                onChange={(e) =>
                  setChosen(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !addressTrouble(chosen)) giveAddress(chosen);
                  if (e.key === "Escape") setNaming(false);
                }}
              />
              <span className="address-roof">.osyle.app</span>
            </div>
            <p
              className="address-word"
              style={{ color: trouble ? "var(--bad)" : "var(--gray-small)" }}
            >
              {trouble ?? `${chosen}.osyle.app is free. It is yours.`}
            </p>
            <div style={{ display: "flex", gap: 10, marginTop: 14, justifyContent: "center" }}>
              <button
                className="pill pill-dark"
                disabled={!!trouble}
                onClick={() => giveAddress(chosen)}
              >
                Give it this address
                <Sparkle size={13} />
              </button>
              <button className="pill" onClick={() => setNaming(false)}>
                Not yet
              </button>
            </div>
          </div>
        )}
        {promptOpen && (
          <div className="fade-in" style={{ position: "relative", marginTop: 16 }}>
            {/* the copy lives inside the prompt it copies */}
            <button
              className="prompt-copy"
              aria-label={copied ? "Copied" : "Copy the prompt"}
              title={copied ? "Copied" : "Copy the prompt"}
              onClick={() => {
                navigator.clipboard?.writeText(repairPrompt).catch(() => undefined);
                setCopied(true);
              }}
            >
              <Icon name={copied ? "check" : "copy"} size={15} />
            </button>
            <pre
              className="mono"
              style={{
                textAlign: "left",
                padding: "18px 56px 18px 18px",
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
          </div>
        )}
      </div>
    </Page>
  );
}
