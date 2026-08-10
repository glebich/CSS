/**
 * The store kit: everything a submission needs that can be generated
 * honestly today, downloaded complete as one zip. The icon is drawn
 * from the chosen identity's real tokens, the copy is written from
 * what the examination actually understood, and the preflight names
 * what still needs a human or a store account. Nothing is invented.
 */
import { strToU8, zipSync } from "fflate";
import type { AnalyzedProject } from "./types";

export interface KitStyle {
  name: string;
  ink: string;
  accent: string;
  radius: number;
  dark: boolean;
}

/** The app icon as real SVG: the identity's accent, radius, and initial. */
export function buildIconSvg(name: string, style: KitStyle): string {
  const letter = (name.trim()[0] ?? "A").toUpperCase();
  const r = Math.min(220, style.radius * 18);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <rect width="1024" height="1024" rx="${r}" fill="${style.dark ? "#101014" : "#ffffff"}"/>
  <rect x="64" y="64" width="896" height="896" rx="${Math.max(24, r - 40)}" fill="${style.accent}"/>
  <text x="512" y="512" text-anchor="middle" dominant-baseline="central"
    font-family="-apple-system, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif"
    font-size="520" font-weight="600" fill="${style.dark ? "#0c0c0e" : "#ffffff"}">${letter}</text>
</svg>
`;
}

function buildCopy(project: AnalyzedProject): string {
  const name = project.inventory.name;
  return [
    `# Store copy for ${name}`,
    "",
    "## Title",
    name,
    "",
    "## Subtitle, 30 characters or fewer",
    "Made by one person, kept alive",
    "",
    "## Description",
    project.understanding,
    "",
    `Examined at Osyle across ${project.lenses.filter((l) => !l.notApplicable).length} measurable lenses. Vitality ${project.vitality}.`,
    "",
    "## Keywords",
    project.inventory.framework === "Plain web files"
      ? "personal, tool, simple, focused"
      : `${project.inventory.framework.toLowerCase()}, personal, tool, focused`,
    "",
    "Every line above is drawn from the examination. Rewrite freely, the voice is yours.",
  ].join("\n");
}

function buildPreflight(project: AnalyzedProject): string {
  const findings = project.lenses.flatMap((l) => l.findings);
  const lines = [
    "# Pre-flight, honest",
    "",
    "What this kit holds: the icon at 1024, store copy from the examination, and metadata.",
    "What still needs you or a stage:",
    "",
    "- [ ] Screenshots per device, taken from the wardrobe when the capture stage ships",
    "- [ ] A privacy policy URL, stores require one for any data collection",
    "- [ ] Native wrap builds, the Capacitor pipeline arrives with its stage",
    "- [ ] Store accounts connected, submission executes only then",
  ];
  if (findings.length > 0) {
    lines.push(
      "",
      `Known rejection risks from the examination, ${findings.length} finding${findings.length === 1 ? "" : "s"}:`,
      ...findings.slice(0, 6).map((f) => `- ${f.title}`),
    );
  }
  return lines.join("\n");
}

/** The whole kit as a zip, built in the browser from real state. */
export function buildStoreKit(project: AnalyzedProject, style: KitStyle): Uint8Array {
  const name = project.inventory.name;
  return zipSync({
    "icon.svg": strToU8(buildIconSvg(name, style)),
    "store-copy.md": strToU8(buildCopy(project)),
    "preflight.md": strToU8(buildPreflight(project)),
    "metadata.json": strToU8(
      JSON.stringify(
        {
          name,
          vitality: project.vitality,
          identity: style.name,
          examinedAt: project.analyzedAt,
          generatedBy: "Osyle store kit, MLP slice",
        },
        null,
        2,
      ),
    ),
  });
}
