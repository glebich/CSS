import { useEffect, useRef, useState } from "react";
import { useStore } from "../store";
import { theaterScript } from "../data/seed";
import { Icon } from "./chrome";

/**
 * The Analysis Theater. Two modes, one honesty rule. For a real dropped
 * project the checklist tracks the engine's actual phases and the raw
 * lines beneath are its real measurements; nothing is scripted. For the
 * example resident the seeded script streams, and the surface says
 * Example.
 */

const PHASES = [
  { key: "Upload", label: "Uploading the files" },
  { key: "Reassemble", label: "Reassemble the app" },
  { key: "Strategy", label: "Read the strategy" },
  { key: "Design", label: "Judge the design" },
  { key: "UX", label: "Walk the journeys" },
  { key: "Errors", label: "Check for breakage" },
];

/** The phases as a checklist: done, now with its clock, next by number. */
function PhaseList({ lines }: { lines: Array<{ phase: string; text: string }> }) {
  const currentKey = lines.length ? lines[lines.length - 1].phase : PHASES[0].key;
  const currentIdx = Math.max(
    0,
    PHASES.findIndex((p) => p.key === currentKey),
  );
  const lastText = lines.length ? lines[lines.length - 1].text : "Opening the drop";

  /* the active phase wears a real clock */
  const [, setTick] = useState(0);
  const startRef = useRef(Date.now());
  useEffect(() => {
    startRef.current = Date.now();
  }, [currentIdx]);
  useEffect(() => {
    const t = window.setInterval(() => setTick((x) => x + 1), 1000);
    return () => window.clearInterval(t);
  }, []);
  const secs = Math.max(0, Math.floor((Date.now() - startRef.current) / 1000));
  const clock = `${String(Math.floor(secs / 60)).padStart(2, "0")}:${String(secs % 60).padStart(2, "0")}`;

  const feedRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight });
  }, [lines.length]);

  return (
    <div className="theater-list">
      {PHASES.map((p, i) => {
        const state = i < currentIdx ? "done" : i === currentIdx ? "now" : "next";
        return (
          <div key={p.key}>
            <div className={`theater-row is-${state}`}>
              <span className="theater-row-mark">
                {state === "done" ? (
                  <Icon name="check" size={13} />
                ) : state === "now" ? (
                  <span className="pulse-dot" />
                ) : (
                  <span className="theater-num">{String(i + 1).padStart(2, "0")}</span>
                )}
              </span>
              <span className="theater-row-label">{p.label}</span>
              {state === "now" && <span className="theater-row-time mono">{clock}</span>}
            </div>
            {state === "now" && (
              <div className="theater-row-sub fade-in" key={lastText}>
                {lastText}
              </div>
            )}
          </div>
        );
      })}
      {/* the raw lines: every measurement as it lands, never a script
          for a real drop */}
      <div className="theater-feed-mini" ref={feedRef}>
        {lines.map((l, i) => (
          <div key={i} className={l.phase === "Strategy" ? "is-strategy" : undefined}>
            {l.text}
          </div>
        ))}
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
      <PhaseList lines={progress} />
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
          Every line in the list is a measurement of your files, not a script.
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
      <PhaseList lines={shown} />
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
        <span className="chip" style={{ position: "absolute", left: 26, bottom: 32 }}>
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
