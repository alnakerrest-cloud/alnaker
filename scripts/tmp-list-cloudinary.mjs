// Read-only Cloudinary asset inventory for naqer-menu/* (PART A). Deletes nothing.
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { v2 as cloudinary } from "cloudinary";

const here = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(here, "..", ".env.local") });
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

try {
  // REST Admin API fallback (SDK api.list not available on this key/SDK build).
  const cloud = process.env.CLOUDINARY_CLOUD_NAME;
  const auth = Buffer.from(`${process.env.CLOUDINARY_API_KEY}:${process.env.CLOUDINARY_API_SECRET}`).toString("base64");
  const all = [];
  let next = null;
  do {
    const url = `https://api.cloudinary.com/v1_1/${cloud}/resources/image/list?prefix=${encodeURIComponent("naqer-menu/")}&max_results=500${next ? "&next_cursor=" + encodeURIComponent(next) : ""}`;
    const r = await fetch(url, { headers: { Authorization: `Basic ${auth}` } });
    if (!r.ok) { console.error("LIST_FAILED http=" + r.status + " " + (await r.text()).slice(0, 200)); process.exit(1); }
    const j = await r.json();
    all.push(...(j.resources || []));
    next = j.next_cursor || null;
  } while (next);
  const res = { resources: all };
  const byDir = {};
  for (const a of res.resources) {
    const dir = a.public_id.split("/").slice(0, -1).join("/");
    (byDir[dir] ??= []).push(a);
  }
  console.log("TOTAL naqer-menu/* image assets: " + res.resources.length);
  for (const [dir, arr] of Object.entries(byDir)) {
    console.log(`\n[${dir || "naqer-menu"}] count=${arr.length}`);
    for (const a of arr) console.log(`  ${a.public_id} | ${a.format} ${a.width}x${a.height} ${a.bytes}B`);
  }
} catch (e) {
  console.error("LIST_FAILED status=" + (e?.http_code ?? "?") + " msg=" + String(e?.message).slice(0, 160));
  process.exit(1);
}
