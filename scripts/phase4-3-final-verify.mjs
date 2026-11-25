import pg from "pg";
import dotenv from "dotenv";
import fs from "fs";
import https from "node:https";

// Read prod bak for source DB (Read-Only check)
const prodEnv = dotenv.parse(fs.readFileSync(".env.prod.bak"));
const sourceDbUrl = prodEnv.DATABASE_URL;

function get(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { "Cache-Control": "no-store", "User-Agent": "Phase4.3-Final" } }, (res) => {
      let d = "";
      res.on("data", c => d += c);
      res.on("end", () => resolve({ status: res.statusCode, headers: res.headers, body: d }));
    });
    req.on("error", reject);
  });
}

async function run() {
  const results = {};

  // 1. API menu-mode (dynamic) — reflects actual runtime DB settings
  console.log("== [A] /api/menu-mode (Runtime DB proof via dynamic serverless function) ==");
  const mmRes = await get("https://alnaker.vercel.app/api/menu-mode");
  const mm = JSON.parse(mmRes.body);
  console.log("  Vercel Cache:", mmRes.headers["x-vercel-cache"]);
  console.log("  Vercel ID:", mmRes.headers["x-vercel-id"]);
  console.log("  mode:", mm.mode);
  console.log("  noticeTitleAr:", mm.noticeTitleAr);
  console.log("  noticeMessageAr:", mm.noticeMessageAr);
  console.log("  expectedResumeAt:", mm.expectedResumeAt);
  results.menuMode = mm;

  // 2. Source DB Read-Only integrity check
  console.log("\n== [B] Source Production DB Read-Only check (ep-soft-dawn-bdu5de43) ==");
  const srcPool = new pg.Pool({ connectionString: sourceDbUrl, ssl: { rejectUnauthorized: false } });
  try {
    const ro = await srcPool.query("SHOW default_transaction_read_only");
    const pCount = await srcPool.query('SELECT count(*) FROM "Product"');
    const oCount = await srcPool.query('SELECT count(*) FROM "Order"');
    const aCount = await srcPool.query('SELECT count(*) FROM "AuditLog"');
    const catMandi = await srcPool.query('SELECT "nameAr", "imageUrl" FROM "Category" WHERE slug = \'mandi\'');
    console.log("  read_only:", ro.rows[0].default_transaction_read_only);
    console.log("  products:", pCount.rows[0].count, "(expected: 150)");
    console.log("  orders:", oCount.rows[0].count, "(expected: 2)");
    console.log("  auditLogs:", aCount.rows[0].count, "(expected: 143)");
    console.log("  mandi imageUrl:", catMandi.rows[0]?.imageUrl);
    results.sourceDb = {
      readOnly: ro.rows[0].default_transaction_read_only,
      products: pCount.rows[0].count,
      orders: oCount.rows[0].count,
      auditLogs: aCount.rows[0].count,
      mandiImageUrl: catMandi.rows[0]?.imageUrl
    };
  } finally {
    await srcPool.end();
  }

  // 3. Force ISR revalidation trigger then check /ar again
  console.log("\n== [C] /ar ISR revalidation status ==");
  // First hit triggers background regen
  const ar1 = await get("https://alnaker.vercel.app/ar?p1=" + Date.now());
  console.log("  Hit 1 - cache:", ar1.headers["x-vercel-cache"], "age:", ar1.headers["age"]);
  // Wait 4 seconds for background regen
  await new Promise(r => setTimeout(r, 4000));
  const ar2 = await get("https://alnaker.vercel.app/ar?p2=" + Date.now());
  console.log("  Hit 2 - cache:", ar2.headers["x-vercel-cache"], "age:", ar2.headers["age"], "date:", ar2.headers["date"]);
  console.log("  tifawhcs:", (ar2.body.match(/tifawhcs/g) || []).length);
  console.log("  damc35hfo:", (ar2.body.match(/damc35hfo/g) || []).length);
  const mandiInHtml = Array.from(new Set(ar2.body.match(/res\.cloudinary\.com\/[^"'\s\\]+mandi[^"'\s\\]*/g) || []));
  console.log("  mandi URLs:", mandiInHtml);
  results.isrCheck = {
    hit2_cache: ar2.headers["x-vercel-cache"],
    hit2_date: ar2.headers["date"],
    tifawhcs: (ar2.body.match(/tifawhcs/g) || []).length,
    damc35hfo: (ar2.body.match(/damc35hfo/g) || []).length,
    mandiUrls: mandiInHtml
  };

  // 4. /en check
  console.log("\n== [D] /en status ==");
  const en = await get("https://alnaker.vercel.app/en?p=" + Date.now());
  console.log("  status:", en.status, "cache:", en.headers["x-vercel-cache"]);
  console.log("  tifawhcs:", (en.body.match(/tifawhcs/g)||[]).length, "damc35hfo:", (en.body.match(/damc35hfo/g)||[]).length);
  results.en = { status: en.status, tifawhcs: (en.body.match(/tifawhcs/g)||[]).length, damc35hfo: (en.body.match(/damc35hfo/g)||[]).length };

  // 5. /admin/login check
  console.log("\n== [E] /admin/login ==");
  const al = await get("https://alnaker.vercel.app/admin/login");
  console.log("  status:", al.status, "cache:", al.headers["x-vercel-cache"]);
  results.adminLogin = { status: al.status, cache: al.headers["x-vercel-cache"] };

  // 6. checkout guard test (safe empty payload - triggers validation, not DB write)
  console.log("\n== [F] /api/checkout guard (empty payload - read-only check for maintenance) ==");
  const checkoutStatus = await new Promise((resolve, reject) => {
    const payload = JSON.stringify({ items: [], locale: "ar", tableId: "verify-only" });
    const req = https.request({
      hostname: "alnaker.vercel.app",
      path: "/api/checkout",
      method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) }
    }, (res) => {
      let d = "";
      res.on("data", c => d += c);
      res.on("end", () => resolve({ status: res.statusCode, body: d, vercelId: res.headers["x-vercel-id"] }));
    });
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
  let co = null;
  try { co = JSON.parse(checkoutStatus.body); } catch {}
  console.log("  status:", checkoutStatus.status, "(400=cart validation, 403=maintenance block, 503=server error)");
  console.log("  response:", co);
  results.checkout = { status: checkoutStatus.status, body: co };

  console.log("\n=== FINAL SUMMARY ===");
  console.log(JSON.stringify(results, null, 2));
}

run().catch(console.error);
