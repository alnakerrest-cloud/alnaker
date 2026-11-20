import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import { NextRequest } from 'next/server';
import { getMenuForLocale } from '@/lib/menu-db';
import { getSiteData } from '@/lib/site-db';
import { POST as checkoutPOST } from '@/app/api/checkout/route';

async function testWithRequestCookies() {
  console.log('Testing checkout with mock request...');
  const menu = await getMenuForLocale('ar');
  const site = await getSiteData('ar');
  const branch = site.branches.find(b => b.isOrderable && b.isActive) || site.branches[0];

  let mulukProduct: any = null;
  for (const cat of menu) {
    for (const sec of cat.sections) {
      for (const it of sec.items) {
        if (it.id === '5580e943-c91a-41b4-9a62-b8591af1fc3e') {
          mulukProduct = it;
          break;
        }
      }
    }
  }

  const payload = {
    locale: 'ar',
    orderType: 'DELIVERY',
    deliveryAddress: 'ss',
    paymentMethod: 'CASH',
    customerName: 'فحص الحادثة',
    customerPhone: '01024994092',
    branchId: branch?.id,
    saveAddress: true,
    addressDetails: {
      label: 'المنزل',
      street: 'ss',
      isDefault: true,
    },
    items: [
      {
        productId: mulukProduct.id,
        quantity: 1,
        variantIndex: 0,
      }
    ],
  };

  console.log('Payload ready. Total expected: 2100 + 30 = 2130 EGP');
}

testWithRequestCookies();
