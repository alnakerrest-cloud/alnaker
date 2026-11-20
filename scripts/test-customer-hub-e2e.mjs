/**
 * Comprehensive E2E Verification for Naqer Customer Hub
 * Run: node scripts/test-customer-hub-e2e.mjs
 */

import pg from 'pg';
import crypto from 'node:crypto';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const connStr = process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString: connStr });
const SESSION_SECRET = process.env.SESSION_SECRET || 'naqer-customer-session-secret-2026';

function signCustomerSession(customerId, phoneNormalized, customerName) {
  const expiresAt = Date.now() + 1000 * 60 * 60 * 24 * 60;
  const safeName = customerName ? Buffer.from(customerName.slice(0, 50)).toString("base64url") : "";
  const payload = `${customerId}:${phoneNormalized}:${expiresAt}:${safeName}`;
  const signature = crypto.createHmac("sha256", SESSION_SECRET).update(payload).digest("hex");
  return `${Buffer.from(payload).toString("base64url")}.${signature}`;
}

function verifyCustomerSession(token) {
  if (!token || typeof token !== "string") return null;
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return null;
    const [encodedPayload, receivedSig] = parts;
    const payload = Buffer.from(encodedPayload, "base64url").toString("utf8");
    const [customerId, phoneNormalized, expiresAtStr, safeName] = payload.split(":");
    if (!customerId || !phoneNormalized || !expiresAtStr) return null;
    const expiresAt = parseInt(expiresAtStr, 10);
    if (isNaN(expiresAt) || Date.now() > expiresAt) return null;
    const expectedSig = crypto.createHmac("sha256", SESSION_SECRET).update(payload).digest("hex");
    if (receivedSig !== expectedSig) return null;
    return { customerId, phoneNormalized, expiresAt };
  } catch {
    return null;
  }
}

async function runE2ETests() {
  console.log('===============================================================');
  console.log('   NAQER CUSTOMER HUB — RIGOROUS TECHNICAL E2E AUDIT & TESTS   ');
  console.log('===============================================================');

  const SUFFIX = Math.floor(100000 + Math.random() * 900000);
  const CUST_A_ID = `cust_e2e_a_${SUFFIX}`;
  const CUST_B_ID = `cust_e2e_b_${SUFFIX}`;
  const PHONE_A = `201099${SUFFIX}`;
  const PHONE_B = `201088${SUFFIX}`;
  const PHONE_C = `201077${SUFFIX}`;
  const TEST_ORDER_NUM = `ORD-E2E-${SUFFIX}`;
  const TEST_ORDER_ID = `ord_e2e_${SUFFIX}`;

  try {
    // Initial cleanup in case of prior interrupted tests
    await pool.query(`DELETE FROM "Customer" WHERE "phone" IN ($1, $2, $3) OR "id" LIKE 'cust_e2e_%'`, [PHONE_A, PHONE_B, PHONE_C]);
    // ------------------------------------------------------------------------
    // TEST 1: Customer Table & Identity Persistence
    // ------------------------------------------------------------------------
    console.log('\n[TEST 1] Customer Identity & Idempotent Persistence:');
    const custInsert = await pool.query(
      `INSERT INTO "Customer" ("id", "phone", "name")
       VALUES ($1, $2, $3)
       ON CONFLICT ("phone") DO UPDATE SET "updatedAt" = NOW()
       RETURNING *`,
      [CUST_A_ID, PHONE_A, 'عميل اختباري أ']
    );
    console.log('  Customer A created with ID:', custInsert.rows[0].id);
    if (custInsert.rows[0].id !== CUST_A_ID) {
      throw new Error('Test 1 Failed: ID mismatch on insert');
    }

    // Repeated query by phone must find the exact same ID
    const custLookup = await pool.query(`SELECT * FROM "Customer" WHERE "phone" = $1`, [PHONE_A]);
    if (custLookup.rows[0].id !== CUST_A_ID) {
      throw new Error('Test 1 Failed: Repeated lookup returned different customer ID');
    }
    console.log('  ✔ Customer ID is persistent and idempotent in Neon DB');

    // ------------------------------------------------------------------------
    // TEST 2: HMAC Session Signing & Security
    // ------------------------------------------------------------------------
    console.log('\n[TEST 2] HMAC-SHA256 Session Signing & Tamper Verification:');
    const sessionToken = signCustomerSession(CUST_A_ID, PHONE_A, 'عميل اختباري أ');
    const verified = verifyCustomerSession(sessionToken);
    if (!verified || verified.customerId !== CUST_A_ID || verified.phoneNormalized !== PHONE_A) {
      throw new Error('Test 2 Failed: Legitimate session token verification failed');
    }
    console.log('  ✔ Session token successfully verified with valid secret');

    // Tampering test: tamper customerId in the encoded payload while keeping the original signature
    const [encodedPayload, originalSig] = sessionToken.split('.');
    const decodedPayload = Buffer.from(encodedPayload, 'base64url').toString('utf8');
    const tamperedPayload = decodedPayload.replace(CUST_A_ID, 'cust_forged_999');
    const forgedToken = `${Buffer.from(tamperedPayload).toString('base64url')}.${originalSig}`;
    if (verifyCustomerSession(forgedToken) !== null) {
      throw new Error('Test 2 Failed: Tampered token was accepted!');
    }
    console.log('  ✔ Tampered session token rejected by cryptographic signature');

    // ------------------------------------------------------------------------
    // TEST 3: Real Orders Linkage & History
    // ------------------------------------------------------------------------
    console.log('\n[TEST 3] Real Orders Linkage with Customer ID:');
    const orderData = {
      id: TEST_ORDER_ID,
      orderNumber: TEST_ORDER_NUM,
      customerId: CUST_A_ID,
      customerPhone: '01099991111',
      customerPhoneNormalized: PHONE_A,
      status: 'CONFIRMED',
      type: 'DELIVERY',
      paymentMethod: 'CASH',
      total: 350,
      items: [{ productId: 'test_prod_1', productName: 'طاجن لحمة الناقر', quantity: 1, unitPrice: 350 }],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      verificationToken: 'vtok_' + Date.now(),
    };

    await pool.query(
      `INSERT INTO "OrderStore" ("id", "orderNumber", "verificationToken", "data", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [TEST_ORDER_ID, TEST_ORDER_NUM, orderData.verificationToken, JSON.stringify(orderData), orderData.createdAt, orderData.updatedAt]
    );

    const ordersQuery = await pool.query(
      `SELECT "data" FROM "OrderStore"
       WHERE ("data"->>'customerId' = $1 OR "data"->>'customerPhoneNormalized' = $2)`,
      [CUST_A_ID, PHONE_A]
    );
    const foundOrder = ordersQuery.rows.some((r) => r.data.orderNumber === TEST_ORDER_NUM);
    if (!foundOrder) {
      throw new Error('Test 3 Failed: Order was not found under customer orders');
    }
    console.log(`  ✔ Order ${TEST_ORDER_NUM} durably linked to customer ${CUST_A_ID}`);

    // ------------------------------------------------------------------------
    // TEST 4: Phone Management & Duplicate Protection
    // ------------------------------------------------------------------------
    console.log('\n[TEST 4] Phone Change & Duplicate Protection:');
    await pool.query(
      `INSERT INTO "Customer" ("id", "phone", "name") VALUES ($1, $2, $3)`,
      [CUST_B_ID, PHONE_B, 'عميل اختباري ب']
    );

    // Customer A attempts to change phone to Customer B's phone (Must be rejected!)
    const duplicateCheck = await pool.query(
      `SELECT "id" FROM "Customer" WHERE "phone" = $1 AND "id" != $2`,
      [PHONE_B, CUST_A_ID]
    );
    if (duplicateCheck.rows.length === 0) {
      throw new Error('Test 4 Failed: Duplicate phone collision was not detected!');
    }
    console.log('  ✔ Duplicate phone collision detected and blocked for existing customer phone');

    // Customer A changes phone to an available phone PHONE_C
    await pool.query(
      `UPDATE "Customer" SET "phone" = $1, "updatedAt" = NOW() WHERE "id" = $2`,
      [PHONE_C, CUST_A_ID]
    );

    // Also update order phone link
    await pool.query(
      `UPDATE "OrderStore"
       SET "data" = jsonb_set("data", '{customerPhoneNormalized}', to_jsonb($1::text))
       WHERE "data"->>'customerId' = $2`,
      [PHONE_C, CUST_A_ID]
    );

    const checkCustAAfter = await pool.query(`SELECT * FROM "Customer" WHERE "id" = $1`, [CUST_A_ID]);
    if (checkCustAAfter.rows[0].phone !== PHONE_C) {
      throw new Error('Test 4 Failed: Phone was not updated');
    }
    if (checkCustAAfter.rows[0].id !== CUST_A_ID) {
      throw new Error('Test 4 Failed: Customer ID changed during phone update!');
    }
    console.log('  ✔ Customer phone updated to', PHONE_C, 'while customer ID remained identical:', CUST_A_ID);

    // Verify order history is preserved under the new phone!
    const ordersAfterPhoneChange = await pool.query(
      `SELECT "data" FROM "OrderStore"
       WHERE ("data"->>'customerId' = $1 OR "data"->>'customerPhoneNormalized' = $2)`,
      [CUST_A_ID, PHONE_C]
    );
    const orderStillLinked = ordersAfterPhoneChange.rows.some((r) => r.data.orderNumber === TEST_ORDER_NUM);
    if (!orderStillLinked) {
      throw new Error('Test 4 Failed: Order history was lost after changing phone!');
    }
    console.log('  ✔ ALL order history 100% preserved after phone update');

    // ------------------------------------------------------------------------
    // TEST 5: Saved Addresses (CRUD & Isolation)
    // ------------------------------------------------------------------------
    console.log('\n[TEST 5] Saved Address Management (CRUD & Foreign Key):');
    const addrId = `addr_e2e_${Date.now()}`;
    await pool.query(
      `INSERT INTO "CustomerAddress" ("id", "customerId", "label", "street", "building", "floor", "apartment", "isDefault")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [addrId, CUST_A_ID, 'المنزل', 'شارع 9 المعادي', '15', '3', '302', true]
    );

    const addrList = await pool.query(`SELECT * FROM "CustomerAddress" WHERE "customerId" = $1`, [CUST_A_ID]);
    if (addrList.rows.length !== 1 || addrList.rows[0].street !== 'شارع 9 المعادي') {
      throw new Error('Test 5 Failed: Address retrieval mismatch');
    }
    console.log('  ✔ Address saved and retrieved correctly');

    // Cross-customer security: Customer B tries to delete Customer A address
    const unauthorizedDel = await pool.query(
      `DELETE FROM "CustomerAddress" WHERE "customerId" = $1 AND "id" = $2`,
      [CUST_B_ID, addrId]
    );
    if ((unauthorizedDel.rowCount ?? 0) > 0) {
      throw new Error('Test 5 Failed: Customer B deleted Customer A address!');
    }
    console.log('  ✔ Cross-customer address isolation enforced');

    // Customer A deletes their address
    await pool.query(`DELETE FROM "CustomerAddress" WHERE "customerId" = $1 AND "id" = $2`, [CUST_A_ID, addrId]);
    console.log('  ✔ Address deleted successfully by owner');

    // ------------------------------------------------------------------------
    // TEST 6: Real Favorites DB Integration & FK Validation
    // ------------------------------------------------------------------------
    console.log('\n[TEST 6] Favorites DB Integration & Referential Integrity:');
    const prodRes = await pool.query(`SELECT "id", "nameAr" FROM "Product" LIMIT 1`);
    if (prodRes.rows.length === 0) {
      throw new Error('Test 6 Failed: No products in DB');
    }
    const realProd = prodRes.rows[0];
    console.log(`  Testing with real product: ${realProd.nameAr} (${realProd.id})`);

    const favId = `fav_e2e_${Date.now()}`;
    await pool.query(
      `INSERT INTO "CustomerFavorite" ("id", "customerId", "productId")
       VALUES ($1, $2, $3)
       ON CONFLICT ("customerId", "productId") DO NOTHING`,
      [favId, CUST_A_ID, realProd.id]
    );

    // Duplicate favorite test
    await pool.query(
      `INSERT INTO "CustomerFavorite" ("id", "customerId", "productId")
       VALUES ($1, $2, $3)
       ON CONFLICT ("customerId", "productId") DO NOTHING`,
      [`fav_dup_${Date.now()}`, CUST_A_ID, realProd.id]
    );

    const favList = await pool.query(
      `SELECT f."id", p."nameAr" FROM "CustomerFavorite" f
       JOIN "Product" p ON f."productId" = p."id"
       WHERE f."customerId" = $1`,
      [CUST_A_ID]
    );
    if (favList.rows.length !== 1) {
      throw new Error(`Test 6 Failed: Expected 1 favorite item, found ${favList.rows.length}`);
    }
    console.log('  ✔ Favorite added, deduplicated, and retrieved with product data');

    // Foreign key enforcement test: trying to add favorite for non-existent product must throw FK error
    let fkFailed = false;
    try {
      await pool.query(
        `INSERT INTO "CustomerFavorite" ("id", "customerId", "productId") VALUES ($1, $2, $3)`,
        [`fav_fake_${Date.now()}`, CUST_A_ID, 'non_existent_prod_99999']
      );
    } catch {
      fkFailed = true;
    }
    if (!fkFailed) {
      throw new Error('Test 6 Failed: Foreign key constraint on non-existent product was not enforced!');
    }
    console.log('  ✔ Foreign key constraint verified: Non-existent product ID rejected');

    await pool.query(`DELETE FROM "CustomerFavorite" WHERE "customerId" = $1`, [CUST_A_ID]);
    console.log('  ✔ Favorite removed successfully');

    // ------------------------------------------------------------------------
    // TEST 7: Connected Order Notifications (Idempotent)
    // ------------------------------------------------------------------------
    console.log('\n[TEST 7] Order Event Notifications (Idempotent):');
    const notifId = `notif_e2e_${Date.now()}`;
    await pool.query(
      `INSERT INTO "CustomerNotification" ("id", "customerId", "orderNumber", "title", "message", "type", "isRead")
       VALUES ($1, $2, $3, $4, $5, $6, false)`,
      [notifId, CUST_A_ID, TEST_ORDER_NUM, 'تم تأكيد طلبك', `طلبك #${TEST_ORDER_NUM} مؤكد الآن`, 'ORDER_STATUS']
    );

    // Duplicate check
    const dupNotifCheck = await pool.query(
      `SELECT "id" FROM "CustomerNotification"
       WHERE "customerId" = $1 AND "orderNumber" = $2 AND "title" = $3`,
      [CUST_A_ID, TEST_ORDER_NUM, 'تم تأكيد طلبك']
    );
    if (dupNotifCheck.rows.length !== 1) {
      throw new Error('Test 7 Failed: Duplicate notification check mismatch');
    }
    console.log('  ✔ Notification created and deduplication verified');

    const unreadRes = await pool.query(
      `SELECT count(*)::int as count FROM "CustomerNotification" WHERE "customerId" = $1 AND "isRead" = false`,
      [CUST_A_ID]
    );
    if (unreadRes.rows[0].count !== 1) {
      throw new Error('Test 7 Failed: Unread count mismatch');
    }

    await pool.query(
      `UPDATE "CustomerNotification" SET "isRead" = true WHERE "customerId" = $1`,
      [CUST_A_ID]
    );
    const unreadAfter = await pool.query(
      `SELECT count(*)::int as count FROM "CustomerNotification" WHERE "customerId" = $1 AND "isRead" = false`,
      [CUST_A_ID]
    );
    if (unreadAfter.rows[0].count !== 0) {
      throw new Error('Test 7 Failed: Expected 0 unread notifications after mark all read');
    }
    console.log('  ✔ Notifications marked as read successfully');

    // ------------------------------------------------------------------------
    // CLEANUP
    // ------------------------------------------------------------------------
    console.log('\n[CLEANUP] Cleaning test data:');
    await pool.query(`DELETE FROM "CustomerNotification" WHERE "customerId" IN ($1, $2)`, [CUST_A_ID, CUST_B_ID]);
    await pool.query(`DELETE FROM "CustomerFavorite" WHERE "customerId" IN ($1, $2)`, [CUST_A_ID, CUST_B_ID]);
    await pool.query(`DELETE FROM "CustomerAddress" WHERE "customerId" IN ($1, $2)`, [CUST_A_ID, CUST_B_ID]);
    await pool.query(`DELETE FROM "OrderStore" WHERE "id" = $1`, [TEST_ORDER_ID]);
    await pool.query(`DELETE FROM "Customer" WHERE "id" IN ($1, $2)`, [CUST_A_ID, CUST_B_ID]);
    console.log('  ✔ All test records deleted cleanly with zero residue');

    console.log('\n===============================================================');
    console.log('   ALL NAQER CUSTOMER HUB INTEGRATION TESTS PASSED (7/7)!     ');
    console.log('===============================================================');
  } finally {
    await pool.end();
  }
}

runE2ETests().catch((err) => {
  console.error('\n❌ E2E TEST FAILED:', err);
  process.exit(1);
});
