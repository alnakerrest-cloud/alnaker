import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { curatedCatalog } from './curated-photo-catalog.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const prods = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'product-inventory-data.json'), 'utf8'));

const needsImage = prods.filter(p => !p.currentImage);
console.log(`Total products needing image: ${needsImage.length}`);

let matchedCount = 0;
let missing = [];

for (const p of needsImage) {
  const c = curatedCatalog[p.nameAr.trim()];
  if (c) {
    matchedCount++;
  } else {
    missing.push({ nameAr: p.nameAr, cat: p.categoryNameAr, id: p.id });
  }
}

console.log(`Matched: ${matchedCount} / ${needsImage.length}`);
if (missing.length > 0) {
  console.log('Missing items in catalog:');
  console.table(missing);
}

