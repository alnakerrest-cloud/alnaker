import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import { NextRequest } from 'next/server';
import { getMenuForLocale } from '@/lib/menu-db';
import { getSiteData } from '@/lib/site-db';
import { POST as checkoutPOST } from '@/app/api/checkout/route';
import { GET as addressesGET } from '@/app/api/customer/addresses/route';
import { POST as authPOST } from '@/app/api/customer/auth/route';

async function reproduce() {
  console.log('--- REPRODUCING INCIDENT ---');

  // 1. Test GET /api/customer/addresses without cookie
  console.log('\n[Test 1] GET /api/customer/addresses (no session/unauthorized):');
  const reqAddrNoAuth = new NextRequest('http://localhost:3000/api/customer/addresses', {
    method: 'GET',
  });
  const resAddrNoAuth = await addressesGET(reqAddrNoAuth);
  console.log('Status:', resAddrNoAuth.status, 'Body:', await resAddrNoAuth.json());

  // 2. Test POST /api/customer/auth with various inputs
  console.log('\n[Test 2] POST /api/customer/auth tests:');
  const testBodies = [
    {},
    { action: 'request_code' },
    { action: 'request_code', phone: '' },
    { action: 'request_code', phone: '010123' },
    { action: 'login', phone: '01024994092' },
  ];
  for (const b of testBodies) {
    const reqAuth = new NextRequest('http://localhost:3000/api/customer/auth', {
      method: 'POST',
      body: JSON.stringify(b),
    });
    const resAuth = await authPOST(reqAuth);
    console.log('Body:', JSON.stringify(b), '-> Status:', resAuth.status, 'Res:', await resAuth.json());
  }

  // 3. Test POST /api/checkout
  console.log('\n[Test 3] Finding menu items and testing Checkout POST:');
  const menu = await getMenuForLocale('ar');
  const site = await getSiteData('ar');
  const branch = site.branches.find(b => b.isOrderable && b.isActive) || site.branches[0];
  console.log('Using branch:', branch?.id, branch?.nameAr);

  // Find products to test
  let sampleProduct: any = null;
  for (const cat of menu) {
    for (const sec of cat.sections) {
      if (sec.items.length > 0) {
        sampleProduct = sec.items[0];
        break;
      }
    }
    if (sampleProduct) break;
  }
  console.log('Sample product:', sampleProduct?.id, sampleProduct?.name, 'prices:', sampleProduct?.prices);

  const checkoutPayload = {
    locale: 'ar',
    orderType: 'DELIVERY',
    deliveryAddress: 'ss',
    paymentMethod: 'CASH',
    customerName: 'فحص تجربة',
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
        productId: sampleProduct.id,
        quantity: 1,
        variantIndex: 0,
      }
    ],
  };

  const reqCheckout = new NextRequest('http://localhost:3000/api/checkout', {
    method: 'POST',
    body: JSON.stringify(checkoutPayload),
  });

  const resCheckout = await checkoutPOST(reqCheckout);
  console.log('Checkout Status:', resCheckout.status);
  const checkoutData = await resCheckout.json();
  console.log('Checkout Response:', checkoutData);
}

reproduce().catch(err => console.error('Reproduction crashed:', err));
