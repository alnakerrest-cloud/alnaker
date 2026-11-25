import pg from "pg";
import dotenv from "dotenv";
import fs from "fs";

// 1. Target candidate DB (naqer_merged_staging) from .env.local
const localEnv = dotenv.parse(fs.readFileSync(".env.local"));
const targetDbUrl = localEnv.DATABASE_URL;

// 2. Source production DB from .env.prod.bak
const prodEnv = dotenv.parse(fs.readFileSync(".env.prod.bak"));
const sourceDbUrl = prodEnv.DATABASE_URL;

async function checkDatabases() {
  console.log("=== 1. Checking Target Candidate DB (naqer_merged_staging) ===");
  const targetPool = new pg.Pool({ connectionString: targetDbUrl, ssl: { rejectUnauthorized: false } });
  try {
    const tHost = await targetPool.query("SELECT inet_server_addr(), current_database()");
    console.log("Target DB:", tHost.rows[0]);
    const pCount = await targetPool.query('SELECT count(*) FROM "Product"');
    const cCount = await targetPool.query('SELECT count(*) FROM "Category"');
    const imgCount = await targetPool.query('SELECT count(*) FROM "ProductImage"');
    const imgTif = await targetPool.query('SELECT count(*) FROM "ProductImage" WHERE url LIKE \'%tifawhcs%\'');
    const imgDamc = await targetPool.query('SELECT count(*) FROM "ProductImage" WHERE url LIKE \'%damc35hfo%\'');
    const catMandi = await targetPool.query('SELECT "nameAr", "imageUrl" FROM "Category" WHERE slug = \'mandi\'');
    const settings = await targetPool.query('SELECT * FROM "RestaurantSettings"');

    // Check OrderStore columns if table exists
    const orderStoreCheck = await targetPool.query("SELECT table_name FROM information_schema.tables WHERE table_name ILIKE '%orderstore%'");
    let orderStoreRows = [];
    if (orderStoreCheck.rows.length > 0) {
      const tableName = orderStoreCheck.rows[0].table_name;
      const res = await targetPool.query(`SELECT * FROM "${tableName}" LIMIT 5`);
      orderStoreRows = res.rows;
    }

    console.log({
      products: pCount.rows[0].count,
      categories: cCount.rows[0].count,
      images: imgCount.rows[0].count,
      tifawhcsImages: imgTif.rows[0].count,
      damcImages: imgDamc.rows[0].count,
      mandiBanner: catMandi.rows[0],
      settings: settings.rows[0],
      orderStoreSample: orderStoreRows
    });
  } finally {
    await targetPool.end();
  }

  console.log("\n=== 2. Checking Source Production DB (ep-soft-dawn-bdu5de43) ===");
  const sourcePool = new pg.Pool({ connectionString: sourceDbUrl, ssl: { rejectUnauthorized: false } });
  try {
    const sHost = await sourcePool.query("SELECT inet_server_addr(), current_database()");
    console.log("Source DB:", sHost.rows[0]);
    const ro = await sourcePool.query("SHOW default_transaction_read_only");
    console.log("Read-only status:", ro.rows[0]);
    const pCount = await sourcePool.query('SELECT count(*) FROM "Product"');
    const cCount = await sourcePool.query('SELECT count(*) FROM "Category"');
    const oCount = await sourcePool.query('SELECT count(*) FROM "Order"');
    const aCount = await sourcePool.query('SELECT count(*) FROM "AuditLog"');
    const catMandi = await sourcePool.query('SELECT "nameAr", "imageUrl" FROM "Category" WHERE slug = \'mandi\'');

    console.log({
      readOnly: ro.rows[0].default_transaction_read_only,
      products: pCount.rows[0].count,
      categories: cCount.rows[0].count,
      orders: oCount.rows[0].count,
      auditLogs: aCount.rows[0].count,
      mandiBanner: catMandi.rows[0]
    });
  } finally {
    await sourcePool.end();
  }
}

checkDatabases().catch(console.error);
