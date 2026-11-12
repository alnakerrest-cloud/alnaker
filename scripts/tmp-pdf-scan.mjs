// PDF structural scan (PART A/B): page count + embedded image XObjects (filter, dims).
// Read-only. Operates on raw bytes to survive binary streams.
import * as fs from "node:fs";
import * as zlib from "node:zlib";

const buf = fs.readFileSync("50500.pdf");
console.log("PDF bytes:", buf.length);

// ---- page count: /Type /Page but not /Pages ----
const latin = buf.toString("latin1");
const pages = (latin.match(/\/Type\s*\/Page(?![s\/])/g) || []).length;
console.log("Approx pages (/Type/Page):", pages);

// ---- image XObjects ----
const imgs = [];
let i = 0;
while ((i = buf.indexOf("/Subtype", i)) !== -1) {
  const head = buf.slice(i, i + 40).toString("latin1").replace(/\s+/g, "");
  if (head.startsWith("/Subtype/Image")) {
    // dictionary window: look back up to 500 bytes and forward 500
    const win = buf.slice(Math.max(0, i - 500), i + 600).toString("latin1").replace(/\s+/g, " ");
    const W = /\/Width\s+(\d+)/.exec(win)?.[1];
    const H = /\/Height\s+(\d+)/.exec(win)?.[1];
    const filt = (/\/Filter\s*(\[[^\]]*\]|[\/A-Za-z0-9]+)/.exec(win)?.[1] || "").replace(/[\[\]]/g, "").trim();
    const cs = (/\/ColorSpace\s*(\[[^\]]*\]|[\/A-Za-z0-9]+)/.exec(win)?.[1] || "").replace(/[\[\]]/g, "").trim();
    const bpc = /\/BitsPerComponent\s+(\d+)/.exec(win)?.[1];
    imgs.push({ W: +W, H: +H, filt, cs, bpc: +bpc });
  }
  i += 8;
}
console.log("Image XObjects found:", imgs.length);

const byFilter = {};
for (const im of imgs) { const k = im.filt || "?"; (byFilter[k] ??= []).push(im); }
for (const [k, arr] of Object.entries(byFilter)) {
  console.log(`\nFilter ${k}: ${arr.length} images`);
  const dims = arr.map((a) => `${a.W}x${a.H}`).slice(0, 12);
  console.log("  e.g. " + dims.join(", "));
}
// size distribution
const big = imgs.filter((a) => (a.W || 0) * (a.H || 0) >= 120 * 120);
console.log(`\nImages >=120x120 (plausible photos): ${big.length} / ${imgs.length}`);
