import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import { NextRequest } from 'next/server';
import { getMenuForLocale } from '@/lib/menu-db';
import { getSiteData } from '@/lib/site-db';
import { POST as checkoutPOST } from '@/app/api/checkout/route';
import { GET as addressesGET, POST as addressesPOST } from '@/app/api/customer/addresses/route';
import { POST as authPOST } from '@/app/api/customer/auth/route';
import { GET as hubGET } from '@/app/api/customer/hub/route';
import { signCustomerSession, CUSTOMER_COOKIE_NAME, verifyCustomerSession } from '@/lib/customer-session';
import pg from 'pg';

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false }
});

async function runIncidentSuite() {
  console.log('================================================================');
  console.log('   PRODUCTION CHECKOUT & AUTH INCIDENT FULL VERIFICATION SUITE  ');
  console.log('================================================================');

  let passed = 0;
  let failed = 0;

  const testAssert = (desc: string, condition: boolean, extra?: string) => {
    if (condition) {
      console.log(`  ✔ [PASS] ${desc}`);
      passed++;
    } else {
      console.error(`  ✖ [FAIL] ${desc} ${extra ? `(${extra})` : ''}`);
      failed++;
    }
  };

  const menu = await getMenuForLocale('ar');
  const site = await getSiteData('ar');
  const branch = site.branches.find(b => b.isOrderable && b.isActive) || site.branches[0];

  let testProduct: any = null;
  for (const cat of menu) {
    for (const sec of cat.sections) {
      for (const it of sec.items) {
        if (it.prices && it.prices.length > 0 && !it.optionGroups?.some((g: any) => g.isRequired)) {
          testProduct = it;
          break;
        }
      }
      if (testProduct) break;
    }
    if (testProduct) break;
  }

  // SCENARIO 1: New Guest Customer Checkout (No cookie, no prior record)
  console.log('\n[Scenario 1 & 6] Guest Checkout (No account / No session):');
  const guestPhone = '01019998811';
  const reqGuestCheckout = new NextRequest('http://localhost:3000/api/checkout', {
    method: 'POST',
    body: JSON.stringify({
      locale: 'ar',
      orderType: 'DELIVERY',
      deliveryAddress: 'شارع 15 - عمارة 4',
      paymentMethod: 'CASH',
      customerName: 'ضيف تجربة',
      customerPhone: guestPhone,
      branchId: branch.id,
      items: [{ productId: testProduct.id, quantity: 1, variantIndex: 0 }],
    }),
  });
  const resGuest = await checkoutPOST(reqGuestCheckout);
  const dataGuest = await resGuest.json();
  testAssert('Guest checkout completes with 200 OK', resGuest.status === 200);
  testAssert('Order number generated and status is PENDING_WHATSAPP', Boolean(dataGuest.orderNumber) && dataGuest.status === 'PENDING_WHATSAPP');
  testAssert('Session cookie issued to guest customer', Boolean(dataGuest.customerSessionToken));

  // Clean guest test order
  if (dataGuest.orderNumber) {
    await pool.query('DELETE FROM "OrderStore" WHERE "orderNumber" = $1', [dataGuest.orderNumber]);
  }

  // SCENARIO 2: Customer with Valid Session
  console.log('\n[Scenario 2] Authenticated Customer Checkout & Hub Sync:');
  const authPhone = '201024994092';
  const validToken = signCustomerSession('cust_be05790bf32da365', authPhone, 'ابراهيم شعيب');
  const reqAuthCheckout = new NextRequest('http://localhost:3000/api/checkout', {
    method: 'POST',
    headers: {
      cookie: `${CUSTOMER_COOKIE_NAME}=${validToken}`,
    },
    body: JSON.stringify({
      locale: 'ar',
      orderType: 'DELIVERY',
      deliveryAddress: 'شارع البحر',
      paymentMethod: 'CASH',
      customerName: 'ابراهيم شعيب',
      customerPhone: '01024994092',
      branchId: branch.id,
      items: [{ productId: testProduct.id, quantity: 1, variantIndex: 0 }],
    }),
  });
  const resAuth = await checkoutPOST(reqAuthCheckout);
  const dataAuth = await resAuth.json();
  testAssert('Authenticated customer checkout succeeds with 200 OK', resAuth.status === 200);
  testAssert('Customer ID preserved across orders', dataAuth.customerId === 'cust_be05790bf32da365');

  // Clean auth test order
  if (dataAuth.orderNumber) {
    await pool.query('DELETE FROM "OrderStore" WHERE "orderNumber" = $1', [dataAuth.orderNumber]);
  }

  // SCENARIO 3 & 8: Expired or Tampered Session Handling
  console.log('\n[Scenario 3 & 8] Expired / Tampered Session Token:');
  const tamperedToken = 'invalid.token.signature';
  const reqTampered = new NextRequest('http://localhost:3000/api/customer/addresses', {
    method: 'GET',
    headers: { cookie: `${CUSTOMER_COOKIE_NAME}=${tamperedToken}` },
  });
  const resTampered = await addressesGET(reqTampered);
  const dataTampered = await resTampered.json();
  testAssert('Tampered session safely treated as guest without throwing 500', resTampered.status === 200);
  testAssert('Returns empty addresses for invalid session', Array.isArray(dataTampered.addresses) && dataTampered.addresses.length === 0);

  // SCENARIO 4 & 5: Addresses API for Guest vs Authenticated
  console.log('\n[Scenario 4 & 5 & 9] Address API without Session (Zero 401 on GET):');
  const reqNoSessionAddr = new NextRequest('http://localhost:3000/api/customer/addresses', {
    method: 'GET',
  });
  const resNoSessionAddr = await addressesGET(reqNoSessionAddr);
  testAssert('GET /api/customer/addresses returns 200 OK for guest (not 401)', resNoSessionAddr.status === 200);

  // Mutating addresses MUST still be 401 for guests
  const reqPostGuestAddr = new NextRequest('http://localhost:3000/api/customer/addresses', {
    method: 'POST',
    body: JSON.stringify({ label: 'المنزل', street: 'شارع التجربة' }),
  });
  const resPostGuestAddr = await addressesPOST(reqPostGuestAddr);
  testAssert('POST /api/customer/addresses remains 401 Unauthorized for guest', resPostGuestAddr.status === 401);

  // SCENARIO 7: Auth API validation & Eastern Arabic Numerals
  console.log('\n[Scenario 7] Customer Auth API & Eastern Arabic Numerals Support:');
  // Arabic digits: ٠١٠٢٤٩٩٤٠٩٢
  const reqArabicPhone = new NextRequest('http://localhost:3000/api/customer/auth', {
    method: 'POST',
    body: JSON.stringify({ phone: '٠١٠٢٤٩٩٤٠٩٢' }),
  });
  const resArabicPhone = await authPOST(reqArabicPhone);
  const dataArabicPhone = await resArabicPhone.json();
  testAssert('Auth API accepts Eastern Arabic Numerals ٠١٠... without 400', resArabicPhone.status === 200);
  testAssert('OTP generated successfully for Arabic numerals', dataArabicPhone.success === true);

  // Flexible action aliases (login, send_code, request_otp)
  const reqAliasAuth = new NextRequest('http://localhost:3000/api/customer/auth', {
    method: 'POST',
    body: JSON.stringify({ action: 'login', phoneNumber: '01024994092' }),
  });
  const resAliasAuth = await authPOST(reqAliasAuth);
  testAssert('Auth API accepts action: login and field: phoneNumber', resAliasAuth.status === 200);

  // Invalid phone rejection
  const reqInvalidPhone = new NextRequest('http://localhost:3000/api/customer/auth', {
    method: 'POST',
    body: JSON.stringify({ phone: '12345' }),
  });
  const resInvalidPhone = await authPOST(reqInvalidPhone);
  testAssert('Auth API properly validates and rejects invalid phone with 400', resInvalidPhone.status === 400);

  // SCENARIO 11: Idempotency Protection
  console.log('\n[Scenario 11] Idempotency Protection on Duplicate Submissions:');
  const idempKey = `idemp_test_${Date.now()}`;
  const orderPayload = {
    locale: 'ar',
    orderType: 'DELIVERY',
    deliveryAddress: 'شارع الجمهورية',
    paymentMethod: 'CASH',
    customerName: 'فحص التكرار',
    customerPhone: '01024994092',
    branchId: branch.id,
    idempotencyKey: idempKey,
    items: [{ productId: testProduct.id, quantity: 1, variantIndex: 0 }],
  };

  const reqOrder1 = new NextRequest('http://localhost:3000/api/checkout', {
    method: 'POST',
    body: JSON.stringify(orderPayload),
  });
  const resOrder1 = await checkoutPOST(reqOrder1);
  const dataOrder1 = await resOrder1.json();

  const reqOrder2 = new NextRequest('http://localhost:3000/api/checkout', {
    method: 'POST',
    body: JSON.stringify(orderPayload),
  });
  const resOrder2 = await checkoutPOST(reqOrder2);
  const dataOrder2 = await resOrder2.json();

  testAssert('First submission created order', resOrder1.status === 200);
  testAssert('Second submission returned exact same orderNumber without duplicating', dataOrder1.orderNumber === dataOrder2.orderNumber);

  // Clean idempotency test order
  if (dataOrder1.orderNumber) {
    await pool.query('DELETE FROM "OrderStore" WHERE "orderNumber" = $1', [dataOrder1.orderNumber]);
  }

  // SCENARIO 12: Production Exact Order (صينية الملوك - 2100 + 30 = 2130 EGP)
  console.log('\n[Scenario 12] Production Exact Match: صينية الملوك (2100 EGP, 30 Delivery, "ss" Address):');
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

  const reqMuluk = new NextRequest('http://localhost:3000/api/checkout', {
    method: 'POST',
    body: JSON.stringify({
      locale: 'ar',
      orderType: 'DELIVERY',
      deliveryAddress: 'ss',
      paymentMethod: 'CASH',
      customerName: 'فحص الإنتاج',
      customerPhone: '01024994092',
      branchId: branch.id,
      items: [{ productId: mulukProduct.id, quantity: 1, variantIndex: 0 }],
    }),
  });
  const resMuluk = await checkoutPOST(reqMuluk);
  const dataMuluk = await resMuluk.json();
  testAssert('Exact production incident payload returns 200 OK (Not 500)', resMuluk.status === 200);
  testAssert('Total is calculated correctly to 2130 EGP', dataMuluk.order?.total === 2130);
  testAssert('Delivery Address snapshot is preserved as "ss"', dataMuluk.order?.deliveryAddress === 'ss');

  // Clean muluk test order
  if (dataMuluk.orderNumber) {
    await pool.query('DELETE FROM "OrderStore" WHERE "orderNumber" = $1', [dataMuluk.orderNumber]);
  }

  console.log('\n================================================================');
  console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');

  await pool.end();
}

runIncidentSuite().catch(err => {
  console.error('Suite crashed:', err);
  process.exit(1);
});
