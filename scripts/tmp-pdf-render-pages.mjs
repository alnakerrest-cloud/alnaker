// Render each PDF page to a correct-color PNG using MuPDF (handles CMYK + SMask
// properly, unlike libjpeg). Also reports page count/bounds. Read-only on PDF.
import * as fs from "node:fs";
import * as path from "node:path";
import * as mupdf from "mupdf";

const buf = fs.readFileSync("50500.pdf");
const doc = mupdf.Document.openDocument(buf, "application/pdf");
const n = doc.countPages();
console.log("pages:", n);
const OUT = path.resolve("pdf-images", "pages");
fs.mkdirSync(OUT, { recursive: true });

const DPI = 150;
const scale = DPI / 72;
for (let i = 0; i < n; i++) {
  const page = doc.loadPage(i);
  const b = page.getBounds();
  const pix = page.toPixmap([scale, 0, 0, scale, 0, 0], mupdf.ColorSpace.DeviceRGB, false, true);
  const png = pix.asPNG();
  const name = `page-${String(i + 1).padStart(2, "0")}.png`;
  fs.writeFileSync(path.join(OUT, name), png);
  console.log(`  ${name} bounds=${JSON.stringify(b)} ${pix.getWidth()}x${pix.getHeight()} ${(png.length / 1024).toFixed(0)}KB`);
  page.destroy();
}
doc.destroy();
