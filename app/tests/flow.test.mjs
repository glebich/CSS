/**
 * The journey test: walks the whole product the way a person would and
 * fails loudly if any step, door, or number breaks. Run with `npm test`.
 * Uses the preinstalled Chromium; starts its own Vite dev server.
 */
import { chromium } from "playwright-core";
import { createServer } from "vite";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { readFileSync, mkdtempSync } from "node:fs";
import { execSync, spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { strToU8, zipSync } from "fflate";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
/* a crashed earlier run can leave its servers holding the ports and
   their old data; sweep them so this run speaks to its own stack */
try {
  execSync("pkill -f 'node dist/server.js' || true", { stdio: "ignore" });
} catch {
  /* nothing was running */
}
await new Promise((r) => setTimeout(r, 400));
const server = await createServer({ root, server: { port: 5197 } });
await server.listen();

/* Real Mode's other half: the actual API stack, booted for the test */
const apiDir = path.join(path.dirname(root), "api");
execSync("npm run build", { cwd: apiDir, stdio: "ignore" });
const apiProc = spawn("node", ["dist/server.js"], {
  cwd: apiDir,
  env: { ...process.env, OSYLE_DATA: mkdtempSync(path.join(tmpdir(), "osyle-api-")) },
  stdio: "ignore",
});
let apiReady = false;
for (let i = 0; i < 40 && !apiReady; i += 1) {
  try {
    apiReady = (await fetch("http://localhost:8787/health")).ok;
  } catch {
    await new Promise((r) => setTimeout(r, 250));
  }
}
if (!apiReady) console.log("FAIL  the api stack did not come up");

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 810 } });
const errors = [];
page.on("pageerror", (e) => errors.push(`pageerror: ${e}`));
page.on("console", (m) => {
  /* the repo test intentionally answers one fetch with 404, and the
     hero's concept film cannot leave this sandbox; both are expected */
  const text = m.text();
  if (
    m.type() === "error" &&
    !text.includes("status of 404") &&
    !text.includes("dropboxusercontent") &&
    !text.includes("ERR_TUNNEL_CONNECTION_FAILED")
  ) {
    errors.push(`console: ${text}`);
  }
});

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
check(
  "the rail wears eight marks",
  (await page.locator(".land-works .works-mark").count()) === 8,
);
check(
  "the landing doors to discover",
  await page.getByText("See who lives here").first().isVisible(),
);
check(
  "the landing leads with the last mile",
  await page.getByText("You built it with AI. We make it ready for the world.").isVisible(),
);
check(
  "the expertise row names its houses",
  await page.locator(".land-cred").getByText("OpenAI").isVisible(),
);
check(
  "the landing numbers say where they came from",
  await page.getByText("Stack Overflow Developer Survey 2026", { exact: false }).isVisible(),
);
check(
  "the landing owns the now-what moment",
  await page.getByText("I built it. Now what?").isVisible(),
);
check(
  "the loop is told in four steps",
  (await page.locator(".land-loop-step").count()) === 4,
);
check(
  "the landing names the laws it keeps",
  await page.getByText("Unbuilt stages name themselves").isVisible(),
);
check(
  "the hero wears the phone mask and says what plays in it",
  (await page.locator(".land-phone").isVisible()) &&
    ((await page.getByText("The concept film", { exact: false }).isVisible()) ||
      (await page.getByText("A live render, not a screenshot", { exact: false }).isVisible())),
);
check(
  "every mark says what its integration does",
  (await page.locator(".works-mark", { hasText: "GitHub" }).getAttribute("title"))?.includes(
    "reads the app from it",
  ) ?? false,
);
await page.getByText("Drop your app", { exact: false }).last().click();
check("place shows the flow steps", await page.locator(".flow-steps").isVisible());
check(
  "loose files have one door, wearing the clip",
  (await page.getByLabel("Just files", { exact: true }).count()) === 1,
);
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

/* the arrival home: the app named, reachable, the number explained */
check("home says it lives here now", await page.getByText("It lives here now.").isVisible());
check("the app is reachable from home", await page.getByText("Open your app").isVisible());
check(
  "vitality explains itself in place",
  await page.getByText("Your app's health, 0 to 100", { exact: false }).isVisible(),
);
{
  /* the home fits one screen: the act column ends above the fold */
  const heal = await page.getByText("Four issues can heal themselves").boundingBox();
  check("the home shows the act without scrolling", !!heal && heal.y + heal.height < 810);
}
check(
  "the sidebar's icons say their names",
  await page.locator(".side-row-label", { hasText: "Studio" }).isVisible(),
);

/* the ask acts: typed words route the room and land in history */
await page.getByPlaceholder(/./).last().fill("who is using it");
await page.keyboard.press("Enter");
await page.waitForTimeout(500);
check("asking about users lands with the people", await page.getByText("The people inside").isVisible());
check(
  "the journey board tells the four stages",
  (await page.locator(".journey-stage").count()) === 4,
);
check(
  "the journey names who is stuck and offers the door",
  (await page.getByText("Priya Nair stalled", { exact: false }).isVisible()) &&
    (await page.getByText("See the stall").isVisible()),
);
check(
  "the journey says which counts are example",
  await page.getByText("the three pilots are the example", { exact: false }).isVisible(),
);
await page.getByPlaceholder(/./).last().fill("make the call text larger for glare");
await page.keyboard.press("Enter");
await page.waitForTimeout(500);
check(
  "an edit-shaped ask lands in the studio, placed",
  await page.getByText("The drill call steps up one size", { exact: false }).isVisible(),
);
check(
  "the ask is remembered in history",
  await page.locator(".workspace-history-row", { hasText: "You asked" }).first().isVisible(),
);
await page.getByLabel("Osyle", { exact: true }).click();
await page.waitForTimeout(400);

/* the workspace: the live app on the bench beside every screen */
check("the workspace keeps the app in view", await page.locator(".workspace-preview").isVisible());
check(
  "the bench render is the whole app",
  await page.locator(".workspace-preview").getByText("Radio calls, ten minutes").isVisible(),
);
check(
  "history speaks beside the work",
  await page.locator(".workspace-preview").getByText("History").isVisible(),
);
{
  /* the sidebar holds the rooms and the floating ask never sits on the rail */
  check("the sidebar carries the rooms", await page.locator(".sidebar").isVisible());
  const ask = await page.locator(".ask-float .ask-pill").boundingBox();
  const rail = await page.locator(".workspace-preview").boundingBox();
  check("the ask never overlaps the bench", !!ask && !!rail && ask.x + ask.width <= rail.x);
}
check(
  "run, mood, and people wear the sheet look, split from the rooms",
  (await page.locator(".side-row-sheet").count()) === 3 &&
    (await page.locator(".side-divide").count()) === 3,
);
/* between the floor and the bench: the rail steps aside, the rooms stay */
await page.setViewportSize({ width: 1300, height: 810 });
check(
  "the rail steps aside when the room narrows",
  !(await page.locator(".workspace-preview").isVisible()),
);
check("the sidebar keeps the room at 1300", await page.locator(".sidebar").isVisible());
await page.setViewportSize({ width: 1440, height: 810 });

/* Heal: what it will touch is shown first, never behind a link */
check(
  "what heal will touch is shown first",
  await page.getByText("Four issues can heal themselves").isVisible(),
);
check("heal receipt lists four repairs", (await page.locator(".receipt-row").count()) === 4);
await page.getByText("Heal four issues").click();
/* the work speaks while it happens: a glass notice and the bar chip */
await page.waitForTimeout(400);
check(
  "healing files a working notice",
  await page.locator(".notice", { hasText: "Healing four issues" }).isVisible(),
);
check("the notice shows true progress", await page.locator(".notice-track").isVisible());
check("the top bar admits work is in flight", await page.getByText("1 working").isVisible());
{
  const blur = await page
    .locator(".notice")
    .first()
    .evaluate((el) => getComputedStyle(el).backdropFilter || getComputedStyle(el).webkitBackdropFilter);
  check("the notice stands on blurred glass", String(blur).includes("blur"));
}
await page.waitForTimeout(2200);
check("heal raises vitality to 69", (await page.locator(".instrument").innerText()) === "69");

/* No dead ends: home offers the next door after healing */
check("home offers the next step", await page.getByText("See what changed").isVisible());
check("the healed work is shown, not implied", await page.getByText("What Heal changed").isVisible());
check(
  "promote stands beside the reveal as a next door",
  await page.getByText("Promote it").isVisible(),
);
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

/* the proposals go deeper: five themes, each opening narrower readings */
check(
  "the evidence proposes five themes",
  (await page.getByText("Not quite it?", { exact: false }).count()) === 5,
);
await page.getByText("Not quite it?", { exact: false }).first().click();
check(
  "a theme opens its narrower readings",
  await page.getByText("The instrument returner").isVisible(),
);
await page
  .locator(".deeper-row", { hasText: "The instrument returner" })
  .getByText("Adopt", { exact: true })
  .click();
await page.waitForTimeout(400);
check(
  "a narrower reading adopts with its evidence",
  await page.getByText("The instrument returner").first().isVisible() &&
    (await page.locator(".notice", { hasText: "Adopting The instrument returner" }).isVisible()),
);
/* hand the primary back to the student so the adaptation checks hold */
await page
  .locator(".card", { hasText: "The student aviator" })
  .first()
  .getByText("Make primary")
  .click();
await page.waitForTimeout(300);

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
check(
  "the applied edit files its notice",
  await page.locator(".notice", { hasText: "Applying the edit" }).isVisible(),
);
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
   genuinely caught. Every assertion below is about measured output.
   Real Mode goes on here so the stack probe runs for the rest. */
await page.goto("http://localhost:5197/");
await page.evaluate(() => localStorage.setItem("osyle.realMode", "true"));
await page.reload();
await page.waitForTimeout(600);
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
    .getByText("Measured so far")
    .waitFor({ timeout: 15000 })
    .then(() => true)
    .catch(() => false),
);
await page.getByText("See the report", { exact: false }).click({ timeout: 25000 });
await page.waitForTimeout(600);

/* one Report, the whole truth, no other chrome competing with it */
check("the chrome steps aside for the report", (await page.locator(".sidebar").count()) === 0);
check("the report opens on the number", await page.locator(".instrument").isVisible());
check("the examination reads as ten lenses", (await page.locator(".lens-cell").count()) === 10);
check(
  "connectors are detected from the real bytes",
  (await page.getByText("Connections, detected in your files", { exact: false }).isVisible()) &&
    (await page.getByText("Google APIs").isVisible()),
);
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
check(
  "the wardrobe wears three devices at once",
  (await page.locator(".wardrobe iframe").count()) === 3,
);
check(
  "the tablet is honest about its stage",
  await page.getByText("The tablet composition and the native wrap builds", { exact: false }).isVisible(),
);
await page.getByText("Night Shift").click();
await page.waitForTimeout(400);
check("style chips switch the future live", await page.getByText("Wearing Night Shift").isVisible());
/* the prompt stands in the open; no click needed to find it */
const promptText = await page.locator("pre").last().innerText();
check(
  "the repair prompt carries the evidence",
  promptText.includes("styles.css") && promptText.includes("Grounding:"),
);
check(
  "the copy lives inside the prompt",
  await page.locator(".prompt-copy").isVisible(),
);
await page.getByText("Hide the prompt").click();
await page.waitForTimeout(200);
check("the prompt can still step aside", !(await page.locator(".prompt-copy").isVisible()));
await page.getByText("Read the prompt").click();
await page.waitForTimeout(200);

/* the report card: the brand surface as a real PNG */
const cardDownload = page.waitForEvent("download", { timeout: 8000 }).catch(() => null);
await page.getByText("Download the report card").click();
const card = await cardDownload;
check(
  "the report card downloads as a real image",
  card !== null && card.suggestedFilename().endsWith("-report-card.png"),
);

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
const kitDownload = page.waitForEvent("download", { timeout: 8000 }).catch(() => null);
await page.getByText("Download the store kit").click();
const kit = await kitDownload;
check(
  "the store kit downloads complete",
  kit !== null && kit.suggestedFilename() === "app-3-files-store-kit.zip",
);
await page.getByText("Invite a builder").click();
await page.waitForTimeout(200);
check("the invite copies in one tap", await page.getByText("Invite copied").isVisible());

/* Real Mode: the stack answers, the claim registers server side */
check("the stack's door is open", await page.getByText("The stack is answering").isVisible());
await page.getByPlaceholder("you@yourdomain.com").fill("resident@example.com");
await page.getByText("Claim it on the stack").click();
await page.waitForTimeout(1800);
check(
  "the claim comes back with the address",
  await page
    .getByText("Claimed. app-3-files.osyle.app is registered on the stack.")
    .isVisible(),
);
const survival = await (await fetch("http://localhost:8787/survival")).json();
check("the resident lives in the stack's database", survival.total >= 1);
check(
  "the vault holds the files, versioned from day one",
  await page.getByText("3 files in the Vault, versioned from day one.", { exact: false }).isVisible(),
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
  await page.locator(".prompt-copy").isVisible(),
);
const reportText = await page.locator("body").innerText();
check("zero repairs is never spoken", !reportText.includes("0 repairs"));
const improveText = await page.locator("pre").last().innerText();
check(
  "the improvement prompt carries the deeper pass",
  improveText.includes("heuristic") && improveText.includes("WCAG"),
);
await page.getByText("Give it the address").click();
await page.waitForTimeout(500);
check("a folder drop is named by its folder", await page.getByText("clean.osyle.app").first().isVisible());

/* dropped audio is carried whole and genuinely served at the address */
await page.goto("http://localhost:5197/#/r/clean");
await page.waitForTimeout(700);
const audioSrc = await page.frameLocator("iframe").locator("audio").getAttribute("src");
check(
  "dropped audio plays at the address",
  typeof audioSrc === "string" && audioSrc.startsWith("data:audio/wav;base64,"),
);

/* the residents desk lists every moved-in app with its address */
await page.goto("http://localhost:5197/#/owner");
await page.waitForTimeout(500);
check(
  "the desk lists the moved-in apps",
  (await page.getByText("app-3-files.osyle.app").isVisible()) &&
    (await page.getByText("clean.osyle.app").isVisible()),
);
await page.getByText("Growth", { exact: true }).click();
await page.waitForTimeout(300);
check("the growth board counts real cards", await page.getByText("1 card downloaded").isVisible());
check("the growth board counts real invites", await page.getByText("1 invite copied").isVisible());

/* Discover: where residents are seen, all of it real */
await page.goto("http://localhost:5197/#/discover");
await page.waitForTimeout(400);
check("discover greets who lives here", await page.getByText("Who lives here.").isVisible());
check(
  "the example says so on discover",
  (await page.locator(".chip", { hasText: "Example" }).count()) === 1,
);
check(
  "moved-in apps are seen on discover",
  (await page.getByText("app-3-files.osyle.app").isVisible()) &&
    (await page.getByText("clean.osyle.app").isVisible()),
);
await page.goto("http://localhost:5197/");
await page.waitForTimeout(500);
await page.getByText("Drop your app", { exact: false }).last().click();
await page.waitForTimeout(300);

/* -----------------------------------------------------------------
   The repo door: a person names their repository and the whole real
   examination follows. GitHub's zipball is stubbed at the network
   edge, so everything after the fetch is the true pipeline. */
const fixtureZip = zipSync({
  "sunrise-main/index.html": strToU8(
    readFileSync(new URL("./fixture/index.html", import.meta.url), "utf8"),
  ),
  "sunrise-main/styles.css": strToU8(
    readFileSync(new URL("./fixture/styles.css", import.meta.url), "utf8"),
  ),
  "sunrise-main/app.js": strToU8(
    readFileSync(new URL("./fixture/app.js", import.meta.url), "utf8"),
  ),
});
await page.route("**/api.github.com/repos/osyle/sunrise/zipball", (route) =>
  route.fulfill({
    status: 200,
    contentType: "application/zip",
    body: Buffer.from(fixtureZip),
  }),
);
await page.route("**/api.github.com/repos/osyle/nowhere/zipball", (route) =>
  route.fulfill({ status: 404, contentType: "application/json", body: "{}" }),
);
await page.getByLabel("Connect a GitHub repository").click();
await page.getByPlaceholder("github.com/you/your-app").fill("github.com/osyle/nowhere");
await page.getByText("Connect the repo").click();
await page.waitForTimeout(800);
check(
  "an unreachable repo is answered honestly",
  await page
    .getByText("Private repositories connect with Real Mode", { exact: false })
    .first()
    .isVisible(),
);
await page.getByPlaceholder("github.com/you/your-app").fill("github.com/osyle/sunrise");
await page.getByText("Connect the repo").click();
check(
  "the connected repo is measured for real",
  await page
    .getByText("Measured so far")
    .waitFor({ timeout: 15000 })
    .then(() => true)
    .catch(() => false),
);
await page.getByText("See the report", { exact: false }).click({ timeout: 25000 });
await page.waitForTimeout(600);
check("the repo's report opens on the number", await page.locator(".instrument").isVisible());
check(
  "the repo's flaws are caught from its zip",
  await page.getByText("below the AA floor", { exact: false }).first().isVisible(),
);

/* nothing speaks in the example's voice while a real project is open */
check("the tab wears the project's name", await page.locator(".tab").getByText("sunrise").isVisible());
check("the browser title carries the project", (await page.title()).includes("sunrise"));
check("the reset door renames honestly", await page.getByText("Start over").isVisible());

/* the name edits in place, Figma style: click, type, Enter */
await page.locator(".tab").getByText("sunrise").click();
await page.locator(".tab-rename").fill("Sunrise Pro");
await page.locator(".tab-rename").press("Enter");
await page.waitForTimeout(200);
check(
  "the name edits where it is worn",
  await page.locator(".tab").getByText("Sunrise Pro").isVisible(),
);
await page.locator(".tab").getByText("Sunrise Pro").click();
await page.locator(".tab-rename").fill("sunrise");
await page.locator(".tab-rename").press("Enter");
await page.waitForTimeout(200);

/* the report holds the 390 floor: futures stack, wardrobe fits */
const overflowNow = () =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(500);
check("the report holds the 390 floor", (await overflowNow()) <= 1);
check(
  "the two futures stack on phones",
  await page.evaluate(() => {
    const grid = document.querySelector(".futures-grid");
    return grid ? getComputedStyle(grid).gridTemplateColumns.split(" ").length === 1 : false;
  }),
);
check(
  "the panel door stays reachable on phones",
  await page.getByText("Your app", { exact: true }).isVisible(),
);
await page.setViewportSize({ width: 1440, height: 810 });
await page.waitForTimeout(400);

/* -----------------------------------------------------------------
   The resident panel: the app's whole life in one drawer, over any
   screen. Files, the last update, the connection with a real PR
   count, settings, visibility, the domain. */
await page.route("**/api.github.com/repos/osyle/sunrise/pulls**", (route) =>
  route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify([{ number: 1 }]),
  }),
);
await page.getByText("Your app", { exact: true }).click();
await page.waitForTimeout(500);
check("the panel opens over the work", await page.locator(".resident-panel").isVisible());
check(
  "the files are listed where you are",
  await page.locator(".resident-panel").getByText("styles.css", { exact: false }).first().isVisible(),
);
check(
  "the last update is dated",
  await page.locator(".resident-panel").getByText("Last updated", { exact: false }).isVisible(),
);

/* the file room: add, edit, and replace, like a file system */
const fileCountBefore = await page.locator(".file-row").count();
await page
  .locator(".file-add input[type=file]")
  .setInputFiles({ name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("hello room") });
await page.waitForTimeout(900);
check(
  "adding a file grows the room and files a notice",
  (await page.locator(".file-row").count()) === fileCountBefore + 1 &&
    (await page.locator(".notice", { hasText: "Adding files" }).isVisible()),
);
/* folders fold like folders; folding the loose one also clears the bench */
await page.locator(".folder-head", { hasText: "loose files" }).click();
check(
  "a folder folds its files away",
  !(await page.locator(".file-row", { hasText: "notes.txt" }).isVisible()),
);
const cssRow = page.locator(".file-row", { hasText: "styles.css" }).first();
await cssRow.getByText("Edit", { exact: true }).click();
check("a text file opens in the editor", await page.locator(".file-editor").isVisible());
const cssText = await page.locator(".file-editor").inputValue();
await page.locator(".file-editor").fill(`${cssText}\n.file-room-proof { color: green; }`);
await page.getByText("Save the file").scrollIntoViewIfNeeded();
await page.getByText("Save the file").click();
await page.waitForTimeout(900);
check(
  "saving re-examines and says so",
  await page.locator(".notice", { hasText: "saved and re-examined" }).isVisible(),
);
await cssRow.getByText("Edit", { exact: true }).click();
check(
  "the saved edit is truly in the file",
  (await page.locator(".file-editor").inputValue()).includes(".file-room-proof"),
);
await cssRow.getByText("Close", { exact: true }).click();
await cssRow.locator("input[type=file]").setInputFiles({
  name: "styles.css",
  mimeType: "text/css",
  buffer: Buffer.from("body { background: #fff; color: #111; }"),
});
await page.waitForTimeout(900);
check(
  "replacing keeps the path and says so",
  await page.locator(".notice", { hasText: "Replacing" }).isVisible() &&
    (await page.locator(".file-row", { hasText: "styles.css" }).count()) === 1,
);
check(
  "the connection knows its repo",
  await page.locator(".resident-panel").getByText("osyle/sunrise").isVisible(),
);
check(
  "open pull requests are counted for real",
  await page.locator(".resident-panel").getByText("1 open pull request", { exact: true }).isVisible(),
);
await page.locator(".resident-panel").getByLabel("Close the panel").click();
await page.waitForTimeout(300);

/* settings open once the app has its address */
await page.getByText("Give it the address").click();
await page.waitForTimeout(500);
await page.getByText("Your app", { exact: true }).click();
await page.waitForTimeout(400);
await page.locator(".resident-panel").getByText("Unlisted", { exact: true }).click();
await page.locator(".resident-panel").getByPlaceholder("yourdomain.com").fill("sunrise.app");
await page.locator(".resident-panel").getByText("Save the domain").click();
await page.waitForTimeout(200);
check(
  "the domain preference is kept honestly",
  await page.locator(".resident-panel").getByText("Saved. Point your DNS", { exact: false }).isVisible(),
);
await page.goto("http://localhost:5197/#/discover");
await page.waitForTimeout(400);
check("unlisted stays off discover", (await page.getByText("sunrise.osyle.app").count()) === 0);
check("public residents remain seen", await page.getByText("clean.osyle.app").isVisible());
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
check("no horizontal overflow at 390", (await overflowNow()) <= 1);
check("the numeral is visible at 390", await page.locator(".instrument").isVisible());

/* the place's mobile floor: decor steps back, the doors stack */
await page.setViewportSize({ width: 1440, height: 810 });
await page.waitForTimeout(300);
await page.getByText("Reset demo").click();
await page.getByText("Drop your app", { exact: false }).last().click();
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(400);
check("place holds the 390 floor", (await overflowNow()) <= 1);
check("decor steps back on small screens", await page.locator(".place-decor").first().isHidden());

/* the public surfaces hold the floor too */
const floor = async (url, name) => {
  await page.goto(url);
  await page.waitForTimeout(500);
  check(`${name} holds the 390 floor`, (await overflowNow()) <= 1);
};
await floor("http://localhost:5197/#/discover", "discover");
await floor("http://localhost:5197/#/mark/skyrecall", "the hallmark");
await floor("http://localhost:5197/#/owner", "the owner console");
await floor("http://localhost:5197/#/r/skyrecall", "the resident");

check("no console or page errors", errors.length === 0);
if (errors.length) console.log(errors.join("\n"));

await browser.close();
await server.close();
apiProc.kill();
if (failures > 0) {
  console.log(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nall checks passed");
