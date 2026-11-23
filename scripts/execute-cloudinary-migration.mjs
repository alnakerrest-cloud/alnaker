// scripts/execute-cloudinary-migration.mjs
// Safely copies/uploads the 14 verified heritage dish photos from local backup
// into the client Cloudinary account "tifawhcs" under "naqer-menu/products/".
// GATED BY OWNER APPROVAL FLAG.

import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import { v2 as cloudinary } from "cloudinary";

const CLIENT_CLOUD_NAME = "tifawhcs";

async function main() {
  const isApproved = process.env.APPROVE_CLOUDINARY_MIGRATION === "true";
  if (!isApproved) {
    console.error("⛔ SAFETY GATE: Owner approval required. Set APPROVE_CLOUDINARY_MIGRATION=true to proceed.");
    process.exit(1);
  }

  const envFile = process.env.ENV_FILE || ".env.local";
  dotenv.config({ path: envFile });

  if (process.env.CLOUDINARY_CLOUD_NAME !== CLIENT_CLOUD_NAME) {
    console.error(`⛔ SAFETY REFUSAL: Configured cloud_name "${process.env.CLOUDINARY_CLOUD_NAME}" does not match client account "${CLIENT_CLOUD_NAME}".`);
    process.exit(1);
  }

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });

  const mappingFile = path.resolve(process.cwd(), "CLOUDINARY_14_ASSETS_MIGRATION_MAPPING.csv");
  if (!fs.existsSync(mappingFile)) {
    console.error("Mapping file not found.");
    process.exit(1);
  }

  const lines = fs.readFileSync(mappingFile, "utf8").split("\n").filter(Boolean).slice(1);
  console.log(`Starting migration of ${lines.length} assets to Cloudinary (${CLIENT_CLOUD_NAME})...`);

  for (const line of lines) {
    const parts = line.split(",").map(p => p.replace(/^"|"$/g, ""));
    const [productId, productNameAr, category, publicId, localExists, size, oldUrl, targetUrl] = parts;

    const localPath = path.resolve(process.cwd(), `pdf-images/upload/${publicId.split("/").pop()}.jpg`);
    if (!fs.existsSync(localPath)) {
      console.error(`Local file missing for ${productNameAr}: ${localPath}`);
      continue;
    }

    console.log(`Uploading [${productNameAr}] -> ${publicId}...`);
    try {
      const res = await cloudinary.uploader.upload(localPath, {
        public_id: publicId,
        overwrite: true,
        resource_type: "image",
      });
      console.log(`  ✔ Uploaded: ${res.secure_url}`);
    } catch (err) {
      console.error(`  ❌ Failed to upload ${productNameAr}:`, err.message);
    }
  }

  console.log("\n✅ Cloudinary asset migration complete.");
}

main().catch(err => {
  console.error("Fatal:", err);
  process.exit(1);
});
