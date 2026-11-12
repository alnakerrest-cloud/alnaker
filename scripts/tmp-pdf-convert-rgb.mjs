// Convert the carved CMYK JPEGs to correct sRGB using sharp, so they display
// properly in browsers and on Cloudinary. Writes pdf-images/rgb/ext-NN.jpg.
import * as fs from "node:fs";
import * as path from "node:path";
import sharp from "sharp";

const SRC = path.resolve("pdf-images");
const OUT = path.join(SRC, "rgb");
fs.mkdirSync(OUT, { recursive: true });

const files = fs.readdirSync(SRC).filter((f) => /^ext-\d+\.jpg$/.test(f)).sort();
const report = [];
for (const f of files) {
  const inPath = path.join(SRC, f);
  const meta = await sharp(inPath).metadata();
  const outPath = path.join(OUT, f);
  await sharp(inPath).toColourspace("srgb").jpeg({ quality: 90, mozjpeg: true }).toFile(outPath);
  const om = await sharp(outPath).metadata();
  report.push({ file: f, srcSpace: meta.space, srcCh: meta.channels, outSpace: om.space, w: om.width, h: om.height, outKB: Math.round(fs.statSync(outPath).size / 1024) });
  console.log(`  ${f}  ${meta.space}/${meta.channels}ch -> ${om.space} ${om.width}x${om.height} ${report.at(-1).outKB}KB`);
}
fs.writeFileSync(path.join(OUT, "rgb-inventory.json"), JSON.stringify(report, null, 2), "utf8");
console.log("Converted:", report.length);
