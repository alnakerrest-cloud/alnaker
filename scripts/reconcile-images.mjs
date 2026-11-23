import fs from 'fs';
import { curatedCatalog } from './curated-photo-catalog.mjs';

const data = JSON.parse(fs.readFileSync('CLIENT_DATABASE_IMPORT_DATASET.json', 'utf8'));
const prods = data.tables.Product;
const images = data.tables.ProductImage;

const cloudinaryImages = images.filter(i => i.url.includes('cloudinary'));
const localImages = images.filter(i => !i.url.includes('cloudinary'));

console.log('Total products:', prods.length);
console.log('Total ProductImages in dataset:', images.length);
console.log('Cloudinary ProductImages:', cloudinaryImages.length);
console.log('Local ProductImages:', localImages.length);
console.log('Keys in curatedCatalog:', Object.keys(curatedCatalog).length);

const catalogKeys = new Set(Object.keys(curatedCatalog));
const missingInCatalog = [];
localImages.forEach(img => {
  const prod = prods.find(p => p.id === img.productId);
  if (prod && !catalogKeys.has(prod.nameAr)) {
    missingInCatalog.push({ id: prod.id, nameAr: prod.nameAr, url: img.url });
  }
});

const localProdNames = localImages.map(img => {
  const prod = prods.find(p => p.id === img.productId);
  return prod ? prod.nameAr : null;
});

console.log('Total localImages count:', localProdNames.length);
const uniqueLocalNames = new Set(localProdNames);
console.log('Unique local product names count:', uniqueLocalNames.size);

// Find duplicate product names in localImages!
const nameCounts = {};
localProdNames.forEach(n => {
  nameCounts[n] = (nameCounts[n] || 0) + 1;
});
const dupes = Object.entries(nameCounts).filter(([n, c]) => c > 1);
console.log('\n--- Details of duplicate names ---');
['بطاطس', 'كراميل'].forEach(name => {
  const matchingProds = prods.filter(p => p.nameAr === name);
  matchingProds.forEach(p => {
    const sec = data.tables.Section.find(s => s.id === p.sectionId);
    const cat = data.tables.Category.find(c => c.id === (sec ? sec.categoryId : null));
    const img = images.find(i => i.productId === p.id);
    console.log(`Product "${name}" [id: ${p.id}]: Section="${sec ? sec.nameAr : 'none'}", Category="${cat ? cat.nameAr : 'none'}", Image URL="${img ? img.url : 'none'}"`);
  });
});



// Also check if any products in prods have no image in images
const prodIdsWithImg = new Set(images.map(i => i.productId));
const prodsWithoutImg = prods.filter(p => !prodIdsWithImg.has(p.id));
console.log(`\nProducts without any ProductImage record (${prodsWithoutImg.length}):`, prodsWithoutImg);

// Check if any keys in curatedCatalog are NOT in prods
const prodNames = new Set(prods.map(p => p.nameAr));
const catalogKeysNotInProds = Object.keys(curatedCatalog).filter(k => !prodNames.has(k));
console.log(`\nCatalog keys not matching a product nameAr (${catalogKeysNotInProds.length}):`, catalogKeysNotInProds);
