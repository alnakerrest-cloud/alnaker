import https from "node:https";

function get(url, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "User-Agent": "Mozilla/5.0 Phase4.3 Verification",
        ...extraHeaders
      }
    }, (res) => {
      let data = "";
      res.on("data", c => data += c);
      res.on("end", () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    });
    req.on("error", reject);
  });
}

async function runAll() {
  const results = {};
  const ts = Date.now();

  // --- 1. /ar ---
  console.log("\n[1] Checking /ar ...");
  const ar = await get(`https://alnaker.vercel.app/ar?_v=${ts}`);
  results.ar = {
    status: ar.status,
    "x-vercel-id": ar.headers["x-vercel-id"],
    "x-vercel-cache": ar.headers["x-vercel-cache"],
    "date": ar.headers["date"],
    "age": ar.headers["age"],
    bodyLength: ar.body.length,
    tifawhcs_count: (ar.body.match(/tifawhcs/g) || []).length,
    damc35hfo_count: (ar.body.match(/damc35hfo/g) || []).length,
    maintenance_banner_ar: ar.body.includes("صيانة") || ar.body.includes("أعمال صيانة"),
    view_only_notice: ar.body.includes("DISPLAY_ONLY") || ar.body.includes("ViewOnly") || ar.body.includes("view-only"),
    has_ar_content: ar.body.includes("قرية الناقر") || ar.body.includes("المندي"),
    css_chunk: (ar.body.match(/href="(\/_next\/static\/[^"]+\.css)"/g) || []),
  };

  // Extract CSS chunk and verify content
  const cssLink = ar.body.match(/href="(\/_next\/static\/[^"]+\.css)"/);
  if (cssLink) {
    const css = await get("https://alnaker.vercel.app" + cssLink[1]);
    const hasResponsiveFix = css.body.includes(".card-foot,.platter-foot,.side-foot,.drink-foot");
    results.ar.css_responsive_fix_b69caca5 = hasResponsiveFix;
    results.ar.css_url = cssLink[1];
  }

  // Sample Cloudinary URLs in HTML
  const allCloudinaryUrls = Array.from(new Set(ar.body.match(/https:\/\/res\.cloudinary\.com\/[^"'\s\\]+/g) || []));
  results.ar.cloudinary_urls_sample = allCloudinaryUrls.slice(0, 10);
  results.ar.cloudinary_unique_count = allCloudinaryUrls.length;

  // Mandi category
  const mandiMatch = ar.body.match(/https:\/\/res\.cloudinary\.com\/[^"'\s\\]+mandi[^"'\s\\]*/g);
  results.ar.mandi_banner_urls = mandiMatch ? Array.from(new Set(mandiMatch)) : [];

  // --- 2. /en ---
  console.log("[2] Checking /en ...");
  const en = await get(`https://alnaker.vercel.app/en?_v=${ts}`);
  results.en = {
    status: en.status,
    "x-vercel-id": en.headers["x-vercel-id"],
    tifawhcs_count: (en.body.match(/tifawhcs/g) || []).length,
    damc35hfo_count: (en.body.match(/damc35hfo/g) || []).length,
    has_en_content: en.body.includes("Naqer") || en.body.includes("Mandi"),
    maintenance_en: en.body.includes("Maintenance") || en.body.includes("maintenance"),
  };

  // --- 3. /admin/login ---
  console.log("[3] Checking /admin/login ...");
  const admin = await get(`https://alnaker.vercel.app/admin/login?_v=${ts}`);
  results.admin_login = {
    status: admin.status,
    "x-vercel-id": admin.headers["x-vercel-id"],
    has_login_form: admin.body.includes("email") || admin.body.includes("password") || admin.body.includes("تسجيل"),
  };

  // --- 4. /api/menu-mode ---
  console.log("[4] Checking /api/menu-mode ...");
  const menuMode = await get(`https://alnaker.vercel.app/api/menu-mode?_v=${ts}`);
  let menuModeData = null;
  try { menuModeData = JSON.parse(menuMode.body); } catch {}
  results.api_menu_mode = {
    status: menuMode.status,
    "x-vercel-id": menuMode.headers["x-vercel-id"],
    data: menuModeData,
  };

  // --- 5. /api/checkout (maintenance guard) ---
  console.log("[5] Testing /api/checkout maintenance guard ...");
  const checkoutRes = await new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      items: [],
      tableId: "test-table",
      locale: "ar"
    });
    const req = https.request({
      hostname: "alnaker.vercel.app",
      path: "/api/checkout",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(postData),
        "Cache-Control": "no-cache",
      }
    }, (res) => {
      let d = "";
      res.on("data", c => d += c);
      res.on("end", () => resolve({ status: res.statusCode, body: d, headers: res.headers }));
    });
    req.on("error", reject);
    req.write(postData);
    req.end();
  });
  let checkoutData = null;
  try { checkoutData = JSON.parse(checkoutRes.body); } catch {}
  results.api_checkout = {
    status: checkoutRes.status,
    "x-vercel-id": checkoutRes.headers["x-vercel-id"],
    blocked_by_maintenance: checkoutRes.status === 403 || (checkoutData && (checkoutData.error || checkoutData.code || checkoutData.reason)),
    response: checkoutData,
  };

  // --- 6. Runtime DB identity via /api/debug/products if exists ---
  console.log("[6] Checking /api/debug/products ...");
  const debug = await get(`https://alnaker.vercel.app/api/debug/products?_v=${ts}`);
  let debugData = null;
  try { debugData = JSON.parse(debug.body); } catch {}
  results.api_debug = {
    status: debug.status,
    data: debugData,
  };

  console.log("\n=== RESULTS ===");
  console.log(JSON.stringify(results, null, 2));
  return results;
}

runAll().catch(console.error);
