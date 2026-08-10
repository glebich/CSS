/**
 * Bundle the built app into one self-contained HTML fragment for the
 * claude.ai artifact page. The host wraps the file in its own
 * doctype/head/body skeleton, so this emits body content only, and
 * every injection uses function replacements so `$&` and friends in
 * the minified bundle are never interpreted as replacement patterns.
 */
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const app = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const dist = path.join(app, "dist");
const assets = readdirSync(path.join(dist, "assets"));
const css = readFileSync(path.join(dist, "assets", assets.find((f) => f.endsWith(".css"))), "utf8");
const rawJs = readFileSync(path.join(dist, "assets", assets.find((f) => f.endsWith(".js"))), "utf8");

const js = rawJs.replace(/<\/script/gi, () => "<\\/script").replace(/<!--/g, () => "<\\!--");
const safeCss = css.replace(/<\//g, () => "<\\/");

const out = [
  "<title>Osyle</title>",
  `<style>${safeCss}</style>`,
  '<div id="root"></div>',
  `<script type="module">${js}</script>`,
].join("\n");

const target = process.argv[2];
if (!target) {
  console.error("usage: node scripts/bundle-artifact.mjs <output.html>");
  process.exit(1);
}
writeFileSync(target, out);
console.log(`wrote ${out.length} bytes to ${target}`);
