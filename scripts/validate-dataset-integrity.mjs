import fs from 'fs';
import path from 'path';

const datasetPath = path.resolve('CLIENT_DATABASE_IMPORT_DATASET.json');
const data = JSON.parse(fs.readFileSync(datasetPath, 'utf8'));
const tables = data.tables;

const errors = [];
const warnings = [];

// Helper
function checkUniqueness(arr, field, tableName) {
  const seen = new Set();
  const dupes = [];
  arr.forEach(item => {
    const val = item[field];
    if (seen.has(val)) dupes.push(val);
    seen.add(val);
  });
  if (dupes.length > 0) {
    errors.push(`[${tableName}] Duplicate ${field} found: ${dupes.join(', ')}`);
  }
}

// 1. Check counts
console.log('--- Checking Entity Counts ---');
const expected = {
  RestaurantSettings: 1,
  Branch: 2,
  Category: 17,
  Section: 26,
  Product: 151,
  ProductVariant: 167,
  ProductImage: 151,
  OptionGroup: 9,
  OptionItem: 20,
  ProductOptionGroup: 30
};

for (const [table, expCount] of Object.entries(expected)) {
  const actual = tables[table] ? tables[table].length : 0;
  console.log(`${table}: actual=${actual}, expected=${expCount}`);
  if (actual !== expCount) {
    errors.push(`[${table}] Count mismatch: expected ${expCount}, got ${actual}`);
  }
}

// 2. Uniqueness of Primary Keys
for (const table of Object.keys(tables)) {
  checkUniqueness(tables[table], 'id', table);
}

// Category slug uniqueness
checkUniqueness(tables.Category, 'slug', 'Category');

// ProductOptionGroup composite uniqueness [productId, groupId]
const pogSet = new Set();
tables.ProductOptionGroup.forEach(pog => {
  const key = `${pog.productId}_${pog.groupId}`;
  if (pogSet.has(key)) {
    errors.push(`[ProductOptionGroup] Duplicate pair productId+groupId: ${key}`);
  }
  pogSet.add(key);
});

// 3. Foreign Key References & Orphan Checks
const catIds = new Set(tables.Category.map(c => c.id));
const secIds = new Set(tables.Section.map(s => s.id));
const prodIds = new Set(tables.Product.map(p => p.id));
const optGroupIds = new Set(tables.OptionGroup.map(g => g.id));

// Sections -> Category
tables.Section.forEach(sec => {
  if (!catIds.has(sec.categoryId)) {
    errors.push(`[Section ${sec.id}] Orphaned: categoryId ${sec.categoryId} does not exist`);
  }
});

// Products -> Section
tables.Product.forEach(prod => {
  if (!secIds.has(prod.sectionId)) {
    errors.push(`[Product ${prod.id}] Orphaned: sectionId ${prod.sectionId} does not exist`);
  }
  if (!prod.nameAr || prod.nameAr.trim() === '') {
    errors.push(`[Product ${prod.id}] Missing required nameAr`);
  }
});

// ProductVariant -> Product
tables.ProductVariant.forEach(pv => {
  if (!prodIds.has(pv.productId)) {
    errors.push(`[ProductVariant ${pv.id}] Orphaned: productId ${pv.productId} does not exist`);
  }
  if (pv.price === undefined || pv.price === null || isNaN(Number(pv.price))) {
    errors.push(`[ProductVariant ${pv.id}] Invalid price: ${pv.price}`);
  }
});

// ProductImage -> Product
tables.ProductImage.forEach(pi => {
  if (!prodIds.has(pi.productId)) {
    errors.push(`[ProductImage ${pi.id}] Orphaned: productId ${pi.productId} does not exist`);
  }
  if (!pi.url || pi.url.trim() === '') {
    errors.push(`[ProductImage ${pi.id}] Missing required url`);
  }
});

// OptionItem -> OptionGroup
tables.OptionItem.forEach(oi => {
  if (!optGroupIds.has(oi.groupId)) {
    errors.push(`[OptionItem ${oi.id}] Orphaned: groupId ${oi.groupId} does not exist`);
  }
  if (!oi.nameAr || oi.nameAr.trim() === '') {
    errors.push(`[OptionItem ${oi.id}] Missing required nameAr`);
  }
});

// ProductOptionGroup -> Product & OptionGroup
tables.ProductOptionGroup.forEach(pog => {
  if (!prodIds.has(pog.productId)) {
    errors.push(`[ProductOptionGroup ${pog.id}] Orphaned: productId ${pog.productId} does not exist`);
  }
  if (!optGroupIds.has(pog.groupId)) {
    errors.push(`[ProductOptionGroup ${pog.id}] Orphaned: groupId ${pog.groupId} does not exist`);
  }
});

// 4. Test Data Check
const spinach = tables.Category.find(c => c.nameAr === 'سبانخ' || c.id === 'cmw1374a7001m0svy6pq8l0xh');
if (spinach) errors.push(`[Category] Found test category 'سبانخ'`);

const shoeib = tables.Branch.find(b => b.nameAr.toLowerCase().includes('shoeib') || b.id.toLowerCase().includes('shoeib'));
if (shoeib) errors.push(`[Branch] Found test branch 'shoeib'`);

console.log('\n--- Validation Result ---');
if (errors.length === 0) {
  console.log('✅ ALL INTEGRITY CHECKS PASSED: 0 errors found.');
} else {
  console.log(`❌ FAILED WITH ${errors.length} ERRORS:`);
  errors.forEach(e => console.log('  -', e));
}
