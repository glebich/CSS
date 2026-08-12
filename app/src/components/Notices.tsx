import { useStore } from "../store";
import { Icon } from "./chrome";

/**
 * The notice stack: every job the interface admits to doing, floating
 * top right on blurred glass, stacking as they arrive. Working jobs
 * show their true progress when the steps are countable; done jobs
 * keep their last line for a breath and leave on their own. Nothing
 * here is decorative; a card exists only while real work does.
 */
export function NoticeStack() {
  const { jobs } = useStore();
  if (jobs.length === 0) return null;
  return (
    <div className="notice-stack" aria-live="polite">
      {jobs.map((j) => (
        <div key={j.id} className={`notice notice-${j.state}`}>
          <div className="notice-head">
            {j.state === "working" ? (
              <span className="pulse-dot" />
            ) : j.state === "done" ? (
              <Icon name="check" size={14} />
            ) : (
              <span className="notice-mark" aria-hidden />
            )}
            <span className="notice-title">{j.title}</span>
          </div>
          {j.detail && <p className="notice-detail">{j.detail}</p>}
          {j.state === "working" && j.progress !== null && (
            <div className="notice-track">
              <div className="notice-fill" style={{ width: `${Math.round(j.progress * 100)}%` }} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
