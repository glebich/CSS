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
    !text.includes("status of 502") &&
    !text.includes("dropboxusercontent") &&
    !text.includes("1000logos") &&
    !text.includes("logos-world") &&
    !text.includes("futurecdn") &&
    !text.includes("gstatic") &&
    !text.includes("magnific") &&
    !text.includes("shutterstock") &&
    !text.includes("freebiesupply") &&
    !text.includes("wikimedia") &&
    !text.includes("logos-download") &&
    !text.includes("replit.app") &&
    !text.includes("vectorseek") &&
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


/* reach the Place from wherever the app wakes up, without wiping any
   state: the landing's own CTA when it shows, or the top bar's plus */
async function goToPlace() {
  await page.goto("http://localhost:5197/");
  await page.waitForTimeout(500);
  const cta = page.getByText("Drop your app", { exact: false }).last();
  if (await cta.isVisible().catch(() => false)) {
    await cta.click();
  } else {
    await page.getByLabel("Drop another app").click();
  }
  await page.waitForTimeout(300);
}

/* one walk for every drop: after the materials, a real app takes the
   same road as the example, style, launch, enhance, then the report
   through the home's own door */
async function walkToReport(checkLaunchIsHonest = false) {
  await page.getByText("Explore a style", { exact: false }).last().click({ timeout: 25000 });
  await page.getByText("Continue with", { exact: false }).click();
  if (checkLaunchIsHonest) {
    /* the launch review is where the example's story used to be
       handed to a stranger's app as if it were theirs */
    check(
      "a real app is not given the example's audience",
      (await page.getByText("Nobody named yet", { exact: false }).isVisible()) &&
        (await page.getByText("Maria Chen", { exact: false }).count()) === 0,
    );
    check(
      "a real app is not given the example's idea of success",
      (await page.getByText("A pilot completes a first drill", { exact: false }).count()) === 0,
    );
    check(
      "the project line does not say the name twice",
      !(await page.locator(".review-card").innerText()).includes(
        "Sunrise Tracker: The page calls itself",
      ),
    );
    /* and the door it points at opens on an empty room, not on the
       example's three pilots wearing a stranger's product */
    await page.getByText("Name your audience").click();
    await page.waitForTimeout(400);
    check(
      "a real app's audience starts empty",
      (await page.getByText("Nobody yet", { exact: false }).isVisible()) &&
        (await page.locator(".persona-card").count()) === 0,
    );
    await page.getByText("Add the first person").click();
    await page.waitForTimeout(400);
    check("the first person can be named", (await page.locator(".persona-input").count()) > 0);
    await page.locator(".persona-input").first().fill("Sam Okafor");
    await page.getByText("Done").click();
    await page.waitForTimeout(300);
    await page.locator(".floating-panel").getByLabel("Close personas").click();
    await page.waitForTimeout(400);
    check(
      "the named person becomes the app's audience",
      (await page.locator(".review-card").innerText()).includes("Sam Okafor"),
    );
  }
  await page.getByText("Enhance the app").click();
  await page.waitForTimeout(1000);
  const decide = page.getByText("in the report", { exact: false }).first();
  if (await decide.isVisible().catch(() => false)) {
    await decide.click();
  } else {
    await page.getByText("Open the report").click();
  }
  await page.waitForTimeout(600);
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
  "the expertise band names its houses, as mark or as name",
  await page.evaluate(() => {
    const cells = [...document.querySelectorAll(".land-marks .land-mark")];
    return (
      cells.length === 4 &&
      cells.some(
        (c) =>
          (c.textContent || "").includes("OpenAI") ||
          c.querySelector('img[alt="OpenAI"]') !== null,
      )
    );
  }),
);
check(
  "the expertise band runs the hero's full width",
  Math.abs(
    (await page.locator(".land-marks").boundingBox()).width -
      (await page.locator(".land-hero").boundingBox()).width,
  ) <= 2,
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
  "the loop is told in four stages, around a ring",
  (await page.locator(".loop-seat").count()) === 4 &&
    (await page.locator(".loop-dial").count()) === 1,
);
check(
  "the seam is drawn, not described",
  (await page.locator(".seam-row").count()) === 3 &&
    (await page.locator(".seam-knot").count()) === 3,
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
  (await page.locator('.works-mark[data-mark="GitHub"]').getAttribute("title"))?.includes(
    "reads the app from it",
  ) ?? false,
);
/* a mark carrying a logo still names itself, for anyone reading with
   their ears rather than their eyes */
check(
  "a logo mark keeps its name for a screen reader",
  (await page.locator('.works-mark[data-mark="Cursor"] img').getAttribute("alt")) === "Cursor" ||
    (await page.locator('.works-mark[data-mark="Cursor"]').innerText()).includes("Cursor"),
);
/* the word on the door: while the real path is unfinished it asks
   before it opens, and the example stays open to everyone */
await page.getByText("Drop your app", { exact: false }).last().click();
await page.waitForTimeout(400);
check("the real drop asks for the word", await page.locator(".land-gate").isVisible());
check("the flow does not open on a wrong word", (await page.locator(".flow-steps").count()) === 0);
await page.locator(".land-gate input").fill("not the word");
await page.locator(".land-gate .pill-dark").click();
await page.waitForTimeout(300);
check("a wrong word is refused", await page.getByText("Not that word.").isVisible());
await page.locator(".land-gate input").fill("milkinside");
await page.locator(".land-gate .pill-dark").click();
await page.waitForTimeout(400);
check("the right word opens the door", await page.locator(".flow-steps").isVisible());
/* and it is remembered, so the door is asked once */
await page.goto("http://localhost:5197/");
await page.waitForTimeout(500);
await page.getByText("Drop your app", { exact: false }).last().click();
await page.waitForTimeout(400);
check("the door asks only once", (await page.locator(".land-gate").count()) === 0);
check("place shows the flow steps", await page.locator(".flow-steps").isVisible());
check(
  "the onboarding keeps a clear desk, no rail",
  (await page.locator(".sidebar").count()) === 0,
);
check(
  "loose files have one door, wearing the clip",
  (await page.getByLabel("Just files", { exact: true }).count()) === 1,
);
await page.getByText("See the example").click();
await page.waitForTimeout(900);
check("reading sweep is on", (await page.locator(".is-reading").count()) > 0);

/* the analysis theater streams its phases, earns its panel, and skips */
await page.waitForTimeout(2200);
check("the theater streams the feed", await page.getByText("Reconstructing the application").first().isVisible());
check("the understanding panel is live", await page.getByText("What it understands so far").isVisible());
await page.getByText("Skip", { exact: true }).click();
await page.waitForTimeout(400);
check("materials become understood", (await page.locator(".file-card.is-understood").count()) >= 6);

/* the folder never leaves the table: it stands open beside its files,
   takes them back in, and lets them out again with the same motion */
check("the folder stays on the table while open", await page.locator(".asset-folder.is-open").isVisible());
await page.getByLabel("Close the materials").click();
await page.waitForTimeout(700);
check("the files are back inside the folder", (await page.locator(".file-card").count()) === 0);
check(
  "the closed folder keeps a clean face, no pretend previews",
  (await page.locator(".asset-peek").count()) === 0,
);
await page.getByLabel("Open the materials").click();
await page.waitForTimeout(700);
check("the files fly back out of the folder", (await page.locator(".file-card").count()) >= 6);

await page.getByText("Explore a style", { exact: false }).last().click();
check("style flow step is current", await page.locator(".flow-step.is-current", { hasText: "Style" }).isVisible());

/* the feeling road: words in, a style and an honest caption out */
await page.getByPlaceholder("e.g. make it grandma friendly").fill("make it grandma friendly");
await page.getByPlaceholder("e.g. make it grandma friendly").press("Enter");
check("grandma maps to the comfort caption", await page.getByText("Bigger, calmer, slower").isVisible());
check("grandma maps to Warm Counsel", await page.getByText("Continue with Warm Counsel").isVisible());

/* the gallery stands alone; the taste study left the page by request */
check(
  "the taste study is gone from the gallery",
  (await page.getByText("Taste Transfer").count()) === 0,
);

await page.locator(".style-tile").first().click();
await page.getByText("Continue with", { exact: false }).click();

/* the review is not a fait accompli: the success row rewrites in place */
await page.getByText("returns within a week", { exact: false }).click();
await page.getByLabel("Success").fill("Two drills finished in the first sitting");
await page.getByLabel("Success").press("Enter");
check(
  "the success row wears your words",
  await page.getByText("Two drills finished in the first sitting").isVisible(),
);

/* the people open too: a fourth persona, named on the spot */
await page.getByText("Change the personas").click();
await page.getByText("Add a persona").click();
await page.getByLabel("Persona name").fill("Dana Reyes");
await page.getByText("Done", { exact: true }).click();
check(
  "the new persona fronts the review",
  await page.getByText("Dana Reyes", { exact: false }).first().isVisible(),
);
await page.locator(".persona-card", { hasText: "Maria Chen" }).click();
await page.getByLabel("Close personas").click();

/* the platform chips choose, they do not just report */
await page.locator(".platform-chip", { hasText: "Web" }).click();
check(
  "web takes the platform",
  await page.locator(".platform-chip:not(.off)", { hasText: "Web" }).isVisible(),
);
await page.locator(".platform-chip", { hasText: "iOS" }).click();

await page.getByText("Enhance the app").click();
await page.waitForTimeout(900);

/* The reveal and the surface */
check(
  "the arrival beat bridges the seam",
  await page.getByText("This is its home now.", { exact: false }).isVisible(),
);
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
  "the number's diary draws once two values exist",
  (await page.locator(".vita-spark polyline").count()) === 1,
);
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
check(
  "the ledger shows the money in three piles",
  (await page.locator(".value-cell").count()) === 3 &&
    (await page.getByText("a month recovered, healed and working", { exact: false }).isVisible()),
);
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
check(
  "since-you-left arrives as corner glass",
  await page.locator(".notice-stack-since .notice").isVisible(),
);
check(
  "the return note wears the blur",
  (
    await page
      .locator(".notice-stack-since .notice")
      .evaluate((el) => getComputedStyle(el).backdropFilter)
  ).includes("blur"),
);
await page.getByText("Skip").click();
check("since-you-left dismisses", (await page.locator(".notice-stack-since").count()) === 0);

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
await walkToReport(true);

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
await page.waitForTimeout(400);
/* the address is chosen, never assigned: the suggestion is offered and
   the person may take it or name their own */
check(
  "the address is offered for choosing first",
  (await page.locator(".address-input").inputValue()) === "sunrise-tracker",
);
/* and it is offered from what the app calls itself, not from how many
   files happened to be dragged in */
check(
  "the app is named by the app, not by the drag",
  (await page.locator(".tab").first().innerText()).includes("Sunrise Tracker"),
);
await page.locator(".address-input").fill("sky-recall");
await page.waitForTimeout(150);
check(
  "a free address says it is free",
  await page.getByText("sky-recall.osyle.app is free", { exact: false }).isVisible(),
);
await page.locator(".address-input").fill("skyrecall");
await page.waitForTimeout(150);
check(
  "the platform's own name is refused",
  await page.getByText("That name is the platform's own", { exact: false }).isVisible(),
);
/* a name of the person's own, not the one the files happened to carry */
await page.locator(".address-input").fill("my-first-app");
await page.getByText("Give it this address").click();
await page.waitForTimeout(500);
check("the ceremony opens", await page.getByText("It lives here now.").isVisible());
check(
  "the chosen address is the one given",
  await page.getByText("my-first-app.osyle.app").first().isVisible(),
);
check(
  "the ceremony stands alone, no breadcrumb competing",
  (await page.locator(".flow-steps").count()) === 0,
);
check(
  "the ceremony ends with a road, never a wall",
  await page.getByText("Go to its home").isVisible(),
);
const kitDownload = page.waitForEvent("download", { timeout: 8000 }).catch(() => null);
await page.getByText("Download the store kit").click();
const kit = await kitDownload;
check(
  "the store kit downloads complete",
  kit !== null && kit.suggestedFilename() === "my-first-app-store-kit.zip",
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
    .getByText("Claimed. my-first-app.osyle.app is registered on the stack.")
    .isVisible(),
);
check(
  "the stack's memory reads back",
  await page
    .getByText("on record at the stack", { exact: false })
    .waitFor({ timeout: 6000 })
    .then(() => true)
    .catch(() => false),
);
check(
  "the stack's copy has a public door",
  await page.getByText("Open the stack's copy").isVisible(),
);
check(
  "the stack actually serves the claimed page",
  await page.evaluate(async () => {
    const r = await fetch("http://localhost:8787/serve/my-first-app/");
    return r.ok && (r.headers.get("content-type") || "").includes("text/html");
  }),
);
const survival = await (await fetch("http://localhost:8787/survival")).json();
check("the resident lives in the stack's database", survival.total >= 1);
check(
  "the vault holds the files, versioned from day one",
  await page.getByText("3 files in the Vault, versioned from day one.", { exact: false }).isVisible(),
);
await page.goto("http://localhost:5197/#/r/my-first-app");
await page.waitForTimeout(700);
check(
  "the dropped app is served at its address",
  await page.frameLocator("iframe").getByText("Sunrise Tracker").first().isVisible(),
);
check(
  "the resident footer marks the life",
  await page.getByText("my-first-app.osyle.app, alive at Osyle").isVisible(),
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
await goToPlace();
await page
  .locator("input[webkitdirectory]")
  .setInputFiles(new URL("./clean", import.meta.url).pathname);
await walkToReport();
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
await page.waitForTimeout(400);
check(
  "a folder drop suggests its folder's name",
  (await page.locator(".address-input").inputValue()) === "clean",
);
await page.getByText("Give it this address").click();
await page.waitForTimeout(500);
check("the suggestion can simply be taken", await page.getByText("clean.osyle.app").first().isVisible());

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
  (await page.getByText("my-first-app.osyle.app").isVisible()) &&
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
  (await page.getByText("my-first-app.osyle.app").isVisible()) &&
    (await page.getByText("clean.osyle.app").isVisible()),
);
await goToPlace();

/* -----------------------------------------------------------------
   The repo door: a person names their repository and the whole real
   examination follows. The stack's repo proxy is the network edge
   now, so it is stubbed where the browser asks it, and the direct
   zipball stays stubbed for the fallback path; everything after the
   fetch is the true pipeline. */
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
await page.route("**/fetch/github/osyle/sunrise", (route) =>
  route.fulfill({
    status: 200,
    contentType: "application/zip",
    body: Buffer.from(fixtureZip),
  }),
);
await page.route("**/fetch/github/osyle/nowhere", (route) =>
  route.fulfill({
    status: 404,
    contentType: "application/json",
    body: JSON.stringify({
      error:
        "github.com/osyle/nowhere is not reachable. Private repositories connect with Real Mode's token flow.",
    }),
  }),
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
await walkToReport();
check("the repo's report opens on the number", await page.locator(".instrument").isVisible());
check(
  "the repo's flaws are caught from its zip",
  await page.getByText("below the AA floor", { exact: false }).first().isVisible(),
);

/* a refresh keeps the person's own app; it does not hand back the
   example along with everything they had already decided */
await page.reload();
await page.waitForTimeout(900);
check(
  "the examined app survives a reload",
  (await page.locator(".tab").getByText("sunrise").isVisible()) &&
    (await page.getByText("SkyRecall").count()) === 0,
);
/* the refresh lands on the app's own home; its report is one door away
   and still made of the person's own files */
const backToReport = page.getByText("in the report", { exact: false }).first();
if (await backToReport.isVisible().catch(() => false)) {
  await backToReport.click();
} else {
  await page.getByText("Open the report").click();
}
await page.waitForTimeout(800);
check(
  "the report it was reading is still the real one",
  (await page.locator(".instrument").isVisible()) &&
    (await page.getByText("below the AA floor", { exact: false }).first().isVisible()),
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

/* settings open once the app has its address; the claim makes the
   resident real on the stack so the domain can follow */
await page.getByText("Give it the address").click();
await page.waitForTimeout(400);
check(
  "a connected repo suggests the repo's own name",
  (await page.locator(".address-input").inputValue()) === "sunrise",
);
await page.getByText("Give it this address").click();
await page.waitForTimeout(500);
await page.getByPlaceholder("you@yourdomain.com").fill("resident@example.com");
await page.getByText("Claim it on the stack").click();
await page.waitForTimeout(2200);
await page.getByText("Your app", { exact: true }).click();
await page.waitForTimeout(400);
await page.locator(".resident-panel").getByText("Unlisted", { exact: true }).click();
await page.locator(".resident-panel").getByPlaceholder("yourdomain.com").fill("sunrise.app");
await page.locator(".resident-panel").getByText("Save the domain").click();
await page.waitForTimeout(600);
check(
  "the domain is saved for real on the stack",
  await page.locator(".resident-panel").getByText("The stack holds it", { exact: false }).isVisible(),
);
/* and the stack now answers by that name: the same request that a
   DNS-pointed browser would make, Host header and all */
const byName = await new Promise((resolve) => {
  import("node:http").then(({ request }) => {
    const r = request(
      { host: "localhost", port: 8787, path: "/", headers: { Host: "sunrise.app" } },
      (res) => {
        let body = "";
        res.on("data", (c) => (body += c));
        res.on("end", () => resolve({ status: res.statusCode, body }));
      },
    );
    r.on("error", () => resolve({ status: 0, body: "" }));
    r.end();
  });
});
check(
  "the stack serves the app by its own name",
  byName.status === 200 && byName.body.includes("<"),
);

/* the stack's round: the caretaker's look, asked for from the panel */
await page.locator(".resident-panel").getByText("Ask for a fresh look").click();
await page.waitForTimeout(900);
check(
  "the stack's round answers on demand",
  await page
    .locator(".resident-panel")
    .getByText("The front door answers", { exact: false })
    .isVisible(),
);

/* the resident's key came home with the claim, in the owner's hands */
check(
  "the resident's key is in the owner's hands",
  await page.locator(".resident-panel").getByText("Copy the SDK key").isVisible(),
);


/* the Monitor for a real app: measurements only, never the example's
   invented day */
await page.locator(".resident-panel").getByLabel("Close the panel").click();
await page.waitForTimeout(300);
await page.getByText("Go to its home").click();
await page.waitForTimeout(500);
/* a real app is not stranded on one screen: the rail carries it, and
   says plainly which rooms are still the example's alone */
check("a real app's home carries the rail", await page.locator(".sidebar").isVisible());
check(
  "the rooms that are real for a drop are walkable",
  (await page.locator(".sidebar .side-row:not(.is-waiting)").count()) >= 7,
);
check(
  "a room the example alone wears says so",
  (await page.locator('.sidebar .side-row.is-waiting[aria-label="Studio"]').getAttribute("title")) ===
    "The example wears this today. Your app gets it when the stage ships.",
);
await page.getByText("Watch the traffic").click();
await page.waitForTimeout(1200);
check(
  "a real app is watched for real",
  await page.getByText("Watched, for real.", { exact: false }).isVisible(),
);
check(
  "the invented day belongs to the example alone",
  (await page.getByText("uptime, 30 days").count()) === 0 &&
    (await page.getByText("stalled at the weather briefing").count()) === 0,
);
check(
  "the monitor counts what the Vault actually holds",
  await page.getByText("What the Vault holds", { exact: false }).isVisible(),
);
check(
  "the caretaker's looks are listed",
  await page.getByText("What the caretaker saw", { exact: false }).isVisible(),
);
await page.getByText("Back to the home").click();
await page.waitForTimeout(400);

/* the Inbox for a real app: its own record, none of the example's story */
await page.locator("main").getByText("Inbox", { exact: true }).click();
await page.waitForTimeout(900);
check(
  "a real app reads its own record",
  await page.getByText("Moved onto the stack at", { exact: false }).first().isVisible(),
);
check(
  "the example's stream stays with the example",
  (await page.getByText("weather briefing").count()) === 0 &&
    (await page.getByText("Weekly review").count()) === 0,
);
check(
  "the record carries the examination it began with",
  await page.getByText("Examined. Vitality", { exact: false }).first().isVisible(),
);
await page.getByText("Back to the work").click();
await page.waitForTimeout(400);

/* the SDK room: a real app is handed its own client, never the
   example's slug */
await page.getByText("The journeys").click();
await page.waitForTimeout(900);
check(
  "the client is written with the app's own name",
  await page.getByText('createClient("sunrise"', { exact: false }).isVisible(),
);
check(
  "the example's resident is not pasted into a real app",
  (await page.getByText('createClient("skyrecall")').count()) === 0,
);
check(
  "the client carries the app's own key",
  await page.getByText("transport: \"http\"", { exact: false }).isVisible(),
);
check(
  "the database says where it stands",
  await page.getByText("Where the database stands", { exact: false }).isVisible(),
);
await page.getByText("Back to the home").click();
await page.waitForTimeout(400);
/* moving house: the app takes a new address while it is still open,
   and the address it leaves keeps pointing at it */
await page.getByText("Your app", { exact: true }).click();
await page.waitForTimeout(400);
await page.locator(".resident-panel").getByText("Change the address").click();
await page.waitForTimeout(200);
await page.locator(".resident-panel .address-input").fill("sunrise-two");
await page.locator(".resident-panel").getByText("Move it there").click();
await page.waitForTimeout(1200);
check(
  "the app wears its new address",
  await page.locator(".resident-panel").getByText("sunrise-two.osyle.app").isVisible(),
);
await page.locator(".resident-panel").getByLabel("Close the panel").click();
await page.waitForTimeout(300);
await page.goto("http://localhost:5197/#/discover");
await page.waitForTimeout(400);
check("unlisted stays off discover", (await page.getByText("sunrise.osyle.app").count()) === 0);
check("public residents remain seen", await page.getByText("clean.osyle.app").isVisible());


/* the knock: the claimed resident's served door earns its chip */
check(
  "an answering door is seen on discover",
  await page
    .getByText("The door answers")
    .first()
    .waitFor({ timeout: 6000 })
    .then(() => true)
    .catch(() => false),
);

/* the address it left still carries a visitor home */
const oldDoor = await new Promise((resolve) => {
  import("node:http").then(({ request }) => {
    const r = request({ host: "localhost", port: 8787, path: "/serve/sunrise/" }, (res) =>
      resolve({ status: res.statusCode, to: res.headers.location ?? "" }),
    );
    r.on("error", () => resolve({ status: 0, to: "" }));
    r.end();
  });
});
check(
  "the stack forwards the address it left",
  oldDoor.status === 301 && oldDoor.to.startsWith("/serve/sunrise-two/"),
);
await page.goto("http://localhost:5197/#/r/sunrise");
await page.waitForTimeout(700);
check(
  "a link shared before the move still finds the app",
  (await page.getByText("Nothing lives at", { exact: false }).count()) === 0,
);

/* the door for coming back: the account this browser already holds,
   the way out, and a letter that opens it again from anywhere */
await page.goto("http://localhost:5197/");
await page.waitForTimeout(700);
await page.getByLabel("Your account").click();
await page.waitForTimeout(900);
check(
  "the account door knows who is here",
  await page.locator(".resident-panel").getByText("resident@example.com").isVisible(),
);
check(
  "signed in, the apps on the stack are listed",
  await page.locator(".resident-panel").getByText("The apps you hold").isVisible(),
);
await page.locator(".resident-panel").getByText("Sign out").click();
await page.waitForTimeout(800);
check(
  "signing out leaves the apps waiting",
  await page
    .locator(".resident-panel")
    .getByText("Signed out on this machine", { exact: false })
    .isVisible(),
);
check(
  "signed out, the door offers a way back",
  await page.locator(".resident-panel").getByPlaceholder("you@yourdomain.com").isVisible(),
);
await page
  .locator(".resident-panel")
  .getByPlaceholder("you@yourdomain.com")
  .fill("resident@example.com");
await page.locator(".resident-panel").getByText("Send me a way in").click();
await page.waitForTimeout(1000);
check(
  "a stack with no mailer hands the way in over",
  await page.locator(".resident-panel").getByText("Open the way in").isVisible(),
);
await page.locator(".resident-panel").getByText("Open the way in").click();
await page.waitForTimeout(1000);
await page.goto("http://localhost:5197/");
await page.waitForTimeout(700);
await page.getByLabel("Your account").click();
await page.waitForTimeout(900);
check(
  "the letter's link signs a person in for real",
  await page.locator(".resident-panel").getByText("resident@example.com").isVisible(),
);
await page.locator(".resident-panel").getByLabel("Close the panel").click();
await page.waitForTimeout(300);



await goToPlace();

/* back to the example for the remaining checks. A real app is still
   open, so the door reads Start over; it says Reset demo only when the
   example is the only thing here */
const startOver = page.getByText("Start over", { exact: true });
if (await startOver.isVisible().catch(() => false)) {
  await startOver.click();
} else {
  await page.getByText("Reset demo").click();
}
await page.waitForTimeout(500);
await page.getByText("Drop your app", { exact: false }).last().click();
await page.getByText("See the example").click();
await page.getByText("Skip", { exact: true }).click();
await page.getByText("Explore a style", { exact: false }).last().click();
await page.getByText("Continue with", { exact: false }).click();
await page.getByText("Enhance the app").click();
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

/* the honest stop: a folder of documents is not an app, and saying so
   is worth more than a confident number about nothing */
await goToPlace();
await page.locator('input[type="file"]:not([webkitdirectory])').setInputFiles([
  { name: "Bylaws.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4 stub") },
  { name: "Board Consent.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4 stub") },
  { name: "Stock Ledger.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4 stub") },
]);
await page.waitForTimeout(1500);
check("a drop with no app in it is refused", await page.locator(".place-refusal").isVisible());
check(
  "the refusal names what actually arrived",
  (await page.locator(".place-refusal").innerText()).includes("3 .pdf"),
);
check(
  "the refusal never invents a score",
  (await page.locator(".instrument").count()) === 0,
);
await page.locator(".place-refusal").getByText("Try again").click();
await page.waitForTimeout(300);
check("the refusal clears when asked", (await page.locator(".place-refusal").count()) === 0);

check("no console or page errors", errors.length === 0);
if (errors.length) console.log(errors.join("\n"));

/* A build that names a stack finds it without anyone touching
   localStorage. This is the whole point of the deployed site working
   for a visitor, so it is checked the way a visitor meets it: a second
   server built with the variable set, on its own port, with its own
   empty storage. */
process.env.VITE_OSYLE_API = "http://localhost:8787/";
const built = await createServer({ root, server: { port: 5198 } });
await built.listen();
const visitor = await browser.newPage({ viewport: { width: 1440, height: 810 } });
await visitor.goto("http://localhost:5198/");
await visitor.waitForTimeout(900);
const untouched = await visitor.evaluate(
  () => localStorage.getItem("osyle.realMode") === null && localStorage.getItem("osyle.apiBase") === null,
);
check("the built-in stack needs no localStorage", untouched);
/* the owner console reads /health straight from whatever base the app
   decided on, so it proves the whole chain: build variable, decision,
   live answer */
await visitor.goto("http://localhost:5198/#/owner");
await visitor.waitForTimeout(900);
await visitor.getByText("Health", { exact: true }).click();
check(
  "a build that names a stack talks to it",
  await visitor
    .getByText("The stack answers")
    .waitFor({ timeout: 20000 })
    .then(() => true)
    .catch(() => false),
);
check(
  "the named stack is not called missing",
  !(await visitor.getByText("Real Mode is on and a base").isVisible()),
);
await visitor.close();
await built.close();
delete process.env.VITE_OSYLE_API;

await browser.close();
await server.close();
apiProc.kill();
if (failures > 0) {
  console.log(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nall checks passed");
