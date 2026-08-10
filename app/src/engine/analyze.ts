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

export async function filesFromInput(fileList: File[]): Promise<Map<string, ProjectFile>> {
  const out = new Map<string, ProjectFile>();
  let textBudget = MAX_TEXT_BYTES;

  async function addOne(path: string, bytes: Uint8Array): Promise<void> {
    if (SKIP.test(path) || out.size >= MAX_FILES) return;
    let text: string | null = null;
    if (isTextPath(path) && textBudget > 0) {
      text = strFromU8(bytes.slice(0, Math.min(bytes.length, textBudget)));
      textBudget -= bytes.length;
    }
    out.set(path, { path, text, bytes: bytes.length });
  }

  for (const file of fileList) {
    const rel = (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name;
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
