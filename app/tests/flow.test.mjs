/**
 * The journey test: walks the whole product the way a person would and
 * fails loudly if any step, door, or number breaks. Run with `npm test`.
 * Uses the preinstalled Chromium; starts its own Vite dev server.
 */
import { chromium } from "playwright-core";
import { createServer } from "vite";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const server = await createServer({ root, server: { port: 5197 } });
await server.listen();

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 810 } });
const errors = [];
page.on("pageerror", (e) => errors.push(`pageerror: ${e}`));
page.on("console", (m) => m.type() === "error" && errors.push(`console: ${m.text()}`));

let failures = 0;
function check(name, ok) {
  if (!ok) failures += 1;
  console.log(`${ok ? "ok" : "FAIL"}  ${name}`);
}

/* The setup journey: landing -> place -> materials -> style -> launch */
await page.goto("http://localhost:5197/");
await page.getByText("Drop your app", { exact: false }).last().click();
check("place shows the flow steps", await page.locator(".flow-steps").isVisible());
await page.getByText("See the example").click();
await page.waitForTimeout(900);
check("reading sweep is on", (await page.locator(".is-reading").count()) > 0);

/* the analysis theater streams its phases, earns its panel, and skips */
await page.waitForTimeout(2200);
check("the theater streams the feed", await page.getByText("Reconstructing the application").isVisible());
check("the understanding panel is live", await page.getByText("What it understands so far").isVisible());
await page.getByText("Skip", { exact: true }).click();
await page.waitForTimeout(400);
check("materials become understood", (await page.locator(".file-card.is-understood").count()) >= 6);
await page.getByText("Explore a style", { exact: false }).last().click();
check("style flow step is current", await page.locator(".flow-step.is-current", { hasText: "Style" }).isVisible());

/* the feeling road: words in, a style and an honest caption out */
await page.getByPlaceholder("e.g. make it grandma friendly").fill("make it grandma friendly");
await page.getByPlaceholder("e.g. make it grandma friendly").press("Enter");
check("grandma maps to the comfort caption", await page.getByText("Bigger, calmer, slower").isVisible());
check("grandma maps to Warm Counsel", await page.getByText("Continue with Warm Counsel").isVisible());

await page.locator(".style-tile").first().click();
await page.getByText("Continue with", { exact: false }).click();
await page.getByText("Create the concept").click();
await page.waitForTimeout(900);

/* The reveal and the surface */
const vitality = await page.locator(".instrument").innerText();
check("vitality reveals at 66", vitality === "66");
check("tab title carries the state", (await page.title()).includes("SkyRecall 66"));

/* Heal with a receipt */
await page.getByText("What will Heal touch").click();
check("heal receipt lists four repairs", (await page.locator(".receipt-row").count()) === 4);
await page.getByText("Heal four issues").click();
await page.waitForTimeout(2600);
check("heal raises vitality to 69", (await page.locator(".instrument").innerText()) === "69");

/* No dead ends: home offers the next door after healing */
check("home offers the next step", await page.getByText("See what changed").isVisible());
await page.getByText("See what changed").click();
await page.getByText("Keep the right one").click();
check("reveal ends in a door", await page.getByText("See the findings desk").isVisible());

/* The findings desk: priced, decidable, and it lets you rest */
await page.getByText("See the findings desk").click();
check(
  "undecided value is totaled as an estimate",
  await page.getByText("About $310 a month is waiting in 1 undecided finding", { exact: false }).isVisible(),
);
check("strengths are said plainly", await page.getByText("No manipulation anywhere").isVisible());
await page.getByText("Accept, I will fix the key").click();
await page.waitForTimeout(300);
check("accepted key waits on the user", await page.getByText("waiting on your key").isVisible());
check("all decided shows the rest state", await page.getByText("All decided.", { exact: false }).isVisible());
await page.getByText("Back to the rest").click();
await page.waitForTimeout(300);
check("rest door returns home", await page.locator(".instrument").isVisible());

/* The return moment, simulated by aging the away-clock. An init script is
   required: the app stamps the clock on beforeunload, so the aged value
   must land after the old page leaves and before the new one reads it. */
await page.addInitScript(() => {
  /* init scripts run in every frame, including sandboxed preview
     iframes where storage access throws; only the top frame matters */
  try {
    localStorage.setItem("osyle.demo.lastSeen", JSON.stringify(Date.now() - 5 * 60 * 60 * 1000));
  } catch {
    /* sandboxed frame, not our target */
  }
});
await page.reload();
await page.waitForTimeout(600);
check("since-you-left card appears", await page.locator(".since-card").isVisible());
await page.getByText("Skip").click();
check("since-you-left dismisses", (await page.locator(".since-card").count()) === 0);

/* the living address: a real app at #/r/skyrecall, wearing the identity */
await page.goto("http://localhost:5197/#/r/skyrecall");
await page.waitForTimeout(500);
check("the resident serves at its address", await page.getByText("Radio calls", { exact: false }).first().isVisible());
check("the resident wears the mark", await page.getByText("Alive at Osyle").isVisible());
await page.getByText("Begin the drill").click();
await page.getByText("Said it, next").click();
await page.getByText("Said it, next").click();
await page.getByText("Said it, log the drill").click();
check("a completed drill logs", await page.getByText("Logged.").isVisible());
await page.getByText("See the logbook").click();
check("the logbook remembers", await page.getByText("calls clean", { exact: false }).first().isVisible());
await page.reload();
await page.waitForTimeout(400);
check("the logbook survives a reload", await page.getByText("Logbook, 1").isVisible());
await page.goto("http://localhost:5197/");
await page.waitForTimeout(600);

/* -----------------------------------------------------------------
   The real engine: drop an actually flawed project and watch it get
   genuinely caught. Every assertion below is about measured output. */
await page.goto("http://localhost:5197/");
await page.waitForTimeout(500);
await page.getByText("Reset demo").click();
await page.getByText("Drop your app", { exact: false }).last().click();
await page.locator('input[type="file"]').setInputFiles([
  new URL("./fixture/index.html", import.meta.url).pathname,
  new URL("./fixture/styles.css", import.meta.url).pathname,
  new URL("./fixture/app.js", import.meta.url).pathname,
]);
check(
  "the real theater speaks measurements",
  await page
    .getByText("Measuring your files, line by line.")
    .waitFor({ timeout: 6000 })
    .then(() => true)
    .catch(() => false),
);
await page.getByText("See the report", { exact: false }).click({ timeout: 25000 });
await page.waitForTimeout(600);

/* one Report, the whole truth, no other chrome competing with it */
check("the bar steps aside for the report", (await page.locator(".bar-shell").count()) === 0);
check("the report opens on the number", await page.locator(".instrument").isVisible());
check(
  "the weak contrast pair is caught with its file",
  await page.getByText("below the AA floor", { exact: false }).first().isVisible(),
);
check(
  "evidence carries file and line",
  await page.getByText("styles.css:", { exact: false }).first().isVisible(),
);
check(
  "the committed key is caught",
  await page.getByText("credential", { exact: false }).first().isVisible(),
);
check(
  "the dark pattern copy is caught",
  await page.getByText("manipulation pattern", { exact: false }).first().isVisible(),
);
check(
  "findings cite their grounding",
  await page.getByText("WCAG 2.1", { exact: false }).first().isVisible(),
);
await page.getByText("Accept, add to the plan").first().click();
await page.waitForTimeout(300);
check("an accepted finding joins the plan", await page.getByText("in the plan").first().isVisible());
check("the report holds two live frames", (await page.locator("iframe.preview-frame").count()) === 2);
check("frames are labeled honestly", await page.getByText("As it arrived").isVisible());
await page.getByText("Night Shift").click();
await page.waitForTimeout(400);
check("style chips switch the future live", await page.getByText("Wearing Night Shift").isVisible());
await page.getByText("Read the prompt").click();
await page.waitForTimeout(300);
const promptText = await page.locator("pre").last().innerText();
check(
  "the repair prompt carries the evidence",
  promptText.includes("styles.css") && promptText.includes("Grounding:"),
);
check("the prompt is portable by one tap", await page.getByText("Copy the repair prompt").isVisible());

/* back to the example for the remaining checks */
await page.getByText("Reset demo").click();
await page.waitForTimeout(500);
await page.getByText("Drop your app", { exact: false }).last().click();
await page.getByText("See the example").click();
await page.getByText("Skip", { exact: true }).click();
await page.getByText("Explore a style", { exact: false }).last().click();
await page.getByText("Continue with", { exact: false }).click();
await page.getByText("Create the concept").click();
await page.waitForTimeout(600);

/* the responsive floor: at 390 everything is composed */
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(500);
const overflow = await page.evaluate(
  () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
);
check("no horizontal overflow at 390", overflow <= 1);
check("the numeral is visible at 390", await page.locator(".instrument").isVisible());

check("no console or page errors", errors.length === 0);
if (errors.length) console.log(errors.join("\n"));

await browser.close();
await server.close();
if (failures > 0) {
  console.log(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nall checks passed");
