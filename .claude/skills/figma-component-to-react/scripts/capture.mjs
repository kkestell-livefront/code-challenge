#!/usr/bin/env node
// Renders each case in a manifest in Chromium and saves a PNG that lines up
// pixel for pixel with the Figma export of the same case.
//
//   node capture.mjs <manifest.json>
//
// Run it from the React project: Playwright (or @playwright/test) is loaded from
// the current directory. Paths in the manifest are relative to the manifest.
//
// Manifest:
// {
//   "url": "http://localhost:5173/figma-cases",   // default page for every case
//   "scale": 2,                                    // same scale as the Figma exports
//   "cases": [{
//     "name": "state-hover",
//     "url": "...",                                // optional, overrides the default
//     "selector": "[data-figma-case='state-hover'] > *",  // the component's root element
//     "interaction": "hover",                      // optional: "hover" | "focus" | "active"
//     "colorScheme": "dark",                       // optional: "light" (default) | "dark"
//     "frame": [160, 72], "offset": [8, 6], "size": [144, 56],  // from render.js
//     "figma": "figma/state-hover.png",
//     "react": "react/state-hover.png"
//   }]
// }
import { createRequire } from "node:module";
import { readFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

const manifestPath = process.argv[2];
if (!manifestPath) { console.error("usage: node capture.mjs <manifest.json>"); process.exit(2); }
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const base = dirname(resolve(manifestPath));

const require = createRequire(resolve(process.cwd(), "package.json"));
let playwright;
for (const name of ["playwright", "@playwright/test"]) {
  try { playwright = require(name); break; } catch {}
}
if (!playwright) {
  console.error(`Playwright isn't installed in ${process.cwd()}. Install it as a dev dependency, or run from a directory that has it.`);
  process.exit(1);
}

// Keyboard focus, so :focus-visible matches the way it does for a real user.
async function focusByKeyboard(page, el) {
  await page.evaluate(() => document.activeElement && document.activeElement.blur());
  for (let i = 0; i < 500; i++) {
    await page.keyboard.press("Tab");
    if (await el.evaluate(e => e.contains(document.activeElement))) return;
  }
  throw new Error("couldn't reach the element with Tab");
}

const browser = await playwright.chromium.launch();
let failed = 0;
for (const c of manifest.cases) {
  const context = await browser.newContext({
    deviceScaleFactor: manifest.scale,
    colorScheme: c.colorScheme ?? "light",
    viewport: manifest.viewport ?? { width: 1440, height: 900 },
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  try {
    await page.goto(c.url ?? manifest.url, { waitUntil: "networkidle" });
    // The Figma exports are transparent outside the component, so the page must be too.
    await page.addStyleTag({ content: "html, body { background: transparent !important; }" });
    await page.evaluate(() => document.fonts.ready);
    const el = page.locator(c.selector).first();
    await el.waitFor();
    await el.evaluate(e => Promise.all([...e.querySelectorAll("img")].map(i =>
      i.complete ? null : new Promise(r => { i.onload = i.onerror = r; }))));
    await el.scrollIntoViewIfNeeded();
    await page.mouse.move(0, 0);

    if (c.interaction === "hover") await el.hover();
    else if (c.interaction === "focus") await focusByKeyboard(page, el);
    else if (c.interaction === "active") {
      await el.hover();
      await page.mouse.down();
    } else if (c.interaction) throw new Error(`unknown interaction ${c.interaction}`);

    // Page coordinates of the component's box, then the Figma frame around it.
    const box = await el.evaluate(e => {
      const r = e.getBoundingClientRect();
      return { x: r.left + window.scrollX, y: r.top + window.scrollY, width: r.width, height: r.height };
    });
    const [fw, fh] = c.frame, [ol, ot] = c.offset;
    const out = resolve(base, c.react);
    mkdirSync(dirname(out), { recursive: true });
    await page.screenshot({
      path: out, fullPage: true, omitBackground: true, animations: "disabled", caret: "hide",
      clip: { x: Math.round(box.x) - ol, y: Math.round(box.y) - ot, width: fw, height: fh },
    });
    if (c.interaction === "active") await page.mouse.up();

    const note = [];
    if (box.x % 1 || box.y % 1) note.push(`box starts at a fractional pixel (${box.x}, ${box.y}); rounded`);
    if (c.size && (Math.abs(box.width - c.size[0]) > 0.5 || Math.abs(box.height - c.size[1]) > 0.5))
      note.push(`size ${+box.width.toFixed(2)}x${+box.height.toFixed(2)}, Figma ${c.size.join("x")}`);
    console.log(`${c.name}: ${c.react}${note.length ? "  (" + note.join("; ") + ")" : ""}`);
  } catch (e) {
    failed++;
    console.error(`${c.name}: FAILED ${e.message.split("\n")[0]}`);
  } finally {
    await context.close();
  }
}
await browser.close();
process.exit(failed ? 1 : 0);
