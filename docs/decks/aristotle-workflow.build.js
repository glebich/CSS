const pptxgen = require("pptxgenjs");
const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE"; // 13.33 x 7.5

const BLUE = "1A4FC4", INK = "1B1F2A", MUTED = "5F6672", TINT = "EEF3FC", BORDER = "CFD6E2", WHITE = "FFFFFF";
const FONT = "Arial";
const s = pres.addSlide();
s.background = { color: WHITE };

// ---- header (matches the source deck's chrome) ----
s.addText("Harmonic", { x: 0.5, y: 0.3, w: 3, h: 0.5, fontFace: FONT, fontSize: 22, bold: true, color: BLUE, margin: 0, isTextBox: true });
s.addText("Workflow", { x: 10.8, y: 0.35, w: 2.05, h: 0.4, fontFace: "Courier New", fontSize: 12, color: MUTED, align: "right", margin: 0, isTextBox: true });
s.addText("Ingest once. Check every change.", { x: 0.5, y: 0.85, w: 12, h: 0.5, fontFace: FONT, fontSize: 24, bold: true, color: INK, margin: 0, isTextBox: true });

// ---- geometry ----
const R1 = 2.15, R2 = 3.75, BH = 1.05;          // block rows and height
const P1 = { x: 0.5, w: 2.9 }, P2 = { x: 4.1, w: 4.9 }, P3 = { x: 9.7, w: 3.15 };
const HALF = 2.15, GAP = P2.w - 2 * HALF;        // P2 split into two half-blocks
const STAT_Y = 5.45, STAT_H = 1.15;

function phaseHeader(n, text, col) {
  s.addShape(pres.shapes.OVAL, { x: col.x, y: 1.62, w: 0.3, h: 0.3, fill: { color: BLUE }, line: { color: BLUE, width: 0 } });
  s.addText(String(n), { x: col.x, y: 1.62, w: 0.3, h: 0.3, fontFace: FONT, fontSize: 10, bold: true, color: WHITE, align: "center", valign: "middle", margin: 0, isTextBox: true });
  s.addText(text, { x: col.x + 0.4, y: 1.6, w: col.w - 0.4, h: 0.34, fontFace: FONT, fontSize: 13, bold: true, color: INK, valign: "middle", margin: 0, isTextBox: true });
}

function block(x, y, w, title, sub, dark) {
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x, y, w, h: BH, rectRadius: 0.08,
    fill: { color: dark ? BLUE : WHITE },
    line: { color: dark ? BLUE : BORDER, width: 1 },
    shadow: dark ? undefined : { type: "outer", color: "000000", blur: 4, offset: 1, angle: 90, opacity: 0.08 },
  });
  const runs = [
    { text: title, options: { fontSize: 12.5, bold: true, color: dark ? WHITE : INK, breakLine: true } },
    { text: sub, options: { fontSize: 9.5, color: dark ? "DCE6FA" : MUTED } },
  ];
  s.addText(runs, { x: x + 0.15, y, w: w - 0.3, h: BH, fontFace: FONT, valign: "middle", align: "left", margin: 0, isTextBox: true, paraSpaceAfter: 2 });
}

function arrow(x1, y1, x2, y2, label, labelPos) {
  const opts = { line: { color: BLUE, width: 1.5, endArrowType: "triangle" } };
  if (x1 === x2) { // vertical
    s.addShape(pres.shapes.LINE, { x: x1, y: Math.min(y1, y2), w: 0, h: Math.abs(y2 - y1), flipV: y2 < y1, ...opts });
  } else {         // horizontal
    s.addShape(pres.shapes.LINE, { x: Math.min(x1, x2), y: y1, w: Math.abs(x2 - x1), h: 0, flipH: x2 < x1, ...opts });
  }
  if (label) {
    const lo = { fontFace: FONT, fontSize: 8, color: MUTED, margin: 0, isTextBox: true, valign: "middle" };
    if (x1 === x2) s.addText(label, { x: x1 + 0.08, y: Math.min(y1, y2), w: 0.9, h: Math.abs(y2 - y1), align: "left", ...lo });
    else s.addText(label, { x: Math.min(x1, x2), y: y1 - 0.24, w: Math.abs(x2 - x1), h: 0.2, align: "center", ...lo });
  }
}
function seg(x1, y1, x2, y2) {
  s.addShape(pres.shapes.LINE, { x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1), h: Math.abs(y2 - y1), line: { color: BLUE, width: 1.5 } });
}

// ---- phase 1: ingest ----
phaseHeader(1, "Ingest once", P1);
block(P1.x, R1, P1.w, "Initial RTL design", "Verilog, ~200K gate equivalents. Ingested under the supervision of the engineer who wrote it.", false);
block(P1.x, R2, P1.w, "Aristotle ingests the design", "Generates the key properties it must always hold, in SVA or Lean. E.g. “the ingress / memory tracker never deadlocks.”", true);
arrow(P1.x + P1.w / 2, R1 + BH, P1.x + P1.w / 2, R2);
arrow(P1.x + P1.w, R2 + BH / 2, P2.x, R2 + BH / 2, "properties");

// ---- phase 2: iterate ----
phaseHeader(2, "Iterate on every change", P2);
const HX = P2.x, AX = P2.x + HALF + GAP;
block(HX, R1, HALF, "Humans + coding agents", "Iterate on the design and its properties.", false);
block(AX, R1, HALF, "Aristotle checks every change", "Properties vs. updated code. Results go back to the team.", true);
block(P2.x, R2, P2.w, "Codebase", "Verilog and its properties, versioned side by side.", false);
arrow(HX + HALF / 2, R1 + BH, HX + HALF / 2, R2, "commit");
arrow(AX + HALF / 2, R2, AX + HALF / 2, R1 + BH, "check");
arrow(AX, R1 + BH / 2, HX + HALF, R1 + BH / 2, "results");

// ---- phase 3: verify ----
phaseHeader(3, "Verify continuously", P3);
block(P3.x, R1, P3.w, "Nightly CI", "Re-checks every existing property against the latest code.", false);
block(P3.x, R2, P3.w, "Interactive analysis", "Engineers prove new properties on Aristotle as they design.", false);
const spineX = P2.x + P2.w + 0.35;
seg(P2.x + P2.w, R1 + BH / 2, spineX, R1 + BH / 2);
seg(spineX, R1 + BH / 2, spineX, R2 + BH / 2);
arrow(spineX, R1 + BH / 2, P3.x, R1 + BH / 2);
arrow(spineX, R2 + BH / 2, P3.x, R2 + BH / 2);

// ---- cost tiles ----
function stat(col, big, label) {
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: col.x, y: STAT_Y, w: col.w, h: STAT_H, rectRadius: 0.08, fill: { color: TINT }, line: { color: TINT, width: 0 } });
  s.addText(big, { x: col.x + 0.2, y: STAT_Y + 0.12, w: col.w - 0.4, h: 0.5, fontFace: FONT, fontSize: 26, bold: true, color: BLUE, margin: 0, isTextBox: true, valign: "middle" });
  s.addText(label, { x: col.x + 0.2, y: STAT_Y + 0.64, w: col.w - 0.4, h: 0.45, fontFace: FONT, fontSize: 9.5, color: MUTED, margin: 0, isTextBox: true, valign: "top" });
}
stat(P1, "$100s", "Several hundred dollars, once, to ingest a 200K gate-equivalent design.");
stat(P2, "~$10", "Per check of the properties against updated code. Trending lower over time.");
stat(P3, "$10 – $100", "Per new property analyzed interactively on Aristotle.");

s.addText("Pay once to ingest. Every check after that costs a fraction, and the price keeps falling.", { x: 0.5, y: 6.8, w: 12.35, h: 0.35, fontFace: FONT, fontSize: 11, italic: true, color: MUTED, margin: 0, isTextBox: true });

s.addNotes("Source copy: Initial design is ingested into Aristotle with the supervision of the engineer who wrote the code. This ingestion costs something like several hundred $ for something with 200K gate equivalents. The ingestion also generates key properties of the design that they'd like it to maintain permanently (e.g. for an ingress / memory tracker, it never deadlocks). These properties in SVA or Lean can be added to their codebase alongside their Verilog code. Then there's a loop where they iterate on their design and properties, including both human iteration and agentic coding. Aristotle can check their properties against their updated code for much less (say $10) and eventually even less. Nightly CI checks existing properties, and interactive analysis of new properties on Aristotle is also more cost effective ($10-$100).");

pres.writeFile({ fileName: "aristotle-workflow.pptx" }).then(f => console.log("wrote", f));
