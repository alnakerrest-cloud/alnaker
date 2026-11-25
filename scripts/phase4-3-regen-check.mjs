import https from "node:https";

function get(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { "Cache-Control": "no-store", "User-Agent": "Phase4.3-Probe" } }, (res) => {
      let d = "";
      res.on("data", c => d += c);
      res.on("end", () => resolve({ status: res.statusCode, headers: res.headers, body: d }));
    });
    req.on("error", reject);
  });
}

async function run() {
  const ts = Date.now();

  // 1. Force a fresh /ar page - Vercel will serve STALE until background regen
  console.log("== Testing /ar fresh render ==");
  const ar = await get("https://alnaker.vercel.app/ar?fresh=" + ts);
  console.log("  x-vercel-cache:", ar.headers["x-vercel-cache"]);
  console.log("  age:", ar.headers["age"]);
  console.log("  date:", ar.headers["date"]);
  console.log("  tifawhcs count:", (ar.body.match(/tifawhcs/g) || []).length);
  console.log("  damc35hfo count:", (ar.body.match(/damc35hfo/g) || []).length);

  // 2. Wait 2s then request again (Vercel should regenerate in background after STALE hit)
  await new Promise(r => setTimeout(r, 3000));
  const ar2 = await get("https://alnaker.vercel.app/ar?fresh2=" + (ts + 1));
  console.log("\n== /ar second request (after bg regen) ==");
  console.log("  x-vercel-cache:", ar2.headers["x-vercel-cache"]);
  console.log("  age:", ar2.headers["age"]);
  console.log("  date:", ar2.headers["date"]);
  console.log("  tifawhcs count:", (ar2.body.match(/tifawhcs/g) || []).length);
  console.log("  damc35hfo count:", (ar2.body.match(/damc35hfo/g) || []).length);

  // 3. Direct admin login page (SSR)
  const adminLogin = await get("https://alnaker.vercel.app/admin/login");
  console.log("\n== /admin/login ==");
  console.log("  status:", adminLogin.status);
  console.log("  x-vercel-cache:", adminLogin.headers["x-vercel-cache"]);
  console.log("  tifawhcs:", (adminLogin.body.match(/tifawhcs/g) || []).length);
  console.log("  damc35hfo:", (adminLogin.body.match(/damc35hfo/g) || []).length);

  // 4. Check content-version (dynamic, hits actual DB)
  const cv = await get("https://alnaker.vercel.app/api/content-version");
  console.log("\n== /api/content-version ==");
  console.log("  status:", cv.status);
  console.log("  x-vercel-cache:", cv.headers["x-vercel-cache"]);
  console.log("  body:", cv.body.substring(0, 200));

  // 5. Check /api/menu-mode (truly dynamic, reads from DB)
  const mm = await get("https://alnaker.vercel.app/api/menu-mode");
  console.log("\n== /api/menu-mode (Runtime DB proof) ==");
  console.log("  status:", mm.status);
  console.log("  x-vercel-cache:", mm.headers["x-vercel-cache"]);
  const mmData = JSON.parse(mm.body);
  console.log("  mode:", mmData.mode);
  console.log("  noticeTitleAr:", mmData.noticeTitleAr);
  // This data matches naqer_merged_staging if mode is what we set there
}

run().catch(console.error);
