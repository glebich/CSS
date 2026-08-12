import { useState } from "react";
import { useStore } from "../store";
import { FlowSteps, Icon, Page, Sparkle } from "../components/chrome";
import { launchReview, styleCatalog } from "../data/seed";

function moodWords(energy: number, style: number, tone: number): string {
  const a = energy >= 60 ? "Energetic" : "Calm";
  const b = style >= 60 ? "bold" : "minimal";
  const c = tone <= 35 ? "playful" : "serious";
  return `${a}, ${b}, ${c}`;
}

/** A review value that opens into a textarea where it stands. */
function EditableValue({
  value,
  label,
  onSave,
}: {
  value: string;
  label: string;
  onSave: (t: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  if (editing) {
    return (
      <textarea
        className="review-edit"
        value={draft}
        aria-label={label}
        autoFocus
        rows={2}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          if (draft.trim()) onSave(draft.trim());
          setEditing(false);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            (e.target as HTMLTextAreaElement).blur();
          }
          if (e.key === "Escape") {
            setDraft(value);
            setEditing(false);
          }
        }}
      />
    );
  }
  return (
    <button
      className="review-value review-value-door"
      title="Rewrite this in your own words"
      onClick={() => {
        setDraft(value);
        setEditing(true);
      }}
    >
      {value}
      <Icon name="edit" size={11} />
    </button>
  );
}

/** Ready to launch: everything chosen, reviewed in one card, one action.
    Every row is a door: rewrite the words, change the people, the style,
    the platforms, right here. */
export function Launch() {
  const {
    goHomeFromLaunch,
    mood,
    personaId,
    styleId,
    device,
    setDevice,
    project,
    togglePanel,
    go,
    people,
    launchGoal,
    setLaunchGoal,
    launchSuccess,
    setLaunchSuccess,
  } = useStore();
  const persona = people.find((p) => p.id === personaId) ?? people[0];
  const style = styleCatalog.find((s) => s.id === styleId) ?? styleCatalog[0];

  return (
    <Page>
      <FlowSteps current="launch" />

      <div style={{ textAlign: "center", marginBottom: 34, marginTop: 20 }}>
        <h1 className="statement" style={{ fontSize: "clamp(48px, 5.5vw, 80px)" }}>
          Ready to launch
        </h1>
        <p className="statement-sub">Review your settings and start generation</p>
      </div>

      <div className="review-card" style={{ maxWidth: 720, margin: "0 auto" }}>
        <div className="review-row">
          <span className="review-label">{project ? "The project" : "Primary goal"}</span>
          <EditableValue
            label="Primary goal"
            value={
              launchGoal ??
              (project
                ? `${project.inventory.name}: ${project.understanding}`
                : launchReview.goal)
            }
            onSave={setLaunchGoal}
          />
        </div>
        <div className="review-row">
          <span className="review-label">Audience</span>
          <span className="review-value">
            {persona.name}, {persona.age}, {persona.role.toLowerCase()}. {persona.line}.
          </span>
          {/* the audience is changeable right here, not a fait accompli */}
          <button
            className="pill pill-sm"
            style={{ flex: "none" }}
            onClick={() => togglePanel("personas")}
          >
            Change the personas
          </button>
        </div>
        <div className="review-row">
          <span className="review-label">Success</span>
          <EditableValue
            label="Success"
            value={launchSuccess ?? launchReview.success}
            onSave={setLaunchSuccess}
          />
        </div>
        <div className="review-row">
          <span className="review-label">Style and mood</span>
          <span className="review-value">
            {style.name} by {style.by}. {moodWords(mood.energy, mood.style, mood.tone)}.
          </span>
          <button
            className="pill pill-sm"
            style={{ flex: "none" }}
            onClick={() => togglePanel("mood")}
          >
            Mood
          </button>
          <button
            className="pill pill-sm"
            style={{ flex: "none" }}
            onClick={() => go("style")}
          >
            Change the style
          </button>
        </div>
        <div className="review-row">
          <span className="review-label">Platforms</span>
          <span className="review-value" style={{ display: "inline-flex", gap: 8 }}>
            {/* the chips choose; the render follows the chosen device */}
            <button
              className={`platform-chip${device === "mobile" ? "" : " off"}`}
              onClick={() => setDevice("mobile")}
            >
              iOS
            </button>
            <button
              className={`platform-chip${device === "mobile" ? "" : " off"}`}
              onClick={() => setDevice("mobile")}
            >
              Android
            </button>
            <button
              className={`platform-chip${device === "website" || device === "desktop" ? "" : " off"}`}
              onClick={() => setDevice("website")}
            >
              Web
            </button>
            <button
              className={`platform-chip${device === "watch" ? "" : " off"}`}
              onClick={() => setDevice("watch")}
            >
              Watch
            </button>
          </span>
        </div>
      </div>

      <div style={{ maxWidth: 720, margin: "26px auto 0" }}>
        {project ? (
          project.inventory.screens.length > 0 && (
            <>
              <div className="section-label">
                {project.inventory.screens.length} screen
                {project.inventory.screens.length === 1 ? "" : "s"} found in your files
              </div>
              {project.inventory.screens.map((path) => (
                <div key={path} className="screen-row">
                  <div>
                    <div style={{ fontSize: 14.5, fontWeight: 510 }}>{path.split("/").pop()}</div>
                    <div className="mono" style={{ fontSize: 11.5, color: "var(--gray-tertiary)", marginTop: 2 }}>
                      {path}
                    </div>
                  </div>
                </div>
              ))}
            </>
          )
        ) : (
          <>
            <div className="section-label">
              {launchReview.screens.length} screens identified, example
            </div>
            {launchReview.screens.map((s) => (
              <div key={s.name} className="screen-row">
                <div>
                  <div style={{ fontSize: 14.5, fontWeight: 510 }}>{s.name}</div>
                  <div style={{ fontSize: 12.5, color: "var(--gray-tertiary)", marginTop: 2 }}>
                    {s.detail}
                  </div>
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      <div style={{ display: "flex", justifyContent: "center", marginTop: 36 }}>
        <button className="pill pill-dark" onClick={goHomeFromLaunch}>
          <Sparkle size={13} />
          Create the concept
          <Sparkle size={13} />
        </button>
      </div>
    </Page>
  );
}
