/**
 * The shareable Report Card: the brand surface as a real PNG, drawn
 * on a canvas from real state only. Near-black, the violet glow, the
 * letterspaced wordmark, the Vitality numeral, one striking finding,
 * and the address. The percentile waits for the network's density
 * and is not invented.
 */
import type { AnalyzedProject } from "./types";

export async function drawReportCard(
  project: AnalyzedProject,
  slug: string | null,
): Promise<Blob | null> {
  const W = 1200;
  const H = 630;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  /* the brand ground */
  ctx.fillStyle = "#0a0a0c";
  ctx.fillRect(0, 0, W, H);

  /* the glow, violet to white, breathing frozen at its widest */
  const glow = ctx.createRadialGradient(W * 0.28, H * 0.5, 20, W * 0.28, H * 0.5, 380);
  glow.addColorStop(0, "rgba(255, 255, 255, 0.85)");
  glow.addColorStop(0.35, "rgba(123, 107, 255, 0.5)");
  glow.addColorStop(0.65, "rgba(123, 107, 255, 0.12)");
  glow.addColorStop(1, "rgba(123, 107, 255, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  const font = (size: number, weight = 500) =>
    `${weight} ${size}px -apple-system, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif`;

  /* the wordmark, letterspaced by hand */
  ctx.fillStyle = "#ffffff";
  ctx.font = font(30, 500);
  const word = "OSYLE";
  let x = 72;
  for (const ch of word) {
    ctx.fillText(ch, x, 96);
    x += ctx.measureText(ch).width + 16;
  }

  /* the resident's name */
  ctx.fillStyle = "rgba(245, 244, 255, 0.85)";
  ctx.font = font(40, 510);
  ctx.fillText(project.inventory.name, 72, 200);

  /* the numeral, the one large truth */
  ctx.fillStyle = "#ffffff";
  ctx.font = font(230, 510);
  ctx.fillText(String(project.vitality), 64, 452);
  ctx.fillStyle = "rgba(245, 244, 255, 0.55)";
  ctx.font = font(20, 510);
  ctx.fillText("V I T A L I T Y", 76, 496);

  /* one striking line: the top finding, or the honest strength */
  const findings = project.lenses.flatMap((l) => l.findings);
  const line =
    findings.length > 0
      ? findings[0].title
      : "The static lenses found nothing below their floors.";
  ctx.fillStyle = "rgba(245, 244, 255, 0.75)";
  ctx.font = font(24, 400);
  ctx.fillText(line.slice(0, 68), 72, 560);

  /* the address, which is the ad */
  ctx.fillStyle = "rgba(245, 244, 255, 0.5)";
  ctx.font = font(19, 500);
  ctx.fillText(slug ? `${slug}.osyle.app` : "Alive at Osyle", 72, 600);

  return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}

/** Growth counts that are real because they count real acts, locally. */
export function bumpGrowth(key: "reportcards" | "invites"): void {
  try {
    const k = `osyle.growth.${key}`;
    localStorage.setItem(k, String(Number(localStorage.getItem(k) ?? "0") + 1));
  } catch {
    /* the act still happened */
  }
}

export function readGrowth(key: "reportcards" | "invites"): number {
  try {
    return Number(localStorage.getItem(`osyle.growth.${key}`) ?? "0");
  } catch {
    return 0;
  }
}
