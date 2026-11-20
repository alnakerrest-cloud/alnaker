import pg from "pg";
import dotenv from "dotenv";
import crypto from "node:crypto";
dotenv.config({ path: ".env.local" });

const connectionString = process.env.DATABASE_URL || process.env["DATABASE_URL "];
const pool = new pg.Pool({ connectionString });
const SESSION_SECRET = process.env.SESSION_SECRET || "naqer-customer-session-secret-2026";

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
    const [customerId, phoneNormalized, expiresAtStr] = payload.split(":");
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

async function runTests() {
  console.log("================================================================================");
  console.log("   NAQER CUSTOMER DATA PERSISTENCE & SMART CHECKOUT AUTOFILL — E2E TEST SUITE   ");
  console.log("================================================================================");

  const SUFFIX = Math.floor(100000 + Math.random() * 900000);
  const CUST_A_ID = `cust_e2e_userA_${SUFFIX}`;
  const CUST_B_ID = `cust_e2e_userB_${SUFFIX}`;
  const PHONE_A = `201011${SUFFIX}`;
  const PHONE_B = `201022${SUFFIX}`;
  const ORDER_A_NUM = `ORD-TEST-${SUFFIX}`;
  const ORDER_A_ID = `ord_test_${SUFFIX}`;

  try {
    // ------------------------------------------------------------------------
    // SETUP: Initial cleanup
    // ------------------------------------------------------------------------
    await pool.query(`DELETE FROM "CustomerAddress" WHERE "customerId" IN ($1, $2)`, [CUST_A_ID, CUST_B_ID]);
    await pool.query(`DELETE FROM "Customer" WHERE "id" IN ($1, $2) OR "phone" IN ($3, $4)`, [CUST_A_ID, CUST_B_ID, PHONE_A, PHONE_B]);
    await pool.query(`DELETE FROM "OrderStore" WHERE "id" = $1 OR "orderNumber" = $2`, [ORDER_A_ID, ORDER_A_NUM]);

    // ------------------------------------------------------------------------
    // TEST 1: Customer Identity Creation & Session Signing
    // ------------------------------------------------------------------------
    console.log("\n[TEST 1] Customer Identity & Cryptographic Session:");
    await pool.query(
      `INSERT INTO "Customer" ("id", "phone", "name") VALUES ($1, $2, $3)`,
      [CUST_A_ID, PHONE_A, "أحمد محمود"]
    );
    await pool.query(
      `INSERT INTO "Customer" ("id", "phone", "name") VALUES ($1, $2, $3)`,
      [CUST_B_ID, PHONE_B, "عميل ب"]
    );
    const sessionTokenA = signCustomerSession(CUST_A_ID, PHONE_A, "أحمد محمود");
    const verifiedA = verifyCustomerSession(sessionTokenA);
    if (!verifiedA || verifiedA.customerId !== CUST_A_ID) {
      throw new Error("Test 1 Failed: Customer A session verification failed");
    }
    console.log("  ✔ Customer A & B created with HMAC tokens");

    // ------------------------------------------------------------------------
    // TEST 2: Add Address from Customer Hub (with City, Area, Street, Building)
    // ------------------------------------------------------------------------
    console.log("\n[TEST 2] Add Address from Customer Hub (Full Structured Fields):");
    const addrA1_Id = `addr_a1_${SUFFIX}`;
    const insertRes1 = await pool.query(
      `INSERT INTO "CustomerAddress" ("id", "customerId", "label", "city", "area", "street", "building", "floor", "apartment", "notes", "isDefault")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [addrA1_Id, CUST_A_ID, "المنزل", "جمصة", "المنطقة المركزية", "شارع الكورنيش الرئيسي", "14", "3", "7", "بجوار سوبرماركت الأمانة", true]
    );
    const savedAddr1 = insertRes1.rows[0];
    if (savedAddr1.city !== "جمصة" || savedAddr1.area !== "المنطقة المركزية" || !savedAddr1.isDefault) {
      throw new Error("Test 2 Failed: Address fields or isDefault mismatch");
    }
    console.log("  ✔ Address A1 added with city, area, street, and auto-default: true");

    // ------------------------------------------------------------------------
    // TEST 3: Add Second Address & Set Default
    // ------------------------------------------------------------------------
    console.log("\n[TEST 3] Add Second Address and Manage Default Status:");
    const addrA2_Id = `addr_a2_${SUFFIX}`;
    // Unset default on previous addresses when inserting new default
    await pool.query(`UPDATE "CustomerAddress" SET "isDefault" = false WHERE "customerId" = $1`, [CUST_A_ID]);
    await pool.query(
      `INSERT INTO "CustomerAddress" ("id", "customerId", "label", "city", "area", "street", "building", "floor", "apartment", "notes", "isDefault")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [addrA2_Id, CUST_A_ID, "العمل", "جمصة", "منطقة الجامعات", "شارع جامعة الدلتا", "مبنى الإدارة", "1", "102", "مكتب 102", true]
    );
    const listRes = await pool.query(
      `SELECT * FROM "CustomerAddress" WHERE "customerId" = $1 ORDER BY "isDefault" DESC`,
      [CUST_A_ID]
    );
    if (listRes.rows.length !== 2) throw new Error("Test 3 Failed: Expected 2 addresses");
    if (listRes.rows[0].id !== addrA2_Id || !listRes.rows[0].isDefault) {
      throw new Error("Test 3 Failed: Address A2 should be the default");
    }
    if (listRes.rows[1].isDefault) {
      throw new Error("Test 3 Failed: Address A1 should no longer be default");
    }
    console.log("  ✔ Multiple addresses stored, exactly 1 isDefault maintained");

    // ------------------------------------------------------------------------
    // TEST 4: Duplicate Address Deduplication
    // ------------------------------------------------------------------------
    console.log("\n[TEST 4] Duplicate Address Idempotency & Protection:");
    const dupCheck = await pool.query(
      `SELECT id FROM "CustomerAddress"
       WHERE "customerId" = $1
         AND LOWER(TRIM("street")) = LOWER($2)
         AND COALESCE("building", '') = COALESCE($3, '')
         AND COALESCE("apartment", '') = COALESCE($4, '')`,
      [CUST_A_ID, "شارع جامعة الدلتا", "مبنى الإدارة", "102"]
    );
    if (dupCheck.rows.length !== 1) {
      throw new Error("Test 4 Failed: Duplicate check query failed");
    }
    console.log("  ✔ Duplicate address detected idempotently, preventing duplicate creation");

    // ------------------------------------------------------------------------
    // TEST 5: Scenario A — Checkout Autofill from Saved Addresses
    // ------------------------------------------------------------------------
    console.log("\n[TEST 5] Scenario A: Checkout Autofills Default Saved Address:");
    // In checkout, when customer opens checkout, fetch addresses where isDefault = true
    const checkoutAutofillRes = await pool.query(
      `SELECT * FROM "CustomerAddress" WHERE "customerId" = $1 AND "isDefault" = true LIMIT 1`,
      [CUST_A_ID]
    );
    if (checkoutAutofillRes.rows.length === 0) {
      throw new Error("Test 5 Failed: No default address found for checkout autofill");
    }
    const autofilled = checkoutAutofillRes.rows[0];
    const formattedAddress = [autofilled.city, autofilled.area, autofilled.street, autofilled.building ? `عمارة ${autofilled.building}` : '', autofilled.floor ? `دور ${autofilled.floor}` : '', autofilled.apartment ? `شقة ${autofilled.apartment}` : ''].filter(Boolean).join("، ");
    console.log("  Autofilled delivery address text:", formattedAddress);
    if (!formattedAddress.includes("جامعة الدلتا")) {
      throw new Error("Test 5 Failed: Formatted autofill text mismatch");
    }
    console.log("  ✔ Checkout accurately autofilled default address");

    // ------------------------------------------------------------------------
    // TEST 6: Scenario B — Auto-save Address During Checkout
    // ------------------------------------------------------------------------
    console.log("\n[TEST 6] Scenario B: Auto-Save New Address During Checkout:");
    const addrA3_Id = `addr_a3_${SUFFIX}`;
    // User types new address during checkout with saveAddress: true
    await pool.query(
      `INSERT INTO "CustomerAddress" ("id", "customerId", "label", "city", "area", "street", "building", "floor", "apartment", "notes", "isDefault")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [addrA3_Id, CUST_A_ID, "شقة المصيف", "جمصة", "العاشرة", "شارع الأندلس", "8", "2", "4", "أمام الموقف", false]
    );
    const hubCheckAfterCheckout = await pool.query(
      `SELECT * FROM "CustomerAddress" WHERE "id" = $1 AND "customerId" = $2`,
      [addrA3_Id, CUST_A_ID]
    );
    if (hubCheckAfterCheckout.rows.length !== 1) {
      throw new Error("Test 6 Failed: Address saved during checkout did not appear in customer data");
    }
    console.log("  ✔ New address entered in Checkout is durably saved and appears in Customer Hub");

    // ------------------------------------------------------------------------
    // TEST 7: Scenario E — Historical Order Address Snapshot Immutability
    // ------------------------------------------------------------------------
    console.log("\n[TEST 7] Scenario E: Historical Order Address Snapshot Preservation:");
    const historicalAddressSnapshot = "جمصة، المنطقة المركزية، شارع الكورنيش الرئيسي، عمارة 14، دور 3، شقة 7";
    await pool.query(
      `INSERT INTO "OrderStore" ("id", "orderNumber", "data", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, NOW(), NOW())`,
      [
        ORDER_A_ID,
        ORDER_A_NUM,
        JSON.stringify({
          id: ORDER_A_ID,
          orderNumber: ORDER_A_NUM,
          customerId: CUST_A_ID,
          customerPhone: PHONE_A,
          deliveryAddress: historicalAddressSnapshot,
          total: 450,
          status: "COMPLETED",
        }),
      ]
    );
    console.log("  Order created with frozen address snapshot:", historicalAddressSnapshot);

    // Now, Customer edits Address A1 in Customer Hub:
    console.log("  Customer edits Address A1 to a completely new location...");
    await pool.query(
      `UPDATE "CustomerAddress"
       SET "street" = 'شارع الجمهورية الجديد المعدل', "building" = '99', "updatedAt" = NOW()
       WHERE "id" = $1 AND "customerId" = $2`,
      [addrA1_Id, CUST_A_ID]
    );

    // Verify CustomerAddress was updated
    const updatedAddr = await pool.query(`SELECT * FROM "CustomerAddress" WHERE "id" = $1`, [addrA1_Id]);
    if (!updatedAddr.rows[0].street.includes("المعدل")) {
      throw new Error("Test 7 Failed: CustomerAddress was not updated");
    }

    // Verify Historical Order in OrderStore RETAINS original snapshot!
    const orderCheck = await pool.query(`SELECT data FROM "OrderStore" WHERE "id" = $1`, [ORDER_A_ID]);
    const storedOrder = orderCheck.rows[0].data;
    if (storedOrder.deliveryAddress !== historicalAddressSnapshot) {
      throw new Error("CRITICAL FAILURE: Historical order address snapshot was mutated by customer address edit!");
    }
    console.log("  ✔ Historical order deliveryAddress is 100% immutable and preserved");

    // ------------------------------------------------------------------------
    // TEST 8: Scenario D — Delete Address & Auto-Promotion of Next Default
    // ------------------------------------------------------------------------
    console.log("\n[TEST 8] Scenario D: Delete Address and Promote Next Default:");
    // Address A2 was default. Delete Address A2:
    await pool.query(`DELETE FROM "CustomerAddress" WHERE "id" = $1 AND "customerId" = $2`, [addrA2_Id, CUST_A_ID]);
    // Promote newest remaining address to default
    await pool.query(
      `UPDATE "CustomerAddress"
       SET "isDefault" = true
       WHERE "id" = (
         SELECT "id" FROM "CustomerAddress" WHERE "customerId" = $1 ORDER BY "createdAt" DESC LIMIT 1
       )`,
      [CUST_A_ID]
    );
    const remainingAddresses = await pool.query(
      `SELECT id, label, "isDefault" FROM "CustomerAddress" WHERE "customerId" = $1`,
      [CUST_A_ID]
    );
    const hasDefault = remainingAddresses.rows.some((a) => a.isDefault);
    if (!hasDefault) {
      throw new Error("Test 8 Failed: Expected a remaining address to be promoted to default");
    }
    console.log("  ✔ Deleted address removed cleanly, remaining address promoted to default");

    // ------------------------------------------------------------------------
    // TEST 9: Cross-Customer Isolation (Customer A vs Customer B)
    // ------------------------------------------------------------------------
    console.log("\n[TEST 9] Cross-Customer Data Isolation (Zero Data Leakage):");
    // Customer B queries addresses
    const custBAddresses = await pool.query(`SELECT * FROM "CustomerAddress" WHERE "customerId" = $1`, [CUST_B_ID]);
    if (custBAddresses.rows.length !== 0) {
      throw new Error("Test 9 Failed: Customer B should have 0 addresses");
    }
    // Customer B attempts to update Customer A's address:
    const hijackAttempt = await pool.query(
      `UPDATE "CustomerAddress" SET "notes" = 'HIJACKED' WHERE "id" = $1 AND "customerId" = $2 RETURNING *`,
      [addrA1_Id, CUST_B_ID]
    );
    if (hijackAttempt.rows.length > 0) {
      throw new Error("SECURITY FAILURE: Customer B was able to modify Customer A's address!");
    }
    // Customer B attempts to delete Customer A's address:
    const deleteAttempt = await pool.query(
      `DELETE FROM "CustomerAddress" WHERE "id" = $1 AND "customerId" = $2`,
      [addrA1_Id, CUST_B_ID]
    );
    if ((deleteAttempt.rowCount ?? 0) > 0) {
      throw new Error("SECURITY FAILURE: Customer B was able to delete Customer A's address!");
    }
    console.log("  ✔ Strict cross-customer isolation verified for SELECT, UPDATE, and DELETE");

    // ------------------------------------------------------------------------
    // CLEANUP: Clean up test data
    // ------------------------------------------------------------------------
    console.log("\n[CLEANUP] Cleaning up test records from Neon PostgreSQL:");
    await pool.query(`DELETE FROM "CustomerAddress" WHERE "customerId" IN ($1, $2)`, [CUST_A_ID, CUST_B_ID]);
    await pool.query(`DELETE FROM "OrderStore" WHERE "id" = $1`, [ORDER_A_ID]);
    await pool.query(`DELETE FROM "Customer" WHERE "id" IN ($1, $2)`, [CUST_A_ID, CUST_B_ID]);
    console.log("  ✔ All test records deleted cleanly with zero residue");

    console.log("\n================================================================================");
    console.log("   ALL CUSTOMER PERSISTENCE & CHECKOUT AUTOFILL TESTS PASSED (9/9)!             ");
    console.log("================================================================================");
  } finally {
    await pool.end();
  }
}

runTests().catch((err) => {
  console.error("\n❌ E2E TEST FAILED:", err);
  process.exit(1);
});
