/**
 * The orchestrator: files in, an examined project out, progress spoken
 * aloud as it actually happens. The Vitality formula is documented and
 * shown to the user: a weighted mean of the lens scores, weights stated.
 */
import { unzipSync, strFromU8 } from "fflate";
import { buildInventory, buildUnderstanding, isTextPath } from "./inventory";
import {
  lensAccessibility,
  lensAttention,
  lensCode,
  lensColor,
  lensPerformance,
  lensPsychology,
  lensSecurity,
  lensTypography,
} from "./lenses";
import type { AnalyzedProject, LensResult, ProgressLine, ProjectFile } from "./types";

/* Honest caps per the spec: 40 files, 5000 KB of text, truncation said aloud. */
const MAX_FILES = 40;
const MAX_TEXT_BYTES = 5000 * 1024;

const SKIP = /(^|\/)(node_modules|\.git|dist|build|\.next|coverage)(\/|$)|\.map$|\.lock$|package-lock\.json$/;

export const VITALITY_WEIGHTS: Array<{ key: string; weight: number }> = [
  { key: "a11y", weight: 0.18 },
  { key: "type", weight: 0.12 },
  { key: "color", weight: 0.1 },
  { key: "attention", weight: 0.14 },
  { key: "psych", weight: 0.16 },
  { key: "code", weight: 0.12 },
  { key: "security", weight: 0.1 },
  { key: "perf", weight: 0.08 },
];

/** A dropped file, optionally carrying the path a folder walk found it at. */
export type DroppedFile = File | { file: File; path: string };

/* Media that can be carried whole: type by extension, size capped and
   said aloud where the cap applies. Audio gets more room than images. */
const MEDIA_TYPES: Array<{ test: RegExp; mime: string; maxBytes: number }> = [
  { test: /\.png$/i, mime: "image/png", maxBytes: 400 * 1024 },
  { test: /\.jpe?g$/i, mime: "image/jpeg", maxBytes: 400 * 1024 },
  { test: /\.gif$/i, mime: "image/gif", maxBytes: 400 * 1024 },
  { test: /\.webp$/i, mime: "image/webp", maxBytes: 400 * 1024 },
  { test: /\.wav$/i, mime: "audio/wav", maxBytes: 1500 * 1024 },
  { test: /\.mp3$/i, mime: "audio/mpeg", maxBytes: 1500 * 1024 },
  { test: /\.ogg$/i, mime: "audio/ogg", maxBytes: 1500 * 1024 },
  { test: /\.m4a$/i, mime: "audio/mp4", maxBytes: 1500 * 1024 },
];

function mediaUri(path: string, bytes: Uint8Array): string | undefined {
  const kind = MEDIA_TYPES.find((m) => m.test.test(path));
  if (!kind || bytes.length > kind.maxBytes) return undefined;
  try {
    let binary = "";
    for (let i = 0; i < bytes.length; i += 0x8000) {
      binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    }
    return `data:${kind.mime};base64,${btoa(binary)}`;
  } catch {
    return undefined;
  }
}

export async function filesFromInput(fileList: DroppedFile[]): Promise<Map<string, ProjectFile>> {
  const out = new Map<string, ProjectFile>();
  let textBudget = MAX_TEXT_BYTES;

  async function addOne(path: string, bytes: Uint8Array): Promise<void> {
    if (SKIP.test(path) || out.size >= MAX_FILES) return;
    let text: string | null = null;
    if (isTextPath(path) && textBudget > 0) {
      text = strFromU8(bytes.slice(0, Math.min(bytes.length, textBudget)));
      textBudget -= bytes.length;
    }
    out.set(path, { path, text, bytes: bytes.length, dataUri: mediaUri(path, bytes) });
  }

  for (const dropped of fileList) {
    const file = dropped instanceof File ? dropped : dropped.file;
    const rel =
      dropped instanceof File
        ? (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name
        : dropped.path;
    if (/\.zip$/i.test(file.name)) {
      const raw = new Uint8Array(await file.arrayBuffer());
      let entries: Record<string, Uint8Array>;
      try {
        entries = unzipSync(raw);
      } catch {
        continue;
      }
      for (const [path, bytes] of Object.entries(entries)) {
        if (path.endsWith("/")) continue;
        await addOne(path, bytes);
      }
    } else {
      await addOne(rel, new Uint8Array(await file.arrayBuffer()));
    }
  }
  return out;
}

export async function analyzeProject(
  name: string,
  files: Map<string, ProjectFile>,
  say: (line: ProgressLine) => void,
  truncated: boolean,
): Promise<AnalyzedProject> {
  const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

  say({ phase: "Reassemble", text: `Reading ${files.size} files` });
  await pause(500);
  const inventory = buildInventory(name, files, truncated);
  say({
    phase: "Reassemble",
    text: `${inventory.framework}, ${inventory.screens.length} screen${inventory.screens.length === 1 ? "" : "s"}, ${inventory.componentCount} component${inventory.componentCount === 1 ? "" : "s"}`,
  });
  if (truncated) {
    say({ phase: "Reassemble", text: `Large project: reading the first ${MAX_FILES} files honestly` });
  }
  await pause(600);

  const understanding = buildUnderstanding(files, inventory);
  say({ phase: "Strategy", text: understanding });
  await pause(700);

  const runners: Array<{ run: (f: typeof files) => LensResult; phase: string }> = [
    { run: lensAccessibility, phase: "Design" },
    { run: lensTypography, phase: "Design" },
    { run: lensColor, phase: "Design" },
    { run: lensAttention, phase: "UX" },
    { run: lensPsychology, phase: "UX" },
    { run: lensCode, phase: "Errors" },
    { run: lensSecurity, phase: "Errors" },
    { run: lensPerformance, phase: "Errors" },
  ];

  const lenses: LensResult[] = [];
  for (const { run, phase } of runners) {
    const result = run(files);
    lenses.push(result);
    const line = result.notApplicable
      ? `${result.name}: ${result.notApplicable}`
      : result.findings.length > 0
        ? `${result.name}: ${result.findings.length} finding${result.findings.length === 1 ? "" : "s"}`
        : `${result.name}: clean`;
    say({ phase, text: line });
    await pause(450);
  }

  const applicable = lenses.filter((l) => !l.notApplicable);
  const weightFor = (key: string) => VITALITY_WEIGHTS.find((w) => w.key === key)?.weight ?? 0.1;
  const totalWeight = applicable.reduce((s, l) => s + weightFor(l.key), 0);
  const vitality = Math.round(
    applicable.reduce((s, l) => s + l.score * weightFor(l.key), 0) / Math.max(0.01, totalWeight),
  );
  const vitalityWhy = `The weighted mean of ${applicable.length} measurable lenses. Weights: ${applicable
    .map((l) => `${l.name} ${Math.round((weightFor(l.key) / totalWeight) * 100)}%`)
    .join(", ")}. Lenses that could not measure are excluded, not guessed.`;

  const findingCount = lenses.reduce((s, l) => s + l.findings.length, 0);
  say({ phase: "Plan", text: `Weighing ${applicable.length} lenses` });
  await pause(500);
  say({
    phase: "Plan",
    text: `Done. Vitality ${vitality}. ${findingCount} finding${findingCount === 1 ? "" : "s"}, each with its evidence.`,
  });

  return {
    inventory,
    lenses,
    vitality,
    vitalityWhy,
    understanding,
    files,
    analyzedAt: new Date().toISOString(),
  };
}

/**
 * Build a self-contained document from a project's files: linked
 * stylesheets inlined, held scripts inlined, missing assets quieted.
 * Serves both the Report's live frames and the resident's address.
 */
export function buildSrcDoc(
  files: Map<string, ProjectFile>,
  extraCss?: string,
): string | null {
  const all = [...files.values()];
  const html =
    all.find((f) => /(^|\/)index\.html?$/i.test(f.path) && f.text) ??
    all.find((f) => /\.html?$/i.test(f.path) && f.text);
  if (!html?.text) return null;
  const find = (href: string) => {
    const clean = href.replace(/^\.?\//, "").split("?")[0];
    return all.find((f) => f.path === clean || f.path.endsWith(`/${clean}`));
  };
  let doc = html.text;
  doc = doc.replace(
    /<link[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*>/gi,
    (tag, href: string) => {
      const css = find(href);
      return css?.text ? `<style>${css.text}</style>` : tag;
    },
  );
  doc = doc.replace(
    /<script[^>]*\bsrc=["']([^"']+)["'][^>]*>\s*<\/script>/gi,
    (_tag, src: string) => {
      const js = find(src);
      return js?.text ? `<script>${js.text.replace(/<\/script/gi, "<\\/script")}</script>` : "";
    },
  );
  /* media the intake carried whole plays and shows in the served page;
     svg travels as its own text; anything missing gets a quiet stand-in */
  const carried = (src: string): string | null => {
    const f = find(src);
    if (f?.dataUri) return f.dataUri;
    if (f?.text && /\.svg$/i.test(f.path)) {
      return `data:image/svg+xml;utf8,${encodeURIComponent(f.text)}`;
    }
    return null;
  };
  doc = doc.replace(/(<img[^>]*\bsrc=)["']([^"']+)["']/gi, (m, pre: string, src: string) => {
    if (/^(data:|https?:)/i.test(src)) return m;
    const uri = carried(src);
    if (uri) return `${pre}"${uri}"`;
    if (find(src)) return m;
    return `${pre}"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='80'%3E%3Crect width='120' height='80' fill='%23e5e2de'/%3E%3C/svg%3E"`;
  });
  doc = doc.replace(
    /(<(?:audio|video|source)[^>]*\bsrc=)["']([^"']+)["']/gi,
    (m, pre: string, src: string) => {
      if (/^(data:|https?:)/i.test(src)) return m;
      const uri = carried(src);
      return uri ? `${pre}"${uri}"` : m;
    },
  );
  if (extraCss) {
    doc = doc.includes("</head>")
      ? doc.replace("</head>", `<style>${extraCss}</style></head>`)
      : `${doc}<style>${extraCss}</style>`;
  }
  return doc;
}

/** The style-token transform for the live preview: real CSS, honestly scoped. */
export function transformCss(tokens: {
  ink: string;
  paper: string;
  accent: string;
  radius: number;
  fontStack: string;
  scale: number;
}): string {
  return `/* Osyle style tokens, applied over the original stylesheet.
   This is the token layer of the transform: type, color, radius,
   shadows. Structural repairs come from accepted findings. */
:root { color-scheme: light dark; }
body {
  font-family: ${tokens.fontStack} !important;
  background: ${tokens.paper} !important;
  color: ${tokens.ink} !important;
  font-size: ${Math.round(16 * tokens.scale)}px !important;
  line-height: ${tokens.scale > 1 ? 1.7 : 1.55} !important;
}
h1, h2, h3, h4, h5, h6, p, li, td, th, label, span, div { color: inherit; }
button, [role="button"], input[type="submit"], .btn, .button {
  background: ${tokens.accent} !important;
  color: ${tokens.paper} !important;
  border: none !important;
  border-radius: ${tokens.radius}px !important;
  box-shadow: none !important;
  font-family: inherit !important;
}
input, select, textarea {
  border-radius: ${Math.max(4, tokens.radius - 4)}px !important;
  font-family: inherit !important;
}
img, video { max-width: 100%; }
* { text-shadow: none !important; }
div, section, article, aside, nav, header, footer {
  box-shadow: none !important;
}
`;
}
