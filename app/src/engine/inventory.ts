/**
 * The inventory: what the project actually is, measured. Framework from
 * package.json dependencies, screens from html files and route patterns,
 * components counted from real definitions.
 */
import type { Inventory, ProjectFile } from "./types";

const TEXT_EXT = /\.(html?|css|scss|less|[jt]sx?|mjs|cjs|json|md|txt|svg|vue|svelte)$/i;

export function isTextPath(path: string): boolean {
  return TEXT_EXT.test(path);
}

export function lineOf(text: string, index: number): number {
  return text.slice(0, index).split("\n").length;
}

export function eachMatch(
  re: RegExp,
  text: string,
  cb: (m: RegExpExecArray, line: number) => void,
): void {
  const rx = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g");
  let m: RegExpExecArray | null;
  while ((m = rx.exec(text)) !== null) {
    cb(m, lineOf(text, m.index));
    if (m.index === rx.lastIndex) rx.lastIndex += 1;
  }
}

export function buildInventory(
  name: string,
  files: Map<string, ProjectFile>,
  truncated: boolean,
): Inventory {
  let framework = "plain web";
  const pkg = [...files.values()].find((f) => f.path.endsWith("package.json") && f.text);
  if (pkg?.text) {
    try {
      const json = JSON.parse(pkg.text) as {
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
      };
      const deps = { ...json.dependencies, ...json.devDependencies };
      if (deps["react"]) framework = "React";
      else if (deps["vue"]) framework = "Vue";
      else if (deps["svelte"]) framework = "Svelte";
      else if (deps["next"]) framework = "Next.js";
    } catch {
      /* an unreadable package.json is itself a finding elsewhere */
    }
  }

  const screens: string[] = [];
  for (const f of files.values()) {
    if (/\.html?$/i.test(f.path)) screens.push(f.path);
    /* route-shaped component files count as screens too */
    if (/(pages?|screens?|routes?|views?)\//i.test(f.path) && /\.[jt]sx?$/.test(f.path)) {
      screens.push(f.path);
    }
  }

  let componentCount = 0;
  for (const f of files.values()) {
    if (!f.text || !/\.[jt]sx?$/.test(f.path)) continue;
    componentCount += (
      f.text.match(/export\s+(default\s+)?(function|const)\s+[A-Z]\w*/g) ?? []
    ).length;
  }

  const totalBytes = [...files.values()].reduce((sum, f) => sum + f.bytes, 0);
  const textFileCount = [...files.values()].filter((f) => f.text !== null).length;

  return {
    name,
    fileCount: files.size,
    textFileCount,
    totalBytes,
    framework,
    screens: [...new Set(screens)].slice(0, 12),
    componentCount,
    truncated,
  };
}

/**
 * One honest sentence of understanding, built only from what the
 * project says about itself: README, package description, html title.
 */
export function buildUnderstanding(files: Map<string, ProjectFile>, inv: Inventory): string {
  const readme = [...files.values()].find((f) => /readme\.md$/i.test(f.path) && f.text);
  if (readme?.text) {
    const para = readme.text
      .split("\n")
      .map((l) => l.trim())
      .find((l) => l.length > 40 && !l.startsWith("#") && !l.startsWith("!") && !l.startsWith("["));
    if (para) return `In its own words: ${para.slice(0, 220)}`;
  }
  const pkg = [...files.values()].find((f) => f.path.endsWith("package.json") && f.text);
  if (pkg?.text) {
    try {
      const description = (JSON.parse(pkg.text) as { description?: string }).description;
      if (description) return `In its own words: ${description.slice(0, 220)}`;
    } catch {
      /* fall through */
    }
  }
  const html = [...files.values()].find((f) => /\.html?$/i.test(f.path) && f.text);
  const title = html?.text?.match(/<title>([^<]{3,120})<\/title>/i)?.[1];
  if (title) return `The page calls itself ${title.trim()}.`;
  return `A ${inv.framework} project of ${inv.fileCount} files. It does not yet say what it is for; that is a finding in itself.`;
}
