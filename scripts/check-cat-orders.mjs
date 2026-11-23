import pg from 'pg';
const p = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: true });
const r = await p.query('SELECT "nameAr", "sortOrder" FROM "Category" ORDER BY "sortOrder" ASC');
console.table(r.rows);
await p.end();
