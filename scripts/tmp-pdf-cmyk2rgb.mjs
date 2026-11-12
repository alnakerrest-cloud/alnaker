// Proper CMYK->RGB conversion for the carved PDF JPEGs. The PDF stores these as
// CMYK whose values are inverted (transform=0 but sample values are "amount of
// light"), so libjpeg's straight CMYK path yields near-black. We read the raw
// 4-channel samples, interpret them, convert with the standard CMYK->RGB formula,
// and write corrected sRGB JPEGs to pdf-images/final/.
import * as fs from "node:fs";
import * as path from "node:path";
import sharp from "sharp";

const SRC = path.resolve("pdf-images");
const OUT = path.join(SRC, "final");
fs.mkdirSync(OUT, { recursive: true });

const files = fs.readdirSync(SRC).filter((f) => /^ext-\d+\.jpg$/.test(f)).sort();
const report = [];
for (const f of files) {
  const inPath = path.join(SRC, f);
  const meta = await sharp(inPath).metadata();
  if (meta.channels !== 4) {
    // grayscale mask or already RGB -> just normalize to srgb jpeg
    const outPath = path.join(OUT, f);
    await sharp(inPath).toColourspace("srgb").jpeg({ quality: 90 }).toFile(outPath);
    report.push({ file: f, type: meta.channels === 1 ? "mask/gray" : "rgb", w: meta.width, h: meta.height });
    console.log(`  ${f}  ${meta.channels}ch passthrough`);
    continue;
  }
  const { data, info } = await sharp(inPath).raw().toBuffer({ resolveWithObject: true });
  const w = info.width, h = info.height, n = w * h;
  const rgb = Buffer.alloc(n * 3);
  for (let i = 0; i < n; i++) {
    const c = data[i * 4], m = data[i * 4 + 1], y = data[i * 4 + 2], k = data[i * 4 + 3];
    // Samples stored as light amounts (inverted CMYK). Convert directly:
    let R = (c / 255) * (k / 255);
    let G = (m / 255) * (k / 255);
    let B = (y / 255) * (k / 255);
    rgb[i * 3] = Math.round(R * 255);
    rgb[i * 3 + 1] = Math.round(G * 255);
    rgb[i * 3 + 2] = Math.round(B * 255);
  }
  const outPath = path.join(OUT, f);
  await sharp(rgb, { raw: { width: w, height: h, channels: 3 } }).jpeg({ quality: 92, mozjpeg: true }).toFile(outPath);
  const avg = Math.round(rgb.reduce((a, b) => a + b, 0) / rgb.length);
  report.push({ file: f, type: "cmyk->rgb", w, h, avgLuma: avg, outKB: Math.round(fs.statSync(outPath).size / 1024) });
  console.log(`  ${f}  ${w}x${h} avg=${avg} -> ${report.at(-1).outKB}KB`);
}
fs.writeFileSync(path.join(OUT, "final-inventory.json"), JSON.stringify(report, null, 2), "utf8");
console.log("Processed:", report.length);
