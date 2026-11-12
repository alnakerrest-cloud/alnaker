// Render page 1 at high DPI (correct color) and auto-detect the food-image
// regions by connected-component analysis against the cream background, then
// crop each region to pdf-images/crops/. Read-only on the PDF.
import * as fs from "node:fs";
import * as path from "node:path";
import * as mupdf from "mupdf";
import sharp from "sharp";

const DPI = 300;
const scale = DPI / 72;
const buf = fs.readFileSync("50500.pdf");
const doc = mupdf.Document.openDocument(buf, "application/pdf");
const page = doc.loadPage(0);
const pix = page.toPixmap([scale, 0, 0, scale, 0, 0], mupdf.ColorSpace.DeviceRGB, false, true);
const png = Buffer.from(pix.asPNG());
page.destroy(); doc.destroy();

const { data, info } = await sharp(png).raw().toBuffer({ resolveWithObject: true });
const W = info.width, H = info.height;
console.log("page1 px:", W, "x", H);

// background = median-ish of border pixels
function px(x, y) { const i = (y * W + x) * info.channels; return [data[i], data[i + 1], data[i + 2]]; }
const border = [];
for (let x = 0; x < W; x += 40) { border.push(px(x, 2)); border.push(px(x, H - 3)); }
for (let y = 0; y < H; y += 40) { border.push(px(2, y)); border.push(px(W - 3, y)); }
const bg = [0, 1, 2].map((c) => border.reduce((a, p) => a + p[c], 0) / border.length);
console.log("bg rgb:", bg.map((v) => Math.round(v)));

const TH = 55;
const mask = new Uint8Array(W * H);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const [r, g, b] = px(x, y);
  const d = Math.max(Math.abs(r - bg[0]), Math.abs(g - bg[1]), Math.abs(b - bg[2]));
  mask[y * W + x] = d > TH ? 1 : 0;
}

// connected components (BFS) with downsampled stride for speed
const seen = new Uint8Array(W * H);
const boxes = [];
const stack = [];
for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) {
  const s = y * W + x;
  if (!mask[s] || seen[s]) continue;
  seen[s] = 1; stack.length = 0; stack.push(s);
  let minx = x, maxx = x, miny = y, maxy = y, count = 0;
  while (stack.length) {
    const idx = stack.pop(); count++;
    const cy = (idx / W) | 0, cx = idx % W;
    if (cx < minx) minx = cx; if (cx > maxx) maxx = cx;
    if (cy < miny) miny = cy; if (cy > maxy) maxy = cy;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = cx + dx, ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const ni = ny * W + nx;
      if (mask[ni] && !seen[ni]) { seen[ni] = 1; stack.push(ni); }
    }
  }
  const bw = maxx - minx, bh = maxy - miny;
  const area = bw * bh;
  if (count > 8000 && bw > 160 && bh > 120 && area < W * H * 0.35) {
    boxes.push({ x: minx, y: miny, w: bw, h: bh, fill: count / area });
  }
}
boxes.sort((a, b) => (a.y - b.y) || (a.x - b.x));
console.log("detected regions:", boxes.length);

const OUT = path.resolve("pdf-images", "crops");
fs.mkdirSync(OUT, { recursive: true });
for (const f of fs.readdirSync(OUT)) fs.unlinkSync(path.join(OUT, f));
const report = [];
boxes.forEach((b, i) => {
  const pad = 6;
  const left = Math.max(0, b.x - pad), top = Math.max(0, b.y - pad);
  const width = Math.min(W - left, b.w + pad * 2), height = Math.min(H - top, b.h + pad * 2);
  const name = `crop-${String(i + 1).padStart(2, "0")}.png`;
  sharp(png).extract({ left, top, width, height }).png().toFile(path.join(OUT, name));
  report.push({ file: name, left, top, width, height, fill: +b.fill.toFixed(2) });
  console.log(`  ${name} @(${left},${top}) ${width}x${height} fill=${b.fill.toFixed(2)}`);
});
fs.writeFileSync(path.join(OUT, "crops-report.json"), JSON.stringify(report, null, 2), "utf8");
fs.writeFileSync(path.join(OUT, "page1-full.png"), png);
