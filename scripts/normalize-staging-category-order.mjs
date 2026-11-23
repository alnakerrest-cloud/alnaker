import pg from "pg";
const { Pool } = pg;

const canonicalOrder = [
  'trays',
  'mandi',
  'grills',
  'meals',
  'homestyle',
  'bedouin',
  'soups',
  'oriental',
  'starters',
  'desserts',
  'iced',
  'juices',
  'cocktails',
  'shakes',
  'hot',
  'coffee',
  'soft'
];

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: true });

for (let i = 0; i < canonicalOrder.length; i++) {
  const slug = canonicalOrder[i];
  const sortOrder = (i + 1) * 10;
  const res = await pool.query('UPDATE "Category" SET "sortOrder" = $1 WHERE slug = $2', [sortOrder, slug]);
  console.log(`Updated ${slug} -> sortOrder ${sortOrder} (affected: ${res.rowCount})`);
}

const { rows } = await pool.query('SELECT slug, "nameAr", "sortOrder" FROM "Category" ORDER BY "sortOrder" ASC');
console.log('Normalized Categories:', rows);

await pool.end();
