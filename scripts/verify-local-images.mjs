import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { curatedCatalog } from './curated-photo-catalog.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, '..', 'public');

const prods = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'product-inventory-data.json'), 'utf8'));

console.log('Verifying all 137 local images on disk...');
let missing = 0;
let valid = 0;
let totalSize = 0;

for (const p of prods) {
  if (p.currentImage && p.currentImage.includes('cloudinary')) {
    // PDF original image - preserved
    continue;
  }
  const entry = curatedCatalog[p.nameAr.trim()];
  if (!entry) {
    console.error(`Missing catalog entry for product: ${p.nameAr} (${p.categoryNameAr})`);
    missing++;
    continue;
  }
  const relPath = path.join('images', 'products', entry.category, entry.filename);
  const absPath = path.join(publicDir, relPath);

  // If file doesn't exist, check if lemon-mint needs copy
  if (!fs.existsSync(absPath)) {
    if (entry.filename === 'lemon-mint-smoothie.webp') {
      const src = path.join(publicDir, 'images', 'products', 'juices', 'lemon-mint.webp');
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, absPath);
      }
    }
  }

  if (fs.existsSync(absPath)) {
    const stat = fs.statSync(absPath);
    totalSize += stat.size;
    valid++;
  } else {
    console.error(`File NOT found on disk: ${relPath} for [${p.nameAr}]`);
    missing++;
  }
}

console.log(`\n--- LOCAL IMAGE DISK VERIFICATION ---`);
console.log(`Valid verified files on disk: ${valid}`);
console.log(`Missing files on disk: ${missing}`);
console.log(`Total size of all new product images: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
console.log(`Average size per image: ${(totalSize / valid / 1024).toFixed(1)} KB`);

