// Convert selected crops to upload-ready JPEGs (quality 90) named by stable key.
// No network. Output: pdf-images/upload/<key>.jpg
import * as fs from "node:fs";
import * as path from "node:path";
import sharp from "sharp";

const CROPS = path.resolve("pdf-images", "crops");
const OUT = path.resolve("pdf-images", "upload");
fs.mkdirSync(OUT, { recursive: true });

const map = JSON.parse(fs.readFileSync(path.resolve("pdf-images", "mapping.json"), "utf8"));
const items = [
  ...map.products.map((p) => ({ ...p, bucket: "products" })),
  ...map.categories.filter((c) => c.apply).map((c) => ({ ...c, bucket: "categories" })),
];
for (const it of items) {
  const src = path.join(CROPS, it.crop);
  const outPath = path.join(OUT, `${it.key}.jpg`);
  const info = await sharp(src).jpeg({ quality: 90, mozjpeg: true }).toFile(outPath);
  console.log(`  ${it.crop} -> ${it.key}.jpg  ${info.width}x${info.height} ${Math.round(info.size / 1024)}KB`);
}
console.log("Prepared:", items.length);
