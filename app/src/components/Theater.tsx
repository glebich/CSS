import { useEffect, useRef, useState } from "react";
import { useStore } from "../store";
import { theaterScript } from "../data/seed";

/**
 * The Analysis Theater. Two modes, one honesty rule. For a real dropped
 * project the feed renders the engine's actual progress lines as they
 * happen; nothing is scripted. For the example resident the seeded
 * script streams, and the surface says Example.
 */

function Feed({
  lines,
  strategyPhase,
}: {
  lines: Array<{ phase: string; text: string }>;
  strategyPhase: string;
}) {
  const feedRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight });
  }, [lines.length]);
  let lastPhase = "";
  return (
    <div className="theater-feed" ref={feedRef}>
      {lines.map((line, i) => {
        const phaseHeader = line.phase !== lastPhase;
        lastPhase = line.phase;
        return (
          <div key={i} className="fade-in">
            {phaseHeader && <div className="theater-phase">{line.phase}</div>}
            <div className={`theater-line${line.phase === strategyPhase ? " is-strategy" : ""}`}>
              {line.text}
            </div>
          </div>
        );
      })}
      <div className="theater-line" style={{ opacity: 0.4 }}>
        <span className="pulse-dot" style={{ width: 6, height: 6 }} />
      </div>
    </div>
  );
}

function RealTheater() {
  const { progress, project, finishReading } = useStore();
  const findingsSoFar = progress.reduce((n, l) => {
    const m = l.text.match(/^(?:.*): (\d+) finding/);
    return n + (m ? Number(m[1]) : 0);
  }, 0);
  const phase = progress.length ? progress[progress.length - 1].phase : "Reassemble";
  return (
    <div className="theater fade-in">
      <Feed lines={progress} strategyPhase="Strategy" />
      <div className="theater-panel">
        <div className="section-label">Measured so far</div>
        {project ? (
          <div style={{ fontSize: 13, color: "var(--gray-secondary)", lineHeight: 1.7 }}>
            {project.inventory.framework}, {project.inventory.fileCount} files,{" "}
            {project.inventory.screens.length} screens,{" "}
            {project.inventory.componentCount} components
          </div>
        ) : (
          <div style={{ fontSize: 13, color: "var(--gray-tertiary)" }}>Reading the bytes</div>
        )}
        <div style={{ marginTop: 18, display: "flex", alignItems: "baseline", gap: 8 }}>
          <span style={{ fontSize: 34, fontWeight: 510, fontVariantNumeric: "tabular-nums" }}>
            {findingsSoFar}
          </span>
          <span style={{ fontSize: 12.5, color: "var(--gray-small)" }}>
            finding{findingsSoFar === 1 ? "" : "s"}, {phase.toLowerCase()} phase
          </span>
        </div>
        <p style={{ fontSize: 11, color: "var(--gray-tertiary)", marginTop: 12, lineHeight: 1.5 }}>
          Every line above is a measurement of your files, not a script.
        </p>
        <button className="topbar-quiet theater-skip" onClick={finishReading}>
          Skip
        </button>
      </div>
    </div>
  );
}

function ExampleTheater() {
  const { finishReading } = useStore();
  const [step, setStep] = useState(0);
  const timer = useRef<number>();

  useEffect(() => {
    if (step >= theaterScript.length) {
      timer.current = window.setTimeout(finishReading, 1800);
      return () => window.clearTimeout(timer.current);
    }
    timer.current = window.setTimeout(() => setStep((s) => s + 1), theaterScript[step].delay);
    return () => window.clearTimeout(timer.current);
  }, [step, finishReading]);

  const shown = theaterScript.slice(0, step);
  const screens = shown.flatMap((l) => l.addScreens ?? []);
  const flows = shown.flatMap((l) => l.addFlows ?? []);
  const issues = shown.reduce((n, l) => n + (l.addIssues ?? 0), 0);
  const currentPhase = shown.length ? shown[shown.length - 1].phase : theaterScript[0].phase;

  return (
    <div className="theater fade-in">
      <Feed lines={shown} strategyPhase="Strategy" />
      <div className="theater-panel">
        <div className="section-label">What it understands so far</div>
        <div style={{ display: "flex", gap: 8 }}>
          {["Drill", "Logbook", "Briefing"].map((name) => (
            <div
              key={name}
              className="theater-thumb"
              style={{ opacity: screens.includes(name) ? 1 : 0.22 }}
            >
              <div className="theater-thumb-bar" />
              <div className="theater-thumb-block" />
              <span>{name}</span>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 16 }}>
          {flows.map((f) => (
            <div key={f} className="theater-flow fade-in">
              {f}
            </div>
          ))}
        </div>
        <div style={{ marginTop: 18, display: "flex", alignItems: "baseline", gap: 8 }}>
          <span style={{ fontSize: 34, fontWeight: 510, fontVariantNumeric: "tabular-nums" }}>
            {issues}
          </span>
          <span style={{ fontSize: 12.5, color: "var(--gray-small)" }}>
            finding{issues === 1 ? "" : "s"} so far, {currentPhase.toLowerCase()} phase
          </span>
        </div>
        <span className="chip" style={{ position: "absolute", left: 16, bottom: 12 }}>
          Example
        </span>
        <button className="topbar-quiet theater-skip" onClick={finishReading}>
          Skip
        </button>
      </div>
    </div>
  );
}

export function Theater() {
  const { progress } = useStore();
  return progress.length > 0 ? <RealTheater /> : <ExampleTheater />;
}
