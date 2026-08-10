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
check(
  "the landing carries the six promises",
  await page.getByText("Safe. Designed. Usable. Tested. Evolving. Shared.").isVisible(),
);
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

/* Taste Transfer: principles extracted, pixels never taken */
await page.getByText("A Swiss editorial magazine").click();
await page.waitForTimeout(300);
check("taste transfer extracts principles", await page.getByText("Density:", { exact: false }).isVisible());
check(
  "pixels are never taken",
  await page.getByText("never its pixels", { exact: false }).first().isVisible(),
);

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

/* -----------------------------------------------------------------
   The Audience: archetypes from a sentence, discovery with cited
   rationale, and the funnel dial with its labeled estimate. */
await page.getByLabel("Audience", { exact: true }).click();
await page.waitForTimeout(400);
check(
  "the seeded archetype is present and primary",
  await page.getByText("The professional refresher").first().isVisible(),
);
check("the reach numeral speaks", await page.getByText("fit this", { exact: false }).first().isVisible());
check("the estimate says it is one", await page.getByText("An estimate", { exact: true }).isVisible());
check(
  "discovery cites its evidence",
  await page.getByText("Session starts cluster on Saturday mornings", { exact: false }).isVisible(),
);

/* the dial: age range in, a visibly different estimate out */
const reachBefore = await page.locator(".reach-numeral").innerText();
await page.getByLabel("Oldest age").focus();
for (let i = 0; i < 8; i += 1) await page.keyboard.press("ArrowLeft");
await page.waitForTimeout(600);
const reachAfter = await page.locator(".reach-numeral").innerText();
check("the dial narrows the reach live", reachBefore !== reachAfter);
/* widen back so the refresher stays an older audience for adaptation */
for (let i = 0; i < 8; i += 1) await page.keyboard.press("ArrowRight");
await page.waitForTimeout(300);

/* a sentence composes an archetype, deterministically */
await page
  .getByPlaceholder("e.g. pilots who fly rarely and fear getting rusty")
  .fill("students preparing for the checkride");
await page.getByText("Compose the archetype").click();
await page.waitForTimeout(400);
check(
  "a sentence composes the student aviator",
  await page.getByText("The student aviator").first().isVisible(),
);

/* the primary archetype changes how the resident renders */
await page.goto("http://localhost:5197/#/r/skyrecall");
await page.waitForTimeout(500);
check(
  "a young primary renders dense",
  (await page.locator("[data-adapt]").getAttribute("data-adapt")) === "dense",
);
await page.goto("http://localhost:5197/");
await page.waitForTimeout(500);
await page.getByLabel("Audience", { exact: true }).click();
await page.waitForTimeout(400);
await page.getByText("Make primary").first().click();
await page.waitForTimeout(300);
await page.goto("http://localhost:5197/#/r/skyrecall");
await page.waitForTimeout(500);
check(
  "an older primary renders calm",
  (await page.locator("[data-adapt]").getAttribute("data-adapt")) === "calm",
);
await page.goto("http://localhost:5197/");
await page.waitForTimeout(500);

/* promote delivers against the chosen audience */
await page.getByLabel("Promote", { exact: true }).click();
await page.waitForTimeout(400);
check(
  "promote names the audience it delivers to",
  await page.getByText("The professional refresher", { exact: false }).first().isVisible(),
);

/* -----------------------------------------------------------------
   The Studio: plain language in, a labeled diff out, applied only
   by consent. Demo edits are scripted per the spec and say so. */
await page.getByLabel("Studio", { exact: true }).click();
await page.waitForTimeout(400);
await page.getByText("Show the streak in the logbook").click();
await page.waitForTimeout(400);
check("the diff names its file", await page.getByText("src/Logbook.tsx").isVisible());
check("the diff adds real lines", (await page.locator(".diff-line.is-add").count()) > 0);
check("the edit carries its why", await page.getByText("Why:", { exact: false }).first().isVisible());
check("the scripted edit says so", await page.getByText("Scripted example").isVisible());
await page.getByText("Apply the change").click();
await page.waitForTimeout(300);
check("applying celebrates in one line", await page.getByText("Your app got better today.").isVisible());
await page
  .getByPlaceholder("e.g. show the streak in the logbook")
  .fill("make everything purple");
await page.getByPlaceholder("e.g. show the streak in the logbook").press("Enter");
await page.waitForTimeout(300);
check(
  "an unknown ask gets an honest answer",
  await page.getByText("The demo studio knows three edits", { exact: false }).isVisible(),
);
await page.locator('input[placeholder="sk-ant-..."]').fill("sk-ant-demo123");
check("a key that looks right is told so", await page.getByText("Looks right").isVisible());

/* the Voice Director: a register picked, a strings-only diff shown */
await page.getByText("Warm", { exact: true }).click();
await page.waitForTimeout(300);
check(
  "the voice pass is strings only",
  await page.getByText("Strings only. No layout, color, or logic moves in a voice pass.").first().isVisible(),
);
check(
  "the voice diff rewrites real copy",
  await page.getByText("Your first drill will change that.", { exact: false }).isVisible(),
);

/* -----------------------------------------------------------------
   The Art Director: a named, calm voice whose notes arrive in the
   one quiet stream, every claim cited, silence said honestly. */
await page.getByLabel("Osyle", { exact: true }).click();
await page.waitForTimeout(400);
check(
  "the unprompted note waits on home",
  await page.getByText("left you a note", { exact: false }).isVisible(),
);
await page.getByText("left you a note", { exact: false }).click();
await page.waitForTimeout(400);
check(
  "the director signs the note",
  await page.getByText("Milan Rada, your Art Director", { exact: true }).first().isVisible(),
);
check(
  "the weekly review holds one quotable line",
  await page.getByText("An app that respects silence earns the moment it speaks.").isVisible(),
);
check(
  "every claim cites its evidence",
  await page.getByText("Evidence:", { exact: false }).first().isVisible(),
);
check(
  "silence is said honestly",
  await page.getByText("Nothing worth your attention today.", { exact: false }).isVisible(),
);
await page.getByText("See the stall").click();
await page.waitForTimeout(400);
check(
  "the intervention door lands on the monitor",
  await page.getByText("stalled at the weather briefing", { exact: false }).first().isVisible(),
);

/* -----------------------------------------------------------------
   The Owner console: the operator's room at #/owner, reading the
   same storage the product writes. The composed note round-trips
   into the resident's inbox, which is the concierge era working. */
await page.goto("http://localhost:5197/#/owner");
await page.waitForTimeout(500);
check("the console opens on the residents desk", await page.getByText("Owner console").isVisible());
check(
  "god-view reads the demo resident truly",
  await page.getByText("ledger decision", { exact: false }).isVisible(),
);
await page.getByText("Compose a note").click();
await page
  .getByPlaceholder("The note itself, as one or two human sentences")
  .fill("The checkride flow deserves a gentler start.");
await page
  .getByPlaceholder("Evidence, cited plainly")
  .fill("Composed by hand in the console, concierge era.");
await page.getByText("Leave the note").click();
await page.waitForTimeout(300);
check(
  "the composed note confirms",
  await page.getByText("unread, signed", { exact: false }).isVisible(),
);
await page.getByText("Prompt studio").click();
await page.waitForTimeout(300);
check(
  "prompts are versioned from day one",
  (await page.getByText("v1", { exact: true }).count()) === 3,
);
await page.getByText("Edit", { exact: true }).first().click();
await page.locator("textarea").fill("Speak only measured findings, calmly.");
await page.getByText("Save as v2").click();
await page.waitForTimeout(200);
check("editing writes a new version", await page.getByText("v2", { exact: true }).isVisible());
await page.getByText("Roll back to v1").click();
await page.waitForTimeout(200);
check(
  "rollback restores the one before",
  (await page.getByText("v1", { exact: true }).count()) === 3,
);
await page.goto("http://localhost:5197/");
await page.waitForTimeout(600);
await page.getByLabel("Inbox", { exact: true }).click();
await page.waitForTimeout(400);
check(
  "the concierge note arrives in the stream, signed",
  await page.getByText("The checkride flow deserves a gentler start.").isVisible(),
);

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

/* the X-ray: one gesture, blueprint view, measured numbers */
await page.keyboard.press("x");
await page.waitForTimeout(300);
check("x flips the blueprint on", (await page.locator('[data-xray="on"]').count()) === 1);
check(
  "the x-ray speaks in measurements",
  await page.getByText("Ink on surface", { exact: false }).isVisible(),
);
check("the x-ray carries the motion identity", await page.getByText("Motion:", { exact: false }).isVisible());
await page.keyboard.press("x");
await page.waitForTimeout(200);
check("x flips it back off", (await page.locator('[data-xray="on"]').count()) === 0);

/* the Hallmark: the live certificate, honest about its signature */
await page.goto("http://localhost:5197/#/mark/skyrecall");
await page.waitForTimeout(600);
check(
  "the hallmark certifies in the brand voice",
  await page.getByText("Examined and maintained at Osyle").isVisible(),
);
check(
  "the certificate is honest about signing",
  await page.getByText("The signing key arrives with Real Mode.", { exact: false }).isVisible(),
);
await page.goto("http://localhost:5197/#/r/skyrecall");
await page.waitForTimeout(500);
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
await page.locator('input[type="file"]:not([webkitdirectory])').setInputFiles([
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
check("the examination reads as ten lenses", (await page.locator(".lens-cell").count()) === 10);
check(
  "unbuilt lenses say their stage honestly",
  await page.getByText("Backend and data").isVisible(),
);
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
check(
  "the style carries its motion identity",
  await page.getByText("Motion: Settle", { exact: false }).first().isVisible(),
);
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

/* -----------------------------------------------------------------
   The residency: the examined app moves in, and the address serves
   the actual dropped files, not a metaphor for them. */
await page.getByText("Give it the address").click();
await page.waitForTimeout(500);
check("the ceremony opens", await page.getByText("It lives here now.").isVisible());
check("the address is spoken", await page.getByText("app-3-files.osyle.app").first().isVisible());
check(
  "the address flow step is current",
  await page.locator(".flow-step.is-current", { hasText: "The address" }).isVisible(),
);
await page.goto("http://localhost:5197/#/r/app-3-files");
await page.waitForTimeout(700);
check(
  "the dropped app is served at its address",
  await page.frameLocator("iframe").getByText("Sunrise Tracker").first().isVisible(),
);
check(
  "the resident footer marks the life",
  await page.getByText("app-3-files.osyle.app, alive at Osyle").isVisible(),
);
await page.reload();
await page.waitForTimeout(700);
check(
  "the residency survives a reload",
  await page.frameLocator("iframe").getByText("Sunrise Tracker").first().isVisible(),
);
await page.goto("http://localhost:5197/#/r/nowhere");
await page.waitForTimeout(400);
check(
  "an unknown address is honest",
  await page.getByText("Nothing lives at nowhere.osyle.app yet.").isVisible(),
);

/* -----------------------------------------------------------------
   A clean project is never a dead end: the folder picker takes a
   whole directory, the report offers the improvement prompt, and
   the app can still move in. Zero repairs is never spoken. */
await page.goto("http://localhost:5197/");
await page.waitForTimeout(500);
await page.getByText("Drop your app", { exact: false }).last().click();
await page
  .locator("input[webkitdirectory]")
  .setInputFiles(new URL("./clean", import.meta.url).pathname);
await page.getByText("See the report", { exact: false }).click({ timeout: 25000 });
await page.waitForTimeout(600);
check(
  "a clean app is never a dead end",
  await page.getByText("Nothing measurable to repair. There is still a next step.").isVisible(),
);
check(
  "the improvement prompt replaces the empty plan",
  await page.getByText("Copy the improvement prompt").isVisible(),
);
const reportText = await page.locator("body").innerText();
check("zero repairs is never spoken", !reportText.includes("0 repairs"));
await page.getByText("Read the prompt").click();
await page.waitForTimeout(300);
const improveText = await page.locator("pre").last().innerText();
check(
  "the improvement prompt carries the deeper pass",
  improveText.includes("heuristic") && improveText.includes("WCAG"),
);
await page.getByText("Give it the address").click();
await page.waitForTimeout(500);
check("a folder drop is named by its folder", await page.getByText("clean.osyle.app").first().isVisible());

/* the residents desk lists every moved-in app with its address */
await page.goto("http://localhost:5197/#/owner");
await page.waitForTimeout(500);
check(
  "the desk lists the moved-in apps",
  (await page.getByText("app-3-files.osyle.app").isVisible()) &&
    (await page.getByText("clean.osyle.app").isVisible()),
);
await page.goto("http://localhost:5197/");
await page.waitForTimeout(500);
await page.getByText("Drop your app", { exact: false }).last().click();
await page.waitForTimeout(300);

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
