import { useMemo } from "react";
import { useStore } from "../store";
import { Page, Sparkle } from "../components/chrome";
import { MiniApp, previewDevice } from "../components/MiniApp";
import { styleCatalog } from "../data/seed";
import { transformCss } from "../engine/analyze";
import type { AnalyzedProject } from "../engine/types";

/**
 * The preview: the same product twice, side by side, both alive. No
 * slider, no trick. For a real project the left frame is the dropped
 * app as it arrived and the right frame is the same document with the
 * chosen style tokens applied, honestly labeled as the token layer.
 */

/** Build a self-contained document from the dropped files. */
function buildSrcDoc(project: AnalyzedProject, extraCss?: string): string | null {
  const html = [...project.files.values()].find(
    (f) => /(^|\/)index\.html?$/i.test(f.path) && f.text,
  ) ?? [...project.files.values()].find((f) => /\.html?$/i.test(f.path) && f.text);
  if (!html?.text) return null;

  const find = (href: string) => {
    const clean = href.replace(/^\.?\//, "").split("?")[0];
    return [...project.files.values()].find(
      (f) => f.path === clean || f.path.endsWith(`/${clean}`),
    );
  };

  let doc = html.text;
  /* inline the stylesheets the document links, from the dropped files */
  doc = doc.replace(
    /<link[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*>/gi,
    (tag, href: string) => {
      const css = find(href);
      return css?.text ? `<style>${css.text}</style>` : tag;
    },
  );
  /* inline the scripts we actually hold; drop the ones we do not, so the
     sandbox never fetches against the wrong origin */
  doc = doc.replace(
    /<script[^>]*\bsrc=["']([^"']+)["'][^>]*>\s*<\/script>/gi,
    (_tag, src: string) => {
      const js = find(src);
      return js?.text ? `<script>${js.text.replace(/<\/script/gi, "<\\/script")}</script>` : "";
    },
  );
  /* images we do not hold become a quiet placeholder instead of a 404 */
  doc = doc.replace(/(<img[^>]*\bsrc=)["']([^"']+)["']/gi, (m, pre: string, src: string) => {
    if (/^(data:|https?:)/i.test(src) || find(src)) return m;
    return `${pre}"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='80'%3E%3Crect width='120' height='80' fill='%23e5e2de'/%3E%3C/svg%3E"`;
  });
  if (extraCss) {
    doc = doc.includes("</head>")
      ? doc.replace("</head>", `<style>${extraCss}</style></head>`)
      : `${doc}<style>${extraCss}</style>`;
  }
  return doc;
}

function RealPreview({ project }: { project: AnalyzedProject }) {
  const { styleId, comfort, go } = useStore();
  const style = styleCatalog.find((s) => s.id === styleId) ?? styleCatalog[0];

  const before = useMemo(() => buildSrcDoc(project), [project]);
  const after = useMemo(
    () =>
      buildSrcDoc(
        project,
        transformCss({
          ink: style.ink,
          paper: style.dark ? "#101014" : "#fbfaf8",
          accent: style.accent,
          radius: style.radius,
          fontStack:
            '"SF Pro Display", -apple-system, "Inter", "Segoe UI", Roboto, sans-serif',
          scale: comfort ? 1.2 : 1,
        }),
      ),
    [project, style, comfort],
  );

  if (!before) {
    return (
      <div className="card card-pad" style={{ marginTop: 28 }}>
        <p style={{ fontSize: 14.5, lineHeight: 1.6, maxWidth: 560 }}>
          No HTML page arrived, so there is nothing to render live. The
          examination still measured every file; the findings desk has the
          results.
        </p>
        <button className="pill pill-sm" style={{ marginTop: 14 }} onClick={() => go("findings")}>
          To the findings
        </button>
      </div>
    );
  }

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 28 }}>
        <div>
          <div className="section-label">As it arrived</div>
          <iframe
            title="Before"
            className="preview-frame"
            sandbox="allow-scripts"
            srcDoc={before}
          />
        </div>
        <div>
          <div className="section-label">Wearing {style.name}</div>
          <iframe
            title="After"
            className="preview-frame"
            sandbox="allow-scripts"
            srcDoc={after ?? before}
          />
        </div>
      </div>
      <p style={{ fontSize: 12, color: "var(--gray-small)", marginTop: 12, maxWidth: 640 }}>
        Both frames are your real page, live and scrollable. The right one
        carries the {style.name} token layer: type, color, radius, shadows.
        Structural repairs come from the findings you accept, not from a
        reskin.
      </p>
    </>
  );
}

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
  const { transformAccepted, acceptTransform, go, project } = useStore();

  return (
    <Page wide>
      <h1 className="statement statement-page">
        Same app. <span className="quiet">Two futures.</span>
      </h1>

      {project ? <RealPreview project={project} /> : <ExamplePreview />}

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
