import { useState } from "react";
import { useStore } from "../store";
import { Page, Sparkle } from "../components/chrome";
import { mapStudio, studioEdits, voicePasses, type StudioEdit } from "../data/seed";

/**
 * The Studio: say the change in plain language, see the diff, decide.
 * Demo Mode ships the scripted edit per the spec, three of them,
 * deterministic and labeled aloud. Nothing applies without consent,
 * and every change carries its why and stays inside the identity.
 */

function keyLooksRight(kind: "anthropic" | "gemini", value: string): boolean | null {
  if (!value) return null;
  return kind === "anthropic" ? /^sk-ant-/.test(value) : /^AIza/.test(value);
}

function loadKey(kind: string): string {
  try {
    return localStorage.getItem(`osyle.keys.${kind}`) ?? "";
  } catch {
    return "";
  }
}

function saveKey(kind: string, value: string): void {
  try {
    localStorage.setItem(`osyle.keys.${kind}`, value);
  } catch {
    /* the field still edits for this session */
  }
}

function DiffView({ edit }: { edit: StudioEdit }) {
  return (
    <div style={{ marginTop: 14 }}>
      {edit.hunks.map((hunk) => (
        <div key={hunk.file} className="diff-block">
          <div className="diff-file mono">{hunk.file}</div>
          {hunk.lines.map((line, i) => (
            <div key={i} className={`diff-line mono is-${line.kind}`}>
              <span className="diff-sign">
                {line.kind === "add" ? "+" : line.kind === "del" ? "-" : " "}
              </span>
              {line.text}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function EditCard({ edit }: { edit: StudioEdit }) {
  const { appliedEdits, applyEdit } = useStore();
  const applied = appliedEdits.includes(edit.id);
  const [aside, setAside] = useState(false);

  if (aside) {
    return (
      <div className="card card-pad fade-in" style={{ marginTop: 22 }}>
        <p style={{ color: "var(--gray-meta)" }}>
          Set aside. The diff stays here whenever you want another look.
        </p>
        <button className="pill pill-sm" style={{ marginTop: 10 }} onClick={() => setAside(false)}>
          Look again
        </button>
      </div>
    );
  }

  return (
    <div className="card card-pad fade-in" style={{ marginTop: 22 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 16.5, fontWeight: 550 }}>{edit.summary}</span>
        {applied && <span className="chip">Applied</span>}
        <span className="topbar-spacer" />
        <span className="chip">Scripted example</span>
      </div>
      <p style={{ fontSize: 13, color: "var(--gray-meta)", marginTop: 8, maxWidth: 660 }}>
        Why: {edit.why}
      </p>
      <DiffView edit={edit} />
      <p style={{ fontSize: 12.5, color: "var(--gray-small)", marginTop: 10 }}>{edit.identityNote}</p>
      {applied ? (
        <p style={{ fontWeight: 510, marginTop: 14 }}>Your app got better today.</p>
      ) : (
        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <button className="pill pill-dark" onClick={() => applyEdit(edit.id)}>
            Apply the change
            <Sparkle size={13} />
          </button>
          <button className="pill" onClick={() => setAside(true)}>
            Set aside
          </button>
        </div>
      )}
    </div>
  );
}

export function Studio() {
  const { appliedEdits } = useStore();
  const [text, setText] = useState("");
  const [asked, setAsked] = useState<string | null>(null);
  const [voice, setVoice] = useState<string | null>(null);
  const [anthropicKey, setAnthropicKey] = useState(() => loadKey("anthropic"));
  const [geminiKey, setGeminiKey] = useState(() => loadKey("gemini"));

  const edit = asked ? mapStudio(asked) : null;
  const voiceEdit = voice ? (voicePasses.find((v) => v.id === voice) ?? null) : null;
  const aOk = keyLooksRight("anthropic", anthropicKey);
  const gOk = keyLooksRight("gemini", geminiKey);

  return (
    <Page>
      <h1 className="statement statement-page">
        Say the change. <span className="quiet">See the diff.</span>
      </h1>
      <p style={{ color: "var(--gray-meta)", marginTop: 6, maxWidth: 640 }}>
        Nothing applies without you.
      </p>

      <div style={{ display: "flex", gap: 10, marginTop: 22, alignItems: "center", flexWrap: "wrap" }}>
        <div className="ask-pill ask-pill-wide">
          <input
            placeholder="e.g. show the streak in the logbook"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && text.trim()) {
                setAsked(text.trim());
                setText("");
              }
            }}
          />
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
        {studioEdits.map((e) => (
          <button
            key={e.id}
            className="pill pill-sm"
            style={
              appliedEdits.includes(e.id)
                ? { boxShadow: "inset 0 0 0 1.5px var(--ink-strong)" }
                : undefined
            }
            onClick={() => setAsked(e.ask)}
          >
            {e.ask}
            {appliedEdits.includes(e.id) ? ", applied" : ""}
          </button>
        ))}
      </div>

      {edit && <EditCard key={edit.id} edit={edit} />}
      {asked && !edit && (
        <div className="card card-pad fade-in" style={{ marginTop: 22 }}>
          <p style={{ fontWeight: 510 }}>The demo studio knows three edits, scripted and labeled.</p>
          <p style={{ color: "var(--gray-meta)", marginTop: 6, maxWidth: 620 }}>
            Live edits in your own words arrive with Real Mode and your key.
            Until then, try one of the three above, each with a real diff.
          </p>
        </div>
      )}

      {/* The Voice Director, lite: one register, one honest diff */}
      <div className="section-label" style={{ marginTop: 40 }}>
        The Voice Director
      </div>
      <p style={{ fontSize: 13, color: "var(--gray-meta)", maxWidth: 620 }}>
        A copy pass in a chosen voice: microcopy, empty states, errors, all
        strings and nothing else. Pick a register to read its pass.
      </p>
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        {voicePasses.map((v) => (
          <button
            key={v.id}
            className="pill pill-sm"
            style={voice === v.id ? { boxShadow: "inset 0 0 0 1.5px var(--ink-strong)" } : undefined}
            onClick={() => setVoice(voice === v.id ? null : v.id)}
          >
            {v.ask}
          </button>
        ))}
      </div>
      {voiceEdit && <EditCard key={voiceEdit.id} edit={voiceEdit} />}

      {/* BYOK: the keys, stored here, spoken about honestly */}
      <div className="section-label" style={{ marginTop: 40 }}>
        Your keys
      </div>
      <div className="card card-pad" style={{ maxWidth: 560 }}>
        <div style={{ display: "grid", gap: 10 }}>
          <label
            style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--gray-small)" }}
            title="Your Anthropic key runs live Studio edits when Real Mode arrives"
          >
            Claude
          </label>
          <input
            placeholder="sk-ant-..."
            value={anthropicKey}
            onChange={(e) => {
              setAnthropicKey(e.target.value);
              saveKey("anthropic", e.target.value);
            }}
            style={{ padding: "10px 13px", borderRadius: 10, border: "1px solid var(--hairline)", fontSize: 13 }}
          />
          {aOk !== null && (
            <span style={{ fontSize: 11.5, color: aOk ? "var(--ok)" : "var(--bad)" }}>
              {aOk ? "Looks right" : "Not a key we recognize"}
            </span>
          )}
          <label
            style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--gray-small)", marginTop: 6 }}
            title="Your Gemini key is the second route through the model gateway"
          >
            Gemini
          </label>
          <input
            placeholder="AIza..."
            value={geminiKey}
            onChange={(e) => {
              setGeminiKey(e.target.value);
              saveKey("gemini", e.target.value);
            }}
            style={{ padding: "10px 13px", borderRadius: 10, border: "1px solid var(--hairline)", fontSize: 13 }}
          />
          {gOk !== null && (
            <span style={{ fontSize: 11.5, color: gOk ? "var(--ok)" : "var(--bad)" }}>
              {gOk ? "Looks right" : "Not a key we recognize"}
            </span>
          )}
        </div>
        <p style={{ fontSize: 11.5, color: "var(--gray-small)", marginTop: 12 }}>
          Keys stay on this machine. They power live edits when Real Mode
          arrives with its stage.
        </p>
      </div>
    </Page>
  );
}
