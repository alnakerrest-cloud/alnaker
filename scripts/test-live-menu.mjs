process.env.USE_BACKUP_DATA = "false";
import { getMenuForLocale } from '../lib/menu-db.js';
try {
  const cats = await getMenuForLocale('ar');
  console.log(`Successfully fetched ${cats.length} categories from LIVE STAGING DB!`);
  const totalProducts = cats.reduce((sum, c) => sum + c.sections.reduce((sSum, s) => sSum + s.products.length, 0), 0);
  console.log(`Total products: ${totalProducts}`);
} catch (err) {
  console.error("Error fetching live menu:", err);
}
