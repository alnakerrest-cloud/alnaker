// Verify PDF-derived image URLs stored in DB are publicly reachable (HEAD 200).
import * as path from "node:path";
import dotenv from "dotenv";
import pg from "pg";
dotenv.config({ path: path.resolve(".env.local") });

const c = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: true });
await c.connect();
const p = await c.query(`select "publicId", url from "ProductImage" where "publicId" like '%/pdf-%' order by "publicId"`);
const cat = await c.query(`select slug, "imagePublicId", "imageUrl" from "Category" where "imagePublicId" like '%/pdf-%'`);
const rows = [...p.rows.map((x) => ({ tag: "prod", id: x.publicId, url: x.url })), ...cat.rows.map((x) => ({ tag: "cat", id: x.imagePublicId, url: x.imageUrl }))];
let ok = 0, bad = 0;
for (const r of rows) {
  try {
    const h = await fetch(r.url, { method: "HEAD" });
    if (h.ok) { ok++; console.log(`200 [${r.tag}] ${r.id}`); }
    else { bad++; console.log(`FAIL ${h.status} [${r.tag}] ${r.id}`); }
  } catch (e) { bad++; console.log(`ERR [${r.tag}] ${r.id} ${e.message}`); }
}
console.log(`\nproductImages=${p.rowCount} categoryImages=${cat.rowCount} reachable OK=${ok} BAD=${bad}`);
await c.end();
