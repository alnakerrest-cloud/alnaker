import https from "node:https";

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { "Cache-Control": "no-cache", "User-Agent": "Mozilla/5.0" } }, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => resolve({ statusCode: res.statusCode, headers: res.headers, body: data }));
    }).on("error", reject);
  });
}

async function run() {
  const url = "https://alnaker.vercel.app/ar?nocache=" + Date.now();
  console.log("Fetching", url);
  const res = await get(url);
  console.log("Status:", res.statusCode);
  console.log("Headers:", {
    "x-vercel-id": res.headers["x-vercel-id"],
    "x-vercel-cache": res.headers["x-vercel-cache"],
    "age": res.headers["age"],
    "date": res.headers["date"],
    "x-matched-path": res.headers["x-matched-path"],
    "content-length": res.headers["content-length"]
  });

  const body = res.body;
  console.log("Body length:", body.length);
  console.log("tifawhcs count:", (body.match(/tifawhcs/g) || []).length);
  console.log("damc35hfo count:", (body.match(/damc35hfo/g) || []).length);

  const cloudinaryUrls = Array.from(new Set(body.match(/https:\/\/[^"'\s]+cloudinary[^"'\s]+/g) || []));
  console.log("Unique Cloudinary URLs found:", cloudinaryUrls.length);
  console.log("First 10 Cloudinary URLs:", cloudinaryUrls.slice(0, 10));

  // Check categories and products
  const mandiUrls = cloudinaryUrls.filter(u => u.includes("mandi"));
  console.log("Mandi URLs:", mandiUrls);
}

run().catch(console.error);
