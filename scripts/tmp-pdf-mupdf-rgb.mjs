// Convert the carved original-resolution CMYK JPEGs to correct-color sRGB using
// MuPDF's Image.asRGB() (proper CMYK + Adobe handling), preserving original
// dimensions/quality. Writes pdf-images/correct/ext-NN.jpg.
import * as fs from "node:fs";
import * as path from "node:path";
import * as mupdf from "mupdf";
import sharp from "sharp";

const SRC = path.resolve("pdf-images");
const OUT = path.join(SRC, "correct");
fs.mkdirSync(OUT, { recursive: true });

const files = fs.readdirSync(SRC).filter((f) => /^ext-\d+\.jpg$/.test(f)).sort();
const report = [];
for (const f of files) {
  const data = fs.readFileSync(path.join(SRC, f));
  const img = new mupdf.Image(data);
  const w0 = img.getWidth(), h0 = img.getHeight(), nc = img.getNumberOfComponents();
  const pix = img.toPixmap([1, 0, 0, 1, 0, 0], mupdf.ColorSpace.DeviceRGB, false, true);
  const png = pix.asPNG();
  // re-encode PNG->JPEG (quality 92) for compact upload-ready files
  const outPath = path.join(OUT, f);
  const info = await sharp(Buffer.from(png)).jpeg({ quality: 92, mozjpeg: true }).toFile(outPath);
  const avg = await sharp(outPath).stats().then((s) => Math.round(s.channels.slice(0, 3).reduce((a, c) => a + c.mean, 0) / 3));
  report.push({ file: f, comps: nc, w: info.width, h: info.height, avg, outKB: Math.round(fs.statSync(outPath).size / 1024) });
  console.log(`  ${f}  ${nc}c ${w0}x${h0} -> sRGB ${info.width}x${info.height} avg=${avg} ${report.at(-1).outKB}KB`);
  pix.destroy(); img.destroy();
}
fs.writeFileSync(path.join(OUT, "correct-inventory.json"), JSON.stringify(report, null, 2), "utf8");
console.log("Converted:", report.length);
