import dotenv from "dotenv";
import path from "node:path";
import pg from "pg";
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: true, max: 3 });
const q = async (sql, params = []) => (await pool.query(sql, params)).rows;

const zz = await q(`select id,"nameAr" from "Product" where "nameAr" like 'ZZ%'`);
const zc = await q(`select id,"nameAr" from "Category" where "nameAr" like 'ZZ%'`);
const zb = await q(`select id,"nameAr" from "Branch" where "nameAr" like 'ZZ%'`);
const tag = await q(`select "taglineAr" from "RestaurantSettings" where id='default'`);
console.log("ZZ products:", JSON.stringify(zz));
console.log("ZZ categories:", JSON.stringify(zc));
console.log("ZZ branches:", JSON.stringify(zb));
console.log("tagline:", tag[0]?.taglineAr);
await pool.end();
