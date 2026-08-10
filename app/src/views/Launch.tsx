import { useStore } from "../store";
import { FlowSteps, Page, Sparkle } from "../components/chrome";
import { launchReview, personas, styleCatalog } from "../data/seed";

function moodWords(energy: number, style: number, tone: number): string {
  const a = energy >= 60 ? "Energetic" : "Calm";
  const b = style >= 60 ? "bold" : "minimal";
  const c = tone <= 35 ? "playful" : "serious";
  return `${a}, ${b}, ${c}`;
}

/** Ready to launch: everything chosen, reviewed in one card, one action. */
export function Launch() {
  const { goHomeFromLaunch, mood, personaId, styleId, device, project } = useStore();
  const persona = personas.find((p) => p.id === personaId) ?? personas[0];
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
          <span className="review-value">
            {project
              ? `${project.inventory.name}: ${project.understanding}`
              : launchReview.goal}
          </span>
        </div>
        <div className="review-row">
          <span className="review-label">Audience</span>
          <span className="review-value">
            {persona.name}, {persona.age}, {persona.role.toLowerCase()}. {persona.line}.
          </span>
        </div>
        <div className="review-row">
          <span className="review-label">Success</span>
          <span className="review-value">{launchReview.success}</span>
        </div>
        <div className="review-row">
          <span className="review-label">Style and mood</span>
          <span className="review-value">
            {style.name} by {style.by}. {moodWords(mood.energy, mood.style, mood.tone)}.
          </span>
        </div>
        <div className="review-row">
          <span className="review-label">Platforms</span>
          <span className="review-value" style={{ display: "inline-flex", gap: 8 }}>
            <span className={`platform-chip${device === "mobile" ? "" : " off"}`}>iOS</span>
            <span className={`platform-chip${device === "mobile" ? "" : " off"}`}>Android</span>
            <span className={`platform-chip${device === "website" || device === "desktop" ? "" : " off"}`}>Web</span>
            <span className={`platform-chip${device === "watch" ? "" : " off"}`}>Watch</span>
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
