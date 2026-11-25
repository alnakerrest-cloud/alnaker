import https from "node:https";

function get(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { "Cache-Control": "no-cache", "User-Agent": "Mozilla/5.0" } }, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => resolve({ statusCode: res.statusCode, headers: res.headers, body: data }));
    });
    req.on("error", reject);
  });
}

async function monitor() {
  console.log("=== Vercel Live Deployment Inspection ===");
  const res = await get("https://alnaker.vercel.app/ar?_ts=" + Date.now());
  console.log("Status:", res.statusCode);
  console.log("Server Date:", res.headers["date"]);
  console.log("x-vercel-id:", res.headers["x-vercel-id"]);
  console.log("x-vercel-cache:", res.headers["x-vercel-cache"]);
  console.log("age:", res.headers["age"]);

  // CSS chunks
  const cssMatches = Array.from(res.body.matchAll(/href="(\/_next\/static\/[^"]+\.css)"/g)).map(m => m[1]);
  console.log("CSS chunks found:", cssMatches);

  let hasCommitFix = false;
  for (const p of cssMatches) {
    const css = await get("https://alnaker.vercel.app" + p);
    if (css.body.includes(".card-foot,.platter-foot,.side-foot,.drink-foot")) {
      hasCommitFix = true;
      console.log(`[VERIFIED] Found commit b69caca5 CSS rule in ${p}`);
    }
  }

  // Cloudinary image audit in live HTML
  const tifawhcsMatches = (res.body.match(/tifawhcs/g) || []).length;
  const damcMatches = (res.body.match(/damc35hfo/g) || []).length;
  console.log("tifawhcs occurrences:", tifawhcsMatches);
  console.log("damc35hfo occurrences:", damcMatches);

  // Script chunks
  const scriptChunks = Array.from(res.body.matchAll(/src="(\/_next\/static\/chunks\/[^"]+\.js)"/g)).map(m => m[1]);
  console.log("Sample script chunks:", scriptChunks.slice(0, 5));

  // Check maintenance banner or state
  const hasMaintenance = res.body.includes("صيانة") || res.body.includes("Maintenance") || res.body.includes("maintenance");
  console.log("Maintenance keyword in HTML:", hasMaintenance);

  return {
    statusCode: res.statusCode,
    hasCommitFix,
    tifawhcsMatches,
    damcMatches,
    headers: res.headers
  };
}

monitor().catch(console.error);
