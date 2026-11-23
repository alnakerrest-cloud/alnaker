import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import pg from 'pg';

const stagingPath = path.resolve('.env.staging.local');
const stagingEnv = dotenv.parse(fs.readFileSync(stagingPath));
const stagingDbUrl = stagingEnv.DATABASE_URL;

const parsed = new URL(stagingDbUrl);
if (!parsed.hostname.startsWith('ep-ancient-hill-beec491j')) {
  console.error('REFUSAL: Target is not approved staging DB!');
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: stagingDbUrl, ssl: true });

async function inspect() {
  const client = await pool.connect();
  try {
    console.log('Connected to Staging:', parsed.hostname);
    
    // Find category
    const catRes = await client.query(`
      SELECT id, "nameAr", slug, "sortOrder", "createdAt"
      FROM "Category"
      WHERE id = 'cmws5hw4l00190cvycgrhxma9' OR "nameAr" LIKE 'ZZ%'
    `);
    console.log('Categories matching ZZ or target ID:', catRes.rows);

    // Find sections linked
    const catIds = catRes.rows.map(r => r.id);
    if (catIds.length > 0) {
      const secRes = await client.query(`
        SELECT id, "titleAr", "categoryId", "sortOrder", "createdAt"
        FROM "Section"
        WHERE "categoryId" = ANY($1)
      `, [catIds]);
      console.log('Sections linked to target categories:', secRes.rows);

      const secIds = secRes.rows.map(r => r.id);
      if (secIds.length > 0) {
        const prodRes = await client.query(`
          SELECT id, "nameAr", "sectionId"
          FROM "Product"
          WHERE "sectionId" = ANY($1)
        `, [secIds]);
        console.log('Products linked to target sections:', prodRes.rows);
      }
    }

    // Check all inventory counts right now
    const [cats, secs, prods, vars, optGrps, optItems, pogs, branches] = await Promise.all([
      client.query('SELECT count(*) FROM "Category"'),
      client.query('SELECT count(*) FROM "Section"'),
      client.query('SELECT count(*) FROM "Product"'),
      client.query('SELECT count(*) FROM "ProductVariant"'),
      client.query('SELECT count(*) FROM "OptionGroup"'),
      client.query('SELECT count(*) FROM "OptionItem"'),
      client.query('SELECT count(*) FROM "ProductOptionGroup"'),
      client.query('SELECT count(*) FROM "Branch"')
    ]);

    console.log('\nCurrent Staging Counts:');
    console.log({
      categories: Number(cats.rows[0].count),
      sections: Number(secs.rows[0].count),
      products: Number(prods.rows[0].count),
      variants: Number(vars.rows[0].count),
      optionGroups: Number(optGrps.rows[0].count),
      optionItems: Number(optItems.rows[0].count),
      pog: Number(pogs.rows[0].count),
      branches: Number(branches.rows[0].count)
    });
  } finally {
    client.release();
    await pool.end();
  }
}

inspect().catch(err => {
  console.error(err);
  process.exit(1);
});
