// يُنشئ صورة PNG اختبارية مميّزة (تدرّج + خط قطري) لاختبارات E2E. حُذف بعد الاستخدام.
import zlib from "node:zlib";
import fs from "node:fs";

const W = 800, H = 600;
const VARIANT = Number(process.argv[3] || 0); // يغيّر اللون الأساسي للتمييز البصري بين صورتين

function crc32(buf) {
  let c, table = crc32.table;
  if (!table) {
    table = crc32.table = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c;
    }
  }
  let crc = -1;
  for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  return (crc ^ -1) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const t = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crc]);
}

// raw scanlines: مرشّح 0 + RGB لكل بكسل. لون برتقالي مع خطّان مائلان مختلفان.
const raw = Buffer.alloc(H * (1 + W * 3));
let p = 0;
for (let y = 0; y < H; y++) {
  raw[p++] = 0; // filter none
  for (let x = 0; x < W; x++) {
    let r = 226, g = 120, b = 40; // برتقالي أساسي
    if (VARIANT === 1) { r = 40; g = 130; b = 200; } // أزرق — لإثبات الاستبدال بصريًا
    const band = (x + y) % 120 < 40; // خطوط قطرية
    if (band) { r = 255; g = 200; b = 90; }
    if (VARIANT === 1) band && (r = 120, g = 210, b = 255);
    if (x < 60 || x > W - 60 || y < 60 || y > H - 60) { r = 60; g = 30; b = 20; } // إطار داكن
    raw[p++] = r; raw[p++] = g; raw[p++] = b;
  }
}

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const png = Buffer.concat([
  sig,
  chunk("IHDR", ihdr),
  chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
  chunk("IEND", Buffer.alloc(0)),
]);
const out = process.argv[2] || "e2e-test.png";
fs.writeFileSync(out, png);
console.log("wrote", out, png.length, "bytes");
