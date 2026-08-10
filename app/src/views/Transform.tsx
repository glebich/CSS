import { useStore } from "../store";
import { Page, Sparkle } from "../components/chrome";
import { MiniApp, previewDevice } from "../components/MiniApp";

/**
 * The preview: the same product twice, side by side, both alive. No
 * slider, no trick. For a real project the left frame is the dropped
 * app as it arrived and the right frame is the same document with the
 * chosen style tokens applied, honestly labeled as the token layer.
 */

function ExamplePreview() {
  const { styleId, mood, personaId, device, comfort } = useStore();
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 28 }}>
        <div>
          <div className="section-label">As it arrived</div>
          <div className="preview-frame" style={{ overflow: "hidden" }}>
            <MiniApp variant="before" />
          </div>
        </div>
        <div>
          <div className="section-label">Wearing your choices</div>
          <div className="preview-frame" style={{ overflow: "hidden" }}>
            <MiniApp
              variant="live"
              styleId={styleId}
              mood={mood}
              personaId={personaId}
              device={previewDevice(device)}
              comfort={comfort}
            />
          </div>
        </div>
      </div>
      <p style={{ fontSize: 12, color: "var(--gray-small)", marginTop: 12 }}>
        The example resident, before and after. Drop your own files on the
        Place step and these frames become your real page.
      </p>
    </>
  );
}

export function Transform() {
  const { transformAccepted, acceptTransform, go } = useStore();

  return (
    <Page wide>
      <h1 className="statement statement-page">
        Same app. <span className="quiet">Two futures.</span>
      </h1>

      <ExamplePreview />

      <div
        style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 30, alignItems: "center" }}
      >
        {transformAccepted ? (
          <>
            <span style={{ color: "var(--gray-meta)", fontSize: 13 }}>
              Accepted. Every repair is annotated in the Reveal.
            </span>
            <button className="pill pill-dark" onClick={() => go("reveal")}>
              Open the Reveal
              <Sparkle size={13} />
            </button>
          </>
        ) : (
          <>
            <button className="pill" onClick={() => go("findings")}>
              Decide the findings first
            </button>
            <button
              className="pill pill-dark"
              onClick={() => {
                acceptTransform();
                go("reveal");
              }}
            >
              Keep the right one
              <Sparkle size={13} />
            </button>
          </>
        )}
      </div>
    </Page>
  );
}
