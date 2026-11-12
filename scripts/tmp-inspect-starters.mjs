import dotenv from 'dotenv';
import path from 'node:path';
import pg from 'pg';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: true });

async function main() {
  const starters = await pool.query(`
    SELECT p.id, p."nameAr", p."descAr", v.price
    FROM "Product" p
    JOIN "Section" s ON s.id = p."sectionId"
    JOIN "Category" c ON c.id = s."categoryId"
    JOIN "ProductVariant" v ON v."productId" = p.id
    WHERE c.slug = 'starters'
  `);
  console.table(starters.rows);
  await pool.end();
}

main().catch(console.error);

