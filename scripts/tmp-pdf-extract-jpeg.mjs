// Carve original-quality embedded JPEG photos from 50500.pdf using PDF stream
// framing (stream ... endstream) instead of a marker walk, so boundaries are exact.
// A DCTDecode image stream IS a raw JPEG, so any framed stream beginning with
// FFD8FF and ending FFD9 is a full embedded photo. Read-only on the PDF.
import * as fs from "node:fs";
import * as path from "node:path";

const buf = fs.readFileSync("50500.pdf");
const OUT = path.resolve("pdf-images");
fs.mkdirSync(OUT, { recursive: true });

// clean previously carved files
for (const f of fs.readdirSync(OUT)) if (/^ext-\d+\.jpg$/.test(f)) fs.unlinkSync(path.join(OUT, f));

const K_STREAM = Buffer.from("stream");
const K_ENDSTREAM = Buffer.from("endstream");

function dimsOf(s) {
  let i = 2;
  while (i < s.length - 9) {
    if (s[i] !== 0xff) { i++; continue; }
    const m = s[i + 1];
    if ((m >= 0xc0 && m <= 0xcf) && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) {
      const h = (s[i + 5] << 8) | s[i + 6];
      const w = (s[i + 7] << 8) | s[i + 8];
      return { w, h };
    }
    if (m === 0xd8 || m === 0x01 || (m >= 0xd0 && m <= 0xd7)) { i += 2; continue; }
    const len = (s[i + 2] << 8) | s[i + 3];
    i += 2 + len;
  }
  return { w: 0, h: 0 };
}

const found = [];
let p = 0;
while ((p = buf.indexOf(K_STREAM, p)) !== -1) {
  let s = p + K_STREAM.length;
  if (buf[s] === 0x0d) s++;
  if (buf[s] === 0x0a) s++;
  const e = buf.indexOf(K_ENDSTREAM, s);
  if (e === -1) break;
  // trim trailing whitespace before endstream
  let end = e;
  while (end > s && (buf[end - 1] === 0x0a || buf[end - 1] === 0x0d)) end--;
  const slice = buf.subarray(s, end);
  if (slice.length > 3000 && slice[0] === 0xff && slice[1] === 0xd8 && slice[2] === 0xff &&
      slice[slice.length - 2] === 0xff && slice[slice.length - 1] === 0xd9) {
    const d = dimsOf(slice);
    found.push({ start: s, len: slice.length, ...d });
  }
  p = e + K_ENDSTREAM.length;
}

const report = [];
found.forEach((f, idx) => {
  const name = `ext-${String(idx + 1).padStart(2, "0")}.jpg`;
  fs.writeFileSync(path.join(OUT, name), buf.subarray(f.start, f.start + f.len));
  report.push({ file: name, w: f.w, h: f.h, bytes: f.len, offset: f.start });
});
fs.writeFileSync(path.join(OUT, "inventory.json"), JSON.stringify(report, null, 2), "utf8");
console.log("Carved JPEGs:", report.length);
for (const r of report) console.log(`  ${r.file}  ${r.w}x${r.h}  ${(r.bytes / 1024).toFixed(0)}KB  @${r.offset}`);
