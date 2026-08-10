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
await page.getByText("Drop the SkyRecall materials").click();
await page.waitForTimeout(800);
check("reading sweep is on", (await page.locator(".is-reading").count()) > 0);
await page.waitForTimeout(2900);
check("materials become understood", (await page.locator(".file-card.is-understood").count()) >= 6);
await page.getByText("Explore a style", { exact: false }).last().click();
check("style flow step is current", await page.locator(".flow-step.is-current", { hasText: "Style" }).isVisible());
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
await page.getByText("Accept the transformation").click();
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
  localStorage.setItem("osyle.demo.lastSeen", JSON.stringify(Date.now() - 5 * 60 * 60 * 1000));
});
await page.reload();
await page.waitForTimeout(600);
check("since-you-left card appears", await page.locator(".since-card").isVisible());
await page.getByText("Skip").click();
check("since-you-left dismisses", (await page.locator(".since-card").count()) === 0);

check("no console or page errors", errors.length === 0);
if (errors.length) console.log(errors.join("\n"));

await browser.close();
await server.close();
if (failures > 0) {
  console.log(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nall checks passed");
