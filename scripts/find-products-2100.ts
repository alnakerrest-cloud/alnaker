import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import { getMenuForLocale } from '@/lib/menu-db';

async function findProducts() {
  const menu = await getMenuForLocale('ar');
  console.log('Searching for products with price 2100, or items with optionGroups:');

  for (const cat of menu) {
    for (const sec of cat.sections) {
      for (const it of sec.items) {
        for (const pr of it.prices) {
          if (pr.value === 2100 || pr.value === 1050 || pr.value === 700 || pr.value === 350) {
            console.log(`- Product: [${it.id}] ${it.name} | Price: ${pr.value} (${pr.label || 'standard'})`);
            if (it.optionGroups && it.optionGroups.length > 0) {
              console.log('  Option groups:', JSON.stringify(it.optionGroups, null, 2));
            }
          }
        }
      }
    }
  }
}

findProducts();
