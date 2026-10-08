#!/usr/bin/env node
// Compares Figma exports with browser renders and writes images of where they differ.
//
//   node diff.mjs <manifest.json> [--threshold N] [--radius N]
//   node diff.mjs <figma.png> <react.png> <out-dir> [--threshold N] [--radius N]
//
// For each case it writes, next to the manifest (or into out-dir):
//   diff/<name>.png        black where the images match, red where they don't,
//                          brighter for bigger differences
//   diff/<name>.strip.png  Figma | browser | diff, side by side
//   diff/report.html       every case's strip with its numbers (manifest mode)
//
// Both images are composited over white before comparing, so transparent
// margins and shadows compare by what they'd look like on a white page. A pixel
// counts as different only when no pixel within --radius (default 1) in the
// other image is within --threshold (default 16, out of 255, on every channel).
// That absorbs anti-aliasing and sub-pixel shifts without hiding real changes.
// No dependencies.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve, join, basename, relative } from "node:path";
import zlib from "node:zlib";

const args = process.argv.slice(2);
const opt = (name, dflt) => { const i = args.indexOf(name); if (i < 0) return dflt; const v = Number(args[i + 1]); args.splice(i, 2); return v; };
const THRESHOLD = opt("--threshold", 16);
const RADIUS = opt("--radius", 1);

// --- PNG decode/encode (8-bit, non-interlaced; every color type) ---
function decode(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error("not a PNG");
  let p = 8, w, h, depth, ctype, interlace, palette, trns;
  const idat = [];
  while (p < buf.length) {
    const len = buf.readUInt32BE(p), type = buf.toString("ascii", p + 4, p + 8), data = buf.subarray(p + 8, p + 8 + len);
    if (type === "IHDR") { w = data.readUInt32BE(0); h = data.readUInt32BE(4); depth = data[8]; ctype = data[9]; interlace = data[12]; }
    else if (type === "PLTE") palette = data;
    else if (type === "tRNS") trns = data;
    else if (type === "IDAT") idat.push(data);
    else if (type === "IEND") break;
    p += 12 + len;
  }
  if (depth !== 8 || interlace) throw new Error(`unsupported PNG (bit depth ${depth}, interlace ${interlace})`);
  const ch = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[ctype];
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = w * ch, out = new Uint8ClampedArray(w * h * 4);
  let prev = new Uint8Array(stride), i = 0;
  for (let y = 0; y < h; y++) {
    const f = raw[i++], line = Uint8Array.from(raw.subarray(i, i + stride));
    i += stride;
    for (let x = 0; x < stride; x++) {
      const a = x >= ch ? line[x - ch] : 0, b = prev[x], c = x >= ch ? prev[x - ch] : 0;
      if (f === 1) line[x] += a;
      else if (f === 2) line[x] += b;
      else if (f === 3) line[x] += (a + b) >> 1;
      else if (f === 4) { const q = a + b - c, pa = Math.abs(q - a), pb = Math.abs(q - b), pc = Math.abs(q - c); line[x] += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
    }
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4, s = x * ch;
      if (ctype === 6) { out[o] = line[s]; out[o + 1] = line[s + 1]; out[o + 2] = line[s + 2]; out[o + 3] = line[s + 3]; }
      else if (ctype === 2) { out[o] = line[s]; out[o + 1] = line[s + 1]; out[o + 2] = line[s + 2]; out[o + 3] = 255; }
      else if (ctype === 0) { out[o] = out[o + 1] = out[o + 2] = line[s]; out[o + 3] = 255; }
      else if (ctype === 4) { out[o] = out[o + 1] = out[o + 2] = line[s]; out[o + 3] = line[s + 1]; }
      else { const k = line[s]; out[o] = palette[k * 3]; out[o + 1] = palette[k * 3 + 1]; out[o + 2] = palette[k * 3 + 2]; out[o + 3] = trns && k < trns.length ? trns[k] : 255; }
    }
    prev = line;
  }
  return { w, h, data: out };
}
const CRC = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
const crc32 = buf => { let c = -1; for (const b of buf) c = CRC[(c ^ b) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
function chunk(type, data) {
  const td = Buffer.concat([Buffer.from(type, "ascii"), data]), out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0); td.copy(out, 4); out.writeUInt32BE(crc32(td), 8 + data.length);
  return out;
}
function encode({ w, h, data }) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) Buffer.from(data.buffer, data.byteOffset + y * w * 4, w * 4).copy(raw, y * (w * 4 + 1) + 1);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}

// --- comparison ---
// Composite over white into a w x h canvas (larger images are cropped, smaller padded with white).
function flatten(img, w, h) {
  const out = new Uint8ClampedArray(w * h * 3).fill(255);
  for (let y = 0; y < Math.min(h, img.h); y++) for (let x = 0; x < Math.min(w, img.w); x++) {
    const s = (y * img.w + x) * 4, o = (y * w + x) * 3, a = img.data[s + 3] / 255;
    for (let k = 0; k < 3; k++) out[o + k] = img.data[s + k] * a + 255 * (1 - a);
  }
  return out;
}
function compare(A, B) {
  const w = Math.max(A.w, B.w), h = Math.max(A.h, B.h);
  const a = flatten(A, w, h), b = flatten(B, w, h);
  const dist = (p, q, i, j) => Math.max(Math.abs(p[i] - q[j]), Math.abs(p[i + 1] - q[j + 1]), Math.abs(p[i + 2] - q[j + 2]));
  // True when some pixel near (x, y) in q is within the threshold of p's pixel at (x, y).
  const near = (p, q, x, y) => {
    const i = (y * w + x) * 3;
    for (let dy = -RADIUS; dy <= RADIUS; dy++) for (let dx = -RADIUS; dx <= RADIUS; dx++) {
      const X = x + dx, Y = y + dy;
      if (X < 0 || Y < 0 || X >= w || Y >= h) continue;
      if (dist(p, q, i, (Y * w + X) * 3) <= THRESHOLD) return true;
    }
    return false;
  };
  const diff = new Uint8ClampedArray(w * h * 4);
  let count = 0, maxDelta = 0, x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const o = (y * w + x) * 4;
    diff[o + 3] = 255;
    if (near(a, b, x, y) && near(b, a, x, y)) continue;
    const d = dist(a, b, (y * w + x) * 3, (y * w + x) * 3);
    count++; maxDelta = Math.max(maxDelta, d);
    x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
    diff[o] = 96 + Math.round((159 * d) / 255);
  }
  return {
    w, h, diff: { w, h, data: diff }, count, percent: (100 * count) / (w * h), maxDelta,
    bbox: x1 < 0 ? null : [x0, y0, x1 - x0 + 1, y1 - y0 + 1], sizes: [[A.w, A.h], [B.w, B.h]],
  };
}
// Figma | browser | diff, on white, with gray gutters.
function strip(A, B, D) {
  const g = 8, w = A.w + B.w + D.w + g * 4, h = Math.max(A.h, B.h, D.h) + g * 2;
  const out = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < out.length; i += 4) { out[i] = out[i + 1] = out[i + 2] = 200; out[i + 3] = 255; }
  let ox = g;
  for (const img of [A, B, D]) {
    for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) {
      const s = (y * img.w + x) * 4, o = ((y + g) * w + x + ox) * 4, a = img.data[s + 3] / 255;
      for (let k = 0; k < 3; k++) out[o + k] = img.data[s + k] * a + 255 * (1 - a);
      out[o + 3] = 255;
    }
    ox += img.w + g;
  }
  return { w, h, data: out };
}

function run(name, figmaPath, reactPath, outDir) {
  const A = decode(readFileSync(figmaPath)), B = decode(readFileSync(reactPath));
  const r = compare(A, B);
  mkdirSync(outDir, { recursive: true });
  const diffPath = join(outDir, `${name}.png`), stripPath = join(outDir, `${name}.strip.png`);
  writeFileSync(diffPath, encode(r.diff));
  writeFileSync(stripPath, encode(strip(A, B, r.diff)));
  const size = r.sizes[0][0] === r.sizes[1][0] && r.sizes[0][1] === r.sizes[1][1] ? "" : `  SIZE MISMATCH figma ${r.sizes[0].join("x")} browser ${r.sizes[1].join("x")}`;
  console.log(`${name}: ${r.percent.toFixed(2)}% different (${r.count} px), max delta ${r.maxDelta}${r.bbox ? `, region x ${r.bbox[0]} y ${r.bbox[1]} ${r.bbox[2]}x${r.bbox[3]}` : ""}${size}`);
  return { name, ...r, diffPath, stripPath, size };
}

if (args.length === 3 && args[0].endsWith(".png")) {
  run(basename(args[1], ".png"), args[0], args[1], args[2]);
} else if (args.length === 1) {
  const manifest = JSON.parse(readFileSync(args[0], "utf8"));
  const base = dirname(resolve(args[0])), outDir = join(base, "diff");
  const results = manifest.cases.map(c => {
    try { return run(c.name, resolve(base, c.figma), resolve(base, c.react), outDir); }
    catch (e) { console.error(`${c.name}: FAILED ${e.message}`); return { name: c.name, error: e.message }; }
  });
  const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const rows = results.map(r => r.error
    ? `<h2>${esc(r.name)}</h2><p>Failed: ${esc(r.error)}</p>`
    : `<h2>${esc(r.name)}</h2><p>${r.percent.toFixed(2)}% different, max delta ${r.maxDelta}${esc(r.size)}</p><img src="${esc(relative(outDir, r.stripPath))}">`);
  writeFileSync(join(outDir, "report.html"), `<!doctype html><meta charset="utf-8"><title>Figma vs browser</title>
<style>body{font:14px system-ui;margin:24px;background:#eee}img{max-width:100%;image-rendering:pixelated}h2{font-size:15px;margin:24px 0 4px}p{margin:0 0 8px;color:#555}</style>
<p>Figma | browser | diff. Threshold ${THRESHOLD}, radius ${RADIUS}.</p>${rows.join("\n")}`);
  console.log(`report: ${join(outDir, "report.html")}`);
  if (results.some(r => r.error)) process.exit(1);
} else {
  console.error("usage: node diff.mjs <manifest.json> | <figma.png> <react.png> <out-dir>  [--threshold N] [--radius N]");
  process.exit(2);
}
