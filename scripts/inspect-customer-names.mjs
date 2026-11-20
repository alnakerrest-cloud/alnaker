import pg from "pg";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const custs = await pool.query(`SELECT * FROM "Customer"`);
  console.log("Customer table rows:", custs.rows);

  const orders = await pool.query(`SELECT id, "orderNumber", data->>'customerName' as name, data->>'customerPhone' as phone, data->>'customerId' as "customerId" FROM "OrderStore" LIMIT 10`);
  console.log("Sample orders with customer names:");
  console.table(orders.rows);

  await pool.end();
}
main().catch(console.error);
