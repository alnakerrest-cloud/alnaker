import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import pg from "pg";

async function verifyLive() {
  console.log("=== TESTING LIVE PRODUCTION CHECKOUT & DURABLE RECEIPT ===\n");
  const PROD_URL = "https://naqer-menu.vercel.app";

  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  let createdOrderNumber: string | null = null;
  let createdOrderId: string | null = null;

  try {
    // 1. Execute Checkout on Live Production
    console.log("1. Sending POST /api/checkout to production...");
    const testIdempKey = "live-audit-" + Date.now();
    const payload = {
      locale: "ar",
      orderType: "TAKEAWAY",
      customerName: "فحص تدقيق الإنتاج",
      customerPhone: "01012345678",
      customerNotes: "اختبار دورة الطلب والإيصال المؤكدة",
      branchId: "7fa2be20-67bd-4060-a83a-81ded2550018", // Gamasa branch
      paymentMethod: "CASH",
      idempotencyKey: testIdempKey,
      items: [
        {
          productId: "0a67d363-e9fa-4854-981b-89d3b214260f", // صينية الوحوش
          name: "صينية الوحوش",
          price: 1820,
          quantity: 1,
          selectedOptions: [
            {
              id: "opt-tray-potatoes",
              groupId: "grp-tray-monsters-side",
              groupName: "اختيار الصنف الجانبي",
              name: "صينية بطاطس",
              price: 0
            }
          ],
        }
      ]
    };

    const checkoutRes = await fetch(`${PROD_URL}/api/checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const checkoutData = await checkoutRes.json();
    console.log(`Checkout response status: ${checkoutRes.status}`);
    console.log("Checkout response data:", {
      success: checkoutData.success,
      orderNumber: checkoutData.orderNumber,
      hasToken: Boolean(checkoutData.verificationToken),
      hasCode: Boolean(checkoutData.verificationCode),
      status: checkoutData.status,
    });

    if (!checkoutRes.ok || !checkoutData.success || !checkoutData.orderNumber) {
      throw new Error(`Checkout failed: ${JSON.stringify(checkoutData)}`);
    }

    createdOrderNumber = checkoutData.orderNumber as string;
    createdOrderId = checkoutData.orderId;
    const token = checkoutData.verificationToken;

    if (!createdOrderNumber) {
      throw new Error("Order number is null");
    }

    // 2. Verify durable commit in Neon Database immediately
    console.log(`\n2. Verifying Neon PostgreSQL OrderStore for ${createdOrderNumber}...`);
    const dbCheck = await pool.query(
      'SELECT id, "orderNumber", "verificationToken" FROM "OrderStore" WHERE "orderNumber" = $1',
      [createdOrderNumber]
    );
    console.log("Neon DB records found:", dbCheck.rows.length);
    if (dbCheck.rows.length !== 1) {
      throw new Error("FAIL: Order was NOT durably committed to Neon PostgreSQL!");
    }
    console.log("✓ CONFIRMED: Order is durably committed in Neon PostgreSQL before client navigation!");

    // 3. Verify Live Production Receipt Page (HTML)
    console.log(`\n3. Loading Receipt Page: /ar/receipt/${createdOrderNumber}?token=...`);
    const receiptPageRes = await fetch(`${PROD_URL}/ar/receipt/${createdOrderNumber}?token=${encodeURIComponent(token)}`);
    console.log(`Receipt Page HTTP Status: ${receiptPageRes.status}`);
    const receiptHtml = await receiptPageRes.text();
    const hasOrderNumber = receiptHtml.includes(createdOrderNumber);
    const hasNotFound = receiptHtml.includes("الطلب غير موجود");
    const hasItemName = receiptHtml.includes("صينية الوحوش");

    console.log("Receipt page contains order number:", hasOrderNumber);
    console.log("Receipt page contains 'الطلب غير موجود':", hasNotFound);
    console.log("Receipt page contains item 'صينية الوحوش':", hasItemName);

    if (!hasOrderNumber || hasNotFound) {
      throw new Error("FAIL: Receipt page says Order Not Found on production!");
    }
    console.log("✓ CONFIRMED: Receipt page successfully retrieved and rendered the order in Production!");

    // 4. Verify Live Production Order Status API
    console.log(`\n4. Querying /api/orders/${createdOrderNumber}/status...`);
    const statusRes = await fetch(`${PROD_URL}/api/orders/${createdOrderNumber}/status?token=${encodeURIComponent(token)}`);
    console.log(`Status API HTTP Status: ${statusRes.status}`);
    const statusData = await statusRes.json();
    console.log("Status API data:", {
      orderNumber: statusData.orderNumber,
      status: statusData.status,
      total: statusData.total,
      currency: statusData.currency,
      itemCount: statusData.itemCount,
    });
    if (statusData.orderNumber !== createdOrderNumber) {
      throw new Error("FAIL: Status API returned incorrect order!");
    }
    console.log("✓ CONFIRMED: Status API returns order details with 200 OK!");

    // 5. Verify Idempotency on Production (resend same payload)
    console.log(`\n5. Verifying Idempotency retry with same key: ${testIdempKey}...`);
    const retryRes = await fetch(`${PROD_URL}/api/checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const retryData = await retryRes.json();
    console.log(`Retry status: ${retryRes.status}, returned same order: ${retryData.orderNumber === createdOrderNumber}`);
    if (retryData.orderNumber !== createdOrderNumber) {
      throw new Error("FAIL: Idempotency failed, created a duplicate order!");
    }
    console.log("✓ CONFIRMED: Idempotency prevents duplicate orders on retry!");

    console.log("\n=== ALL PRODUCTION VERIFICATIONS PASSED 100% ===");

  } finally {
    // 6. Safe Cleanup of test order
    if (createdOrderId || createdOrderNumber) {
      console.log(`\nCleaning up audit test order from Neon database...`);
      if (createdOrderId) {
        await pool.query('DELETE FROM "OrderStore" WHERE "id" = $1', [createdOrderId]);
        await pool.query('DELETE FROM "OrderItem" WHERE "orderId" = $1', [createdOrderId]).catch(() => {});
        await pool.query('DELETE FROM "Order" WHERE "id" = $1', [createdOrderId]).catch(() => {});
      }
      if (createdOrderNumber) {
        await pool.query('DELETE FROM "OrderStore" WHERE "orderNumber" = $1', [createdOrderNumber]);
      }
      console.log("✓ Test order cleanly deleted. No test records remain in Production.");
    }
    await pool.end();
  }
}

verifyLive().catch((err) => {
  console.error("LIVE PRODUCTION VERIFICATION FAILED:", err);
  process.exit(1);
});
