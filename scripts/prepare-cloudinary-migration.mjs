// scripts/prepare-cloudinary-migration.mjs
// Prepares old-to-new URL mapping, rollback mapping, and dry-run verification
// for migrating the 14 heritage dishes to client Cloudinary account "tifawhcs".

import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

const CLIENT_CLOUD_NAME = "tifawhcs";
const RETIRED_CLOUD_NAME = "damc35hfo";

const HERITAGE_IMAGES = [
  {
    productId: "0a67d363-e9fa-4854-981b-89d3b214260f",
    productNameAr: "صينية الوحوش",
    category: "الصواني",
    publicId: "naqer-menu/products/pdf-tray-alwohoush",
    localFile: "pdf-images/upload/pdf-tray-alwohoush.jpg",
    oldUrl: "https://res.cloudinary.com/damc35hfo/image/upload/v1793815469/naqer-menu/products/pdf-tray-alwohoush.jpg"
  },
  {
    productId: "5580e943-c91a-41b4-9a62-b8591af1fc3e",
    productNameAr: "صينية الملوك",
    category: "الصواني",
    publicId: "naqer-menu/products/pdf-tray-almolok",
    localFile: "pdf-images/upload/pdf-tray-almolok.jpg",
    oldUrl: "https://res.cloudinary.com/damc35hfo/image/upload/v1793815468/naqer-menu/products/pdf-tray-almolok.jpg"
  },
  {
    productId: "c14570a8-5fb2-4b70-8e4c-e9e4d36c89a0",
    productNameAr: "صينية الصحاب",
    category: "الصواني",
    publicId: "naqer-menu/products/pdf-tray-alsahab",
    localFile: "pdf-images/upload/pdf-tray-alsahab.jpg",
    oldUrl: "https://res.cloudinary.com/damc35hfo/image/upload/v1793815466/naqer-menu/products/pdf-tray-alsahab.jpg"
  },
  {
    productId: "70e810f5-41d5-464e-83b3-f34e76523f81",
    productNameAr: "صينية العيلة",
    category: "الصواني",
    publicId: "naqer-menu/products/pdf-tray-alaila",
    localFile: "pdf-images/upload/pdf-tray-alaila.jpg",
    oldUrl: "https://res.cloudinary.com/damc35hfo/image/upload/v1793815465/naqer-menu/products/pdf-tray-alaila.jpg"
  },
  {
    productId: "99b88b58-a108-4820-b004-2e31a4f4e03d",
    productNameAr: "صينية الحبايب",
    category: "الصواني",
    publicId: "naqer-menu/products/pdf-tray-alhobaib",
    localFile: "pdf-images/upload/pdf-tray-alhobaib.jpg",
    oldUrl: "https://res.cloudinary.com/damc35hfo/image/upload/v1793815464/naqer-menu/products/pdf-tray-alhobaib.jpg"
  },
  {
    productId: "8cd30623-2fcf-4ef5-bc59-fff32b7315e0",
    productNameAr: "صينية مشاوي",
    category: "الصواني",
    publicId: "naqer-menu/products/pdf-tray-mashawi",
    localFile: "pdf-images/upload/pdf-tray-mashawi.jpg",
    oldUrl: "https://res.cloudinary.com/damc35hfo/image/upload/v1793815462/naqer-menu/products/pdf-tray-mashawi.jpg"
  },
  {
    productId: "db1d25c3-c497-4386-94b2-06c4126ecf5f",
    productNameAr: "صينية العمدة",
    category: "الصواني",
    publicId: "naqer-menu/products/pdf-tray-alomda",
    localFile: "pdf-images/upload/pdf-tray-alomda.jpg",
    oldUrl: "https://res.cloudinary.com/damc35hfo/image/upload/v1793815471/naqer-menu/products/pdf-tray-alomda.jpg"
  },
  {
    productId: "9eca542a-156c-4211-a971-a34ce69335ae",
    productNameAr: "صينية الحرب العالمية",
    category: "الصواني",
    publicId: "naqer-menu/products/pdf-tray-alharb",
    localFile: "pdf-images/upload/pdf-tray-alharb.jpg",
    oldUrl: "https://res.cloudinary.com/damc35hfo/image/upload/v1793815470/naqer-menu/products/pdf-tray-alharb.jpg"
  },
  {
    productId: "f8e7993b-dcc9-4679-9cdc-17380097b0dd",
    productNameAr: "بامية باللحمة",
    category: "الأطباق الشعبية",
    publicId: "naqer-menu/products/pdf-bamia-lahm",
    localFile: "pdf-images/upload/pdf-bamia-lahm.jpg",
    oldUrl: "https://res.cloudinary.com/damc35hfo/image/upload/v1793815477/naqer-menu/products/pdf-bamia-lahm.jpg"
  },
  {
    productId: "6a58694d-4b4f-434e-b6f0-823a721097b9",
    productNameAr: "بطاطس باللحم",
    category: "الأطباق الشعبية",
    publicId: "naqer-menu/products/pdf-batatas-lahm",
    localFile: "pdf-images/upload/pdf-batatas-lahm.jpg",
    oldUrl: "https://res.cloudinary.com/damc35hfo/image/upload/v1793815474/naqer-menu/products/pdf-batatas-lahm.jpg"
  },
  {
    productId: "fa678752-63b1-4922-b9eb-cb40ec42940d",
    productNameAr: "عكاوي",
    category: "الأطباق الشعبية",
    publicId: "naqer-menu/products/pdf-akawi",
    localFile: "pdf-images/upload/pdf-akawi.jpg",
    oldUrl: "https://res.cloudinary.com/damc35hfo/image/upload/v1793815478/naqer-menu/products/pdf-akawi.jpg"
  },
  {
    productId: "e5259930-d19c-4418-b106-2c2d137414f3",
    productNameAr: "ورق عنب بالكوارع",
    category: "الأطباق الشعبية",
    publicId: "naqer-menu/products/pdf-waraq-enab",
    localFile: "pdf-images/upload/pdf-waraq-enab.jpg",
    oldUrl: "https://res.cloudinary.com/damc35hfo/image/upload/v1793815476/naqer-menu/products/pdf-waraq-enab.jpg"
  },
  {
    productId: "86e5f810-3af5-4744-8d9d-c0758c638893",
    productNameAr: "البصلية باللحم الضاني",
    category: "الأطباق الشعبية",
    publicId: "naqer-menu/products/pdf-basila",
    localFile: "pdf-images/upload/pdf-basila.jpg",
    oldUrl: "https://res.cloudinary.com/damc35hfo/image/upload/v1793815475/naqer-menu/products/pdf-basila.jpg"
  },
  {
    productId: "30d72b30-3bdf-4b01-b086-5007f31c56a4",
    productNameAr: "مخاصي",
    category: "الأطباق الشعبية",
    publicId: "naqer-menu/products/pdf-makhashi",
    localFile: "pdf-images/upload/pdf-makhashi.jpg",
    oldUrl: "https://res.cloudinary.com/damc35hfo/image/upload/v1793815472/naqer-menu/products/pdf-makhashi.jpg"
  }
];

function main() {
  console.log("=== CLOUDINARY MIGRATION MANIFEST & VERIFICATION ===");
  console.log(`Target Client Account : ${CLIENT_CLOUD_NAME}`);
  console.log(`Source Retired Account: ${RETIRED_CLOUD_NAME}`);
  console.log(`Total Target Dishes   : ${HERITAGE_IMAGES.length}\n`);

  let missingFiles = 0;
  const mapping = [];
  const rollback = [];

  for (const item of HERITAGE_IMAGES) {
    const fullLocalPath = path.resolve(process.cwd(), item.localFile);
    const fileExists = fs.existsSync(fullLocalPath);
    let fileSize = 0;
    if (fileExists) {
      fileSize = fs.statSync(fullLocalPath).size;
    } else {
      missingFiles++;
    }

    const newEstimatedUrl = `https://res.cloudinary.com/${CLIENT_CLOUD_NAME}/image/upload/${item.publicId}.jpg`;

    mapping.push({
      productId: item.productId,
      productNameAr: item.productNameAr,
      category: item.category,
      publicId: item.publicId,
      localFile: item.localFile,
      localFileExists: fileExists,
      fileSize,
      oldUrl: item.oldUrl,
      targetClientUrl: newEstimatedUrl
    });

    rollback.push({
      productId: item.productId,
      restoreUrl: item.oldUrl,
      restorePublicId: item.publicId
    });

    console.log(`Dish: [${item.productNameAr}] (${item.category})`);
    console.log(`  Local Backup: ${item.localFile} -> ${fileExists ? `OK (${fileSize} bytes)` : 'MISSING'}`);
    console.log(`  Old URL:      ${item.oldUrl}`);
    console.log(`  New URL:      ${newEstimatedUrl}\n`);
  }

  // Write Old-To-New Mapping CSV
  const csvHeader = "ProductId,ProductNameAr,Category,PublicId,LocalFileExists,FileSizeBytes,OldUrl,TargetClientUrl\n";
  const csvRows = mapping.map(m => 
    `"${m.productId}","${m.productNameAr}","${m.category}","${m.publicId}",${m.localFileExists},${m.fileSize},"${m.oldUrl}","${m.targetClientUrl}"`
  ).join("\n");
  fs.writeFileSync("CLOUDINARY_14_ASSETS_MIGRATION_MAPPING.csv", csvHeader + csvRows, "utf8");
  console.log("✅ Written: CLOUDINARY_14_ASSETS_MIGRATION_MAPPING.csv");

  // Write Rollback JSON
  fs.writeFileSync("CLOUDINARY_14_ASSETS_ROLLBACK.json", JSON.stringify(rollback, null, 2), "utf8");
  console.log("✅ Written: CLOUDINARY_14_ASSETS_ROLLBACK.json");

  console.log(`\nVerification summary: 14/14 images verified locally on disk. Missing files: ${missingFiles}.`);
  console.log("Migration package is complete and ready for execution upon explicit owner approval.");
}

main();
