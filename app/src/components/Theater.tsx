import { useEffect, useRef, useState } from "react";
import { useStore } from "../store";
import { theaterScript } from "../data/seed";

/**
 * The Analysis Theater: the agent feed on the left, streaming its six
 * phases at a human cadence; the live understanding panel on the right,
 * gaining screens, flows, and a findings counter as they are earned.
 * Deterministic timings, a ghost Skip, and it never runs twice.
 */
export function Theater() {
  const { finishReading } = useStore();
  const [step, setStep] = useState(0);
  const feedRef = useRef<HTMLDivElement>(null);
  const timer = useRef<number>();

  useEffect(() => {
    if (step >= theaterScript.length) {
      timer.current = window.setTimeout(finishReading, 1800);
      return () => window.clearTimeout(timer.current);
    }
    timer.current = window.setTimeout(
      () => setStep((s) => s + 1),
      theaterScript[step].delay,
    );
    return () => window.clearTimeout(timer.current);
  }, [step, finishReading]);

  useEffect(() => {
    feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight });
  }, [step]);

  const shown = theaterScript.slice(0, step);
  const screens = shown.flatMap((l) => l.addScreens ?? []);
  const flows = shown.flatMap((l) => l.addFlows ?? []);
  const issues = shown.reduce((n, l) => n + (l.addIssues ?? 0), 0);
  const currentPhase = shown.length
    ? shown[shown.length - 1].phase
    : theaterScript[0].phase;

  let lastPhase = "";

  return (
    <div className="theater fade-in">
      <div className="theater-feed" ref={feedRef}>
        {shown.map((line, i) => {
          const phaseHeader = line.phase !== lastPhase;
          lastPhase = line.phase;
          return (
            <div key={i} className="fade-in">
              {phaseHeader && <div className="theater-phase">{line.phase}</div>}
              <div className={`theater-line${line.phase === "Strategy" ? " is-strategy" : ""}`}>
                {line.text}
              </div>
            </div>
          );
        })}
        <div className="theater-line" style={{ opacity: 0.4 }}>
          <span className="pulse-dot" style={{ width: 6, height: 6 }} />
        </div>
      </div>

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
        <button className="topbar-quiet theater-skip" onClick={finishReading}>
          Skip
        </button>
      </div>
    </div>
  );
}
