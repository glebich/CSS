/**
 * The lens analyzers. Each one measures the project's actual bytes and
 * returns findings with file and line evidence, a score with its
 * formula stated, and the research or standard the check rests on.
 * A lens that cannot see enough says not applicable, honestly.
 */
import { contrastRatio, hue, parseColor } from "./color";
import { eachMatch } from "./inventory";
import type { Evidence, LensResult, ProjectFile, RealFinding, RealStrength } from "./types";

type Files = Map<string, ProjectFile>;

let seq = 0;
function fid(): string {
  seq += 1;
  return `rf-${seq}`;
}

function textFiles(files: Files, re: RegExp): ProjectFile[] {
  return [...files.values()].filter((f) => f.text !== null && re.test(f.path));
}

function clamp(n: number): number {
  return Math.max(5, Math.min(98, Math.round(n)));
}

/* ------------------------------------------------ contrast and a11y */

export function lensAccessibility(files: Files): LensResult {
  const findings: RealFinding[] = [];
  const strengths: RealStrength[] = [];
  const css = textFiles(files, /\.(css|scss|less)$/i);
  const markup = textFiles(files, /\.(html?|[jt]sx)$/i);
  if (css.length + markup.length === 0) {
    return {
      key: "a11y",
      name: "Accessibility and contrast",
      score: 50,
      scoreWhy: "No stylesheets or markup to measure.",
      findings,
      strengths,
      notApplicable: "This project carries no CSS or markup this lens can read.",
    };
  }

  /* Declared color pairs inside one rule: real WCAG 2.1 contrast math. */
  const weakPairs: Evidence[] = [];
  for (const f of css) {
    eachMatch(/\{[^}]*\}/g, f.text!, (rule, line) => {
      const body = rule[0];
      const fg = body.match(/[^-]color\s*:\s*([^;}{]+)/)?.[1];
      const bg = body.match(/background(?:-color)?\s*:\s*([^;}{]+)/)?.[1];
      if (!fg || !bg) return;
      const a = parseColor(fg);
      const b = parseColor(bg);
      if (!a || !b) return;
      const ratio = contrastRatio(a, b);
      if (ratio < 4.5) {
        weakPairs.push({
          file: f.path,
          line,
          value: `${fg.trim()} on ${bg.trim()} measures ${ratio.toFixed(1)} to 1`,
        });
      }
    });
  }
  if (weakPairs.length > 0) {
    findings.push({
      id: fid(),
      lens: "a11y",
      title: `${weakPairs.length} declared color pair${weakPairs.length === 1 ? "" : "s"} below the AA floor`,
      detail: "Text set in these rules measures under 4.5 to 1 against its own declared background.",
      severity: "high",
      evidence: weakPairs.slice(0, 6),
      grounding: "WCAG 2.1, success criterion 1.4.3: body text needs 4.5 to 1.",
      methodNote: "Measured on pairs declared inside one rule; inherited backgrounds are not resolved.",
    });
  }

  const noAlt: Evidence[] = [];
  for (const f of markup) {
    eachMatch(/<img\b(?![^>]*\balt\s*=)[^>]*>/gi, f.text!, (m, line) => {
      noAlt.push({ file: f.path, line, value: m[0].slice(0, 60) });
    });
  }
  if (noAlt.length > 0) {
    findings.push({
      id: fid(),
      lens: "a11y",
      title: `${noAlt.length} image${noAlt.length === 1 ? "" : "s"} without alt text`,
      detail: "A screen reader has nothing to say for these.",
      severity: "medium",
      evidence: noAlt.slice(0, 6),
      grounding: "WCAG 2.1, success criterion 1.1.1: non-text content needs a text alternative.",
    });
  }

  const tinyType: Evidence[] = [];
  for (const f of css) {
    eachMatch(/font-size\s*:\s*(\d+(?:\.\d+)?)px/gi, f.text!, (m, line) => {
      if (Number(m[1]) < 12) tinyType.push({ file: f.path, line, value: `${m[1]}px` });
    });
  }
  if (tinyType.length > 0) {
    findings.push({
      id: fid(),
      lens: "a11y",
      title: `Type declared below 12px, ${tinyType.length} time${tinyType.length === 1 ? "" : "s"}`,
      detail: "Under 12px, reading slows and error rates climb, especially outdoors and over 40.",
      severity: "low",
      evidence: tinyType.slice(0, 6),
      grounding: "Legibility research and every platform HIG set 11 to 12px as the floor.",
    });
  }

  if (findings.length === 0) {
    strengths.push({
      id: fid(),
      lens: "a11y",
      title: "Nothing measurable fails the floors",
      detail: "Declared color pairs, alt text, and type sizes all pass the checks this lens can run.",
    });
  }
  const score = clamp(95 - weakPairs.length * 9 - noAlt.length * 4 - tinyType.length * 2);
  return {
    key: "a11y",
    name: "Accessibility and contrast",
    score,
    scoreWhy: `95, minus 9 per weak pair (${weakPairs.length}), 4 per missing alt (${noAlt.length}), 2 per tiny type (${tinyType.length}).`,
    findings,
    strengths,
  };
}

/* ------------------------------------------------------- typography */

export function lensTypography(files: Files): LensResult {
  const css = textFiles(files, /\.(css|scss|less|html?)$/i);
  const js = textFiles(files, /\.([jt]sx?|vue|svelte)$/i);
  const findings: RealFinding[] = [];
  const strengths: RealStrength[] = [];
  if (css.length + js.length === 0) {
    return {
      key: "type",
      name: "Typography",
      score: 50,
      scoreWhy: "No stylesheets to measure.",
      findings,
      strengths,
      notApplicable: "No stylesheets or components arrived; typography cannot be measured.",
    };
  }
  const families = new Set<string>();
  const sizes = new Set<string>();
  const familyEvidence: Evidence[] = [];
  for (const f of css) {
    eachMatch(/font-family\s*:\s*([^;}{]+)/gi, f.text!, (m, line) => {
      const fam = m[1].split(",")[0].trim().replace(/["']/g, "").toLowerCase();
      if (!families.has(fam)) familyEvidence.push({ file: f.path, line, value: fam });
      families.add(fam);
    });
    eachMatch(/font-size\s*:\s*([\d.]+(?:px|rem|em|pt))/gi, f.text!, (m) => {
      sizes.add(m[1]);
    });
  }
  /* styling written in JS counts too: inline styles and styled strings */
  for (const f of js) {
    eachMatch(/fontFamily\s*:\s*["']([^"']+)["']/g, f.text!, (m, line) => {
      const fam = m[1].split(",")[0].trim().toLowerCase();
      if (!families.has(fam)) familyEvidence.push({ file: f.path, line, value: fam });
      families.add(fam);
    });
    eachMatch(/fontSize\s*:\s*["']?(\d+(?:\.\d+)?)(px|rem|em)?/g, f.text!, (m) => {
      sizes.add(`${m[1]}${m[2] ?? "px"}`);
    });
    eachMatch(/font-size\s*:\s*([\d.]+(?:px|rem|em|pt))/gi, f.text!, (m) => {
      sizes.add(m[1]);
    });
  }
  if (families.size > 2) {
    findings.push({
      id: fid(),
      lens: "type",
      title: `${families.size} typefaces where one or two would hold`,
      detail: "Each additional family fragments the voice and adds load weight.",
      severity: "medium",
      evidence: familyEvidence.slice(0, 6),
      grounding: "Typographic practice since Bringhurst: one family, two at most, roles by weight and size.",
    });
  }
  if (sizes.size > 9) {
    findings.push({
      id: fid(),
      lens: "type",
      title: `${sizes.size} distinct font sizes, no ramp survives that`,
      detail: "A deliberate scale has 5 to 8 steps; this many sizes means sizes were picked ad hoc.",
      severity: "medium",
      evidence: [{ file: (css[0] ?? js[0]).path, value: [...sizes].slice(0, 10).join(", ") }],
      grounding: "Modular scale practice; consistent ramps measurably improve scanability.",
    });
  }
  if (families.size <= 2 && sizes.size <= 9 && sizes.size > 0) {
    strengths.push({
      id: fid(),
      lens: "type",
      title: "The type system is disciplined",
      detail: `${families.size} famil${families.size === 1 ? "y" : "ies"}, ${sizes.size} sizes. That is a ramp, not an accident.`,
    });
  }
  const score = clamp(92 - Math.max(0, families.size - 2) * 10 - Math.max(0, sizes.size - 9) * 3);
  return {
    key: "type",
    name: "Typography",
    score,
    scoreWhy: `92, minus 10 per family beyond two (${families.size} found), 3 per size beyond nine (${sizes.size} found).`,
    findings,
    strengths,
  };
}

/* ------------------------------------------------- color discipline */

export function lensColor(files: Files): LensResult {
  const css = textFiles(files, /\.(css|scss|less|html?|[jt]sx?|vue|svelte)$/i);
  const findings: RealFinding[] = [];
  const strengths: RealStrength[] = [];
  if (css.length === 0) {
    return {
      key: "color",
      name: "Color discipline",
      score: 50,
      scoreWhy: "No stylesheets to measure.",
      findings,
      strengths,
      notApplicable: "No stylesheets or markup arrived; color cannot be measured.",
    };
  }
  const colors = new Map<string, Evidence>();
  for (const f of css) {
    eachMatch(/#(?:[0-9a-f]{6}|[0-9a-f]{3})\b|rgba?\([^)]+\)/gi, f.text!, (m, line) => {
      const key = m[0].toLowerCase();
      if (!colors.has(key)) colors.set(key, { file: f.path, line, value: key });
    });
  }
  /* near-duplicate accents: same hue family within 18 degrees */
  const hues: Array<{ h: number; ev: Evidence }> = [];
  for (const [raw, ev] of colors) {
    const c = parseColor(raw);
    if (!c) continue;
    const max = Math.max(c.r, c.g, c.b);
    const min = Math.min(c.r, c.g, c.b);
    if (max - min < 40) continue; /* grays are not accents */
    hues.push({ h: hue(c), ev });
  }
  const clusters = new Map<number, Evidence[]>();
  for (const { h, ev } of hues) {
    const bucket = Math.round(h / 18);
    clusters.set(bucket, [...(clusters.get(bucket) ?? []), ev]);
  }
  const dupes = [...clusters.values()].filter((c) => c.length >= 3);
  if (dupes.length > 0) {
    findings.push({
      id: fid(),
      lens: "color",
      title: `${dupes[0].length} near-identical accents in one hue family`,
      detail: "Several colors doing one color's job reads as drift, not palette.",
      severity: "medium",
      evidence: dupes[0].slice(0, 6),
      grounding: "Palette practice: one accent per role; near-duplicates signal unmanaged tokens.",
    });
  }
  if (colors.size > 24) {
    findings.push({
      id: fid(),
      lens: "color",
      title: `${colors.size} distinct colors declared`,
      detail: "A held palette runs 8 to 16 values including neutrals; past 24 nothing is a decision.",
      severity: "low",
      evidence: [...colors.values()].slice(0, 6),
      grounding: "Design-token practice across mature systems (Material, Polaris, HIG).",
    });
  }
  if (findings.length === 0) {
    strengths.push({
      id: fid(),
      lens: "color",
      title: "The palette is held",
      detail: `${colors.size} declared colors, no accent family duplicated. Restraint is visible.`,
    });
  }
  const score = clamp(92 - dupes.length * 12 - Math.max(0, colors.size - 24) * 2);
  return {
    key: "color",
    name: "Color discipline",
    score,
    scoreWhy: `92, minus 12 per duplicated accent family (${dupes.length}), 2 per color beyond 24 (${colors.size} found).`,
    findings,
    strengths,
  };
}

/* ------------------------------------------------ attention and UX */

export function lensAttention(files: Files): LensResult {
  const screens = textFiles(files, /\.(html?|[jt]sx)$/i);
  const findings: RealFinding[] = [];
  const strengths: RealStrength[] = [];
  if (screens.length === 0) {
    return {
      key: "attention",
      name: "Attention and choice",
      score: 50,
      scoreWhy: "No screens to measure.",
      findings,
      strengths,
      notApplicable: "No markup arrived; choice load cannot be counted.",
    };
  }
  let worst: { file: string; count: number } | null = null;
  for (const f of screens) {
    const count =
      (f.text!.match(/<button\b/gi) ?? []).length +
      (f.text!.match(/onClick\s*=/g) ?? []).length / 2;
    if (!worst || count > worst.count) worst = { file: f.path, count: Math.round(count) };
  }
  if (worst && worst.count > 7) {
    findings.push({
      id: fid(),
      lens: "attention",
      title: `${worst.count} competing actions on one screen`,
      detail: "Decision time grows with the log of choices; past seven, people stall or leave.",
      severity: worst.count > 12 ? "high" : "medium",
      evidence: [{ file: worst.file, value: `${worst.count} buttons and click handlers` }],
      grounding: "Hick's law (Hick 1952); Nielsen's heuristic of minimalist design.",
      methodNote: "Counted from static markup; runtime-hidden controls are counted too.",
    });
  } else if (worst) {
    strengths.push({
      id: fid(),
      lens: "attention",
      title: "Screens keep the choice load humane",
      detail: `The busiest screen carries ${worst.count} actions, inside the range people handle without stalling.`,
    });
  }
  const score = clamp(worst ? 95 - Math.max(0, worst.count - 7) * 5 : 60);
  return {
    key: "attention",
    name: "Attention and choice",
    score,
    scoreWhy: `95, minus 5 per action beyond seven on the busiest screen (${worst?.count ?? 0} found).`,
    findings,
    strengths,
  };
}

/* --------------------------------------------- psychology, honesty */

const DARK_TERMS: Array<{ re: RegExp; kind: string }> = [
  { re: /only\s+\d+\s+left/gi, kind: "false scarcity" },
  { re: /last\s+chance/gi, kind: "urgency pressure" },
  { re: /don.?t\s+miss\s+out/gi, kind: "urgency pressure" },
  { re: /you\s+(broke|lost|ruined)\s+your\s+streak/gi, kind: "guilt mechanic" },
  { re: /hurry|act\s+now|expires\s+soon/gi, kind: "urgency pressure" },
  { re: /\bno,?\s+i\s+(don.?t|do\s+not)\s+want\b/gi, kind: "confirmshaming" },
];

export function lensPsychology(files: Files): LensResult {
  const screens = textFiles(files, /\.(html?|[jt]sx?|vue|svelte)$/i);
  const findings: RealFinding[] = [];
  const strengths: RealStrength[] = [];
  const hits: Array<Evidence & { kind: string }> = [];
  for (const f of screens) {
    for (const term of DARK_TERMS) {
      eachMatch(term.re, f.text!, (m, line) => {
        hits.push({ file: f.path, line, value: m[0], kind: term.kind });
      });
    }
  }
  if (hits.length > 0) {
    findings.push({
      id: fid(),
      lens: "psych",
      title: `${hits.length} manipulation pattern${hits.length === 1 ? "" : "s"} in the copy`,
      detail: `Found ${[...new Set(hits.map((h) => h.kind))].join(", ")}. These convert short term and corrode trust long term.`,
      severity: "high",
      evidence: hits.slice(0, 6),
      grounding: "Deceptive-pattern taxonomy (Brignull 2010; Mathur et al. 2019, 11k-site crawl); FTC enforcement on dark patterns.",
    });
  } else {
    strengths.push({
      id: fid(),
      lens: "psych",
      title: "No manipulation in the copy",
      detail: "No scarcity theater, no guilt mechanics, no confirmshaming in any scanned string. Rarer than it should be.",
    });
  }
  const score = clamp(96 - hits.length * 12);
  return {
    key: "psych",
    name: "Psychology and honesty",
    score,
    scoreWhy: `96, minus 12 per manipulation pattern found (${hits.length}).`,
    findings,
    strengths,
  };
}

/* ----------------------------------------------------- code health */

export function lensCode(files: Files): LensResult {
  const code = textFiles(files, /\.([jt]sx?|mjs|cjs|vue|svelte)$/i);
  const findings: RealFinding[] = [];
  const strengths: RealStrength[] = [];
  if (code.length === 0) {
    return {
      key: "code",
      name: "Code health",
      score: 50,
      scoreWhy: "No scripts to measure.",
      findings,
      strengths,
      notApplicable: "No JavaScript or TypeScript arrived.",
    };
  }
  const logs: Evidence[] = [];
  const todos: Evidence[] = [];
  const longFiles: Evidence[] = [];
  for (const f of code) {
    eachMatch(/console\.(log|debug)\(/g, f.text!, (m, line) =>
      logs.push({ file: f.path, line, value: m[0] }),
    );
    eachMatch(/(TODO|FIXME|HACK)\b/g, f.text!, (m, line) =>
      todos.push({ file: f.path, line, value: m[0] }),
    );
    const lines = f.text!.split("\n").length;
    if (lines > 400) longFiles.push({ file: f.path, value: `${lines} lines` });
  }
  if (logs.length > 3) {
    findings.push({
      id: fid(),
      lens: "code",
      title: `${logs.length} console.log calls left in`,
      detail: "Debug prints in production leak state and slow hot paths.",
      severity: "low",
      evidence: logs.slice(0, 6),
      grounding: "Standard lint policy (no-console) across major style guides.",
    });
  }
  if (todos.length > 0) {
    findings.push({
      id: fid(),
      lens: "code",
      title: `${todos.length} TODO or FIXME marker${todos.length === 1 ? "" : "s"} waiting`,
      detail: "Each one is a decision deferred into the dark.",
      severity: "low",
      evidence: todos.slice(0, 6),
      grounding: "Self-admitted technical debt correlates with defect density (Potdar and Shihab 2014).",
    });
  }
  if (longFiles.length > 0) {
    findings.push({
      id: fid(),
      lens: "code",
      title: `${longFiles.length} file${longFiles.length === 1 ? "" : "s"} past 400 lines`,
      detail: "Long files hide coupling; change risk rises with size.",
      severity: "medium",
      evidence: longFiles.slice(0, 6),
      grounding: "File size correlates with defect proneness across large-scale studies.",
    });
  }
  if (findings.length === 0) {
    strengths.push({
      id: fid(),
      lens: "code",
      title: "The code is tidy where this lens can see",
      detail: "No stray debug prints, no deferred-decision markers, no oversized files.",
    });
  }
  const score = clamp(
    92 - Math.max(0, logs.length - 3) * 2 - todos.length * 2 - longFiles.length * 6,
  );
  return {
    key: "code",
    name: "Code health",
    score,
    scoreWhy: `92, minus 2 per stray log beyond three (${logs.length}), 2 per TODO (${todos.length}), 6 per long file (${longFiles.length}).`,
    findings,
    strengths,
  };
}

/* -------------------------------------------------------- security */

const SECRET_PATTERNS: Array<{ re: RegExp; kind: string }> = [
  { re: /sk-ant-[a-zA-Z0-9-]{10,}/g, kind: "Anthropic key" },
  { re: /AIza[0-9A-Za-z_-]{30,}/g, kind: "Google API key" },
  { re: /AKIA[0-9A-Z]{16}/g, kind: "AWS access key" },
  { re: /ghp_[0-9A-Za-z]{30,}/g, kind: "GitHub token" },
  { re: /eyJhbGciOi[0-9A-Za-z_-]{20,}/g, kind: "signed JWT" },
];

export function lensSecurity(files: Files): LensResult {
  const code = textFiles(files, /\.([jt]sx?|mjs|cjs|json|html?|env)$/i);
  const findings: RealFinding[] = [];
  const strengths: RealStrength[] = [];
  const secrets: Array<Evidence & { kind: string }> = [];
  const evals: Evidence[] = [];
  const rawHtml: Evidence[] = [];
  for (const f of code) {
    for (const p of SECRET_PATTERNS) {
      eachMatch(p.re, f.text!, (m, line) =>
        secrets.push({ file: f.path, line, value: `${p.kind}: ${m[0].slice(0, 14)}...`, kind: p.kind }),
      );
    }
    eachMatch(/\beval\s*\(|new\s+Function\s*\(/g, f.text!, (m, line) =>
      evals.push({ file: f.path, line, value: m[0] }),
    );
    eachMatch(/dangerouslySetInnerHTML|\.innerHTML\s*=/g, f.text!, (m, line) =>
      rawHtml.push({ file: f.path, line, value: m[0] }),
    );
  }
  if (secrets.length > 0) {
    findings.push({
      id: fid(),
      lens: "security",
      title: `${secrets.length} credential${secrets.length === 1 ? "" : "s"} committed in the code`,
      detail: "Anything shipped to a browser is public. These keys are burned the moment this deploys.",
      severity: "high",
      evidence: secrets.slice(0, 6),
      grounding: "OWASP Top 10 A05, secrets in source; every provider's key policy.",
    });
  }
  if (evals.length > 0) {
    findings.push({
      id: fid(),
      lens: "security",
      title: `eval or Function constructor used ${evals.length} time${evals.length === 1 ? "" : "s"}`,
      detail: "String-to-code execution defeats CSP and invites injection.",
      severity: "medium",
      evidence: evals.slice(0, 6),
      grounding: "OWASP A03 injection guidance; CSP best practice forbids unsafe-eval.",
    });
  }
  if (rawHtml.length > 0) {
    findings.push({
      id: fid(),
      lens: "security",
      title: `Raw HTML injection in ${rawHtml.length} place${rawHtml.length === 1 ? "" : "s"}`,
      detail: "innerHTML with unsanitized input is the classic XSS door.",
      severity: "medium",
      evidence: rawHtml.slice(0, 6),
      grounding: "OWASP XSS prevention cheat sheet.",
    });
  }
  if (findings.length === 0) {
    strengths.push({
      id: fid(),
      lens: "security",
      title: "Nothing dangerous where this lens can see",
      detail: "No committed credentials, no string-to-code execution, no raw HTML injection.",
    });
  }
  const score = clamp(96 - secrets.length * 20 - evals.length * 8 - rawHtml.length * 6);
  return {
    key: "security",
    name: "Security",
    score,
    scoreWhy: `96, minus 20 per committed credential (${secrets.length}), 8 per eval (${evals.length}), 6 per raw HTML injection (${rawHtml.length}).`,
    findings,
    strengths,
  };
}

/* ------------------------------------------------------ performance */

export function lensPerformance(files: Files): LensResult {
  const findings: RealFinding[] = [];
  const strengths: RealStrength[] = [];
  const all = [...files.values()];
  const totalKb = Math.round(all.reduce((s, f) => s + f.bytes, 0) / 1024);
  const scripts = all.filter((f) => /\.([jt]sx?|mjs|cjs)$/i.test(f.path));
  const scriptKb = Math.round(scripts.reduce((s, f) => s + f.bytes, 0) / 1024);
  const bigImages = all.filter(
    (f) => /\.(png|jpe?g|gif|webp)$/i.test(f.path) && f.bytes > 400 * 1024,
  );
  if (scriptKb > 300) {
    findings.push({
      id: fid(),
      lens: "perf",
      title: `${scriptKb} KB of script source`,
      detail: "Script weight is the strongest single predictor of slow interactivity on mid-range phones.",
      severity: scriptKb > 900 ? "high" : "medium",
      evidence: [{ file: "project", value: `${scripts.length} script files, ${scriptKb} KB` }],
      grounding: "Core Web Vitals guidance; the 2019 median mobile page already shipped too much JS (HTTP Archive).",
      methodNote: "Source size, not the minified bundle; treat as an upper bound.",
    });
  }
  for (const img of bigImages.slice(0, 4)) {
    findings.push({
      id: fid(),
      lens: "perf",
      title: `${img.path.split("/").pop()} weighs ${Math.round(img.bytes / 1024)} KB`,
      detail: "One image this size can outweigh the entire code of the page.",
      severity: "medium",
      evidence: [{ file: img.path, value: `${Math.round(img.bytes / 1024)} KB` }],
      grounding: "LCP optimization guidance: compress, resize, and lazy-load below-fold media.",
    });
  }
  if (findings.length === 0) {
    strengths.push({
      id: fid(),
      lens: "perf",
      title: "The project travels light",
      detail: `${totalKb} KB in total, ${scriptKb} KB of it script. Nothing here fights the network.`,
    });
  }
  const score = clamp(95 - Math.max(0, scriptKb - 300) / 20 - bigImages.length * 8);
  return {
    key: "perf",
    name: "Performance weight",
    score,
    scoreWhy: `95, minus 1 per 20 KB of script beyond 300 (${scriptKb} KB found), 8 per oversized image (${bigImages.length}).`,
    findings,
    strengths,
  };
}
