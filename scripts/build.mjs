// Builds the static site for GitHub Pages into _site/:
//   /        Fuel Log as an installable app (PWA)
//   /demo/   the same app preloaded with example data
// index.html is written as a Claude artifact (no <html>/<head>), so this wraps
// it in a full document.
import { readFileSync, writeFileSync, mkdirSync, cpSync, rmSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "_site");
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

const RESET = `<style>:root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0;font:14px system-ui,sans-serif}img{max-width:100%}[hidden]{display:none!important}</style>`;
const SCRIPTS = ["commonfoods.js", "nutrition.js", "exercises.js", "workouts.js", "train.js", "importers.js"];

// Head-only tags (title, meta, link, style) lead the source; the rest is body.
function wrap(src, extraHead = "", extraBody = "") {
  const i = src.search(/\n<(div|main|header|nav)[\s>]/);
  return `<!doctype html>\n<html lang="en-GB">\n<head>\n<meta charset="utf-8">\n${RESET}\n${src.slice(0, i)}\n${extraHead}\n</head>\n<body>${src.slice(i)}\n${extraBody}\n</body>\n</html>\n`;
}
export function demoPage(src) {
  return src.replace("<title>Fuel Log</title>", "<title>Fuel Log Demo</title>")
    .replace('<script src="train.js"></script>', '<script src="train.js"></script>\n<script src="demo.js"></script>');
}

const app = readFileSync(join(root, "index.html"), "utf8");
writeFileSync(join(out, "index.html"), wrap(app, `<link rel="manifest" href="manifest.webmanifest">
<meta name="theme-color" content="#F3F3F0" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0B0B0C" media="(prefers-color-scheme: dark)">
<link rel="icon" href="icons/icon-192.png">
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Fuel Log">
<meta name="apple-mobile-web-app-status-bar-style" content="default">`,
`<script>
if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
// Ask the browser not to clear the log when space is short.
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
</script>`));
let hashed = app;
for (const f of SCRIPTS) { const t = readFileSync(join(root, f), "utf8"); writeFileSync(join(out, f), t); hashed += t; }
cpSync(join(root, "pwa/icons"), join(out, "icons"), { recursive: true });
cpSync(join(root, "pwa/manifest.webmanifest"), join(out, "manifest.webmanifest"));
const sw = readFileSync(join(root, "pwa/sw.js"), "utf8");
const version = createHash("sha256").update(hashed + sw).digest("hex").slice(0, 10);
writeFileSync(join(out, "sw.js"), sw.replace("__VERSION__", version));

// Demo: its own folder and storage key; the service worker leaves it alone.
mkdirSync(join(out, "demo"), { recursive: true });
writeFileSync(join(out, "demo/index.html"), wrap(demoPage(app)));
for (const f of [...SCRIPTS, "demo.js"]) cpSync(join(root, f), join(out, "demo", f));

writeFileSync(join(out, ".nojekyll"), "");
console.log(`Built _site (cache ${version})`);
