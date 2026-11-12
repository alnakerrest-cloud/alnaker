import dotenv from 'dotenv';
import path from 'node:path';
import pg from 'pg';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: true });

async function main() {
  const r = await pool.query(`
    SELECT c.id, c.slug, c."nameAr", c."group", c.layout, count(p.id) as pcount
    FROM "Category" c
    LEFT JOIN "Section" s ON s."categoryId"=c.id
    LEFT JOIN "Product" p ON p."sectionId"=s.id
    GROUP BY c.id, c.slug, c."nameAr", c."group", c.layout, c."sortOrder"
    ORDER BY c."sortOrder"
  `);
  console.table(r.rows);

  const sampleProducts = await pool.query(`
    SELECT p.id, p."nameAr", p."descAr", c."nameAr" as catName, v.price
    FROM "Product" p
    JOIN "Section" s ON s.id = p."sectionId"
    JOIN "Category" c ON c.id = s."categoryId"
    JOIN "ProductVariant" v ON v."productId" = p.id
    LIMIT 20
  `);
  console.table(sampleProducts.rows);

  await pool.end();
}

main().catch(console.error);
