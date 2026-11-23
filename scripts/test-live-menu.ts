process.env.USE_BACKUP_DATA = "false";
import { getMenuForLocale } from '../lib/menu-db';
import { getSiteData } from '../lib/site-db';

async function main() {
  try {
    const cats = await getMenuForLocale('ar');
    console.log(`Successfully fetched ${cats.length} categories from LIVE STAGING DB!`);
    const totalProducts = cats.reduce((sum, c) => sum + (c.sections || []).reduce((sSum, s) => sSum + (s.items || []).length, 0), 0);
    console.log(`Total products: ${totalProducts}`);

    const site = await getSiteData('ar');
    console.log(`Site settings fetched: ${site.brand}, branches: ${site.branches.length}`);
  } catch (err) {
    console.error("Error fetching live menu:", err);
  }
}

main();
