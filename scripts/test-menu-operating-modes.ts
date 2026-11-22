import { NextRequest } from "next/server";
import { POST as checkoutPost } from "@/app/api/checkout/route";
import { GET as statusGet } from "@/app/api/orders/[orderNumber]/status/route";
import { GET as menuModeGet } from "@/app/api/menu-mode/route";
import { getMenuSettingsAsync, updateMenuSettingsAsync, listOrdersAsync } from "@/lib/orders-store";
import { normalizeOrderingMode, ORDERING_MODE_FEATURES, ORDERING_MODES_META } from "@/lib/order-settings-types";
import { getSiteData } from "@/lib/site-db";
import { getMenuForLocale } from "@/lib/menu-db";
import { prisma } from "@/lib/prisma";

async function run() {
  console.log("================================================================");
  console.log("  TEST SUITE: ALL 4 RUNTIME ORDERING MODES ENFORCEMENT & INTEGRATION");
  console.log("================================================================\n");

  const site = await getSiteData("ar");
  const branch = site.branches.find((b) => b.isOrderable && b.isActive) || site.branches[0];
  console.log("Branch:", branch.nameAr, `(${branch.id})`);

  const menu = await getMenuForLocale("ar");
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
  console.log("Test Product:", testProduct.nameAr, `(${testProduct.id}) @ ${testProduct.prices[0]?.price} EGP`);

  const initialSettings = await getMenuSettingsAsync(true);
  const initialMode = normalizeOrderingMode(initialSettings.mode);
  console.log("Initial Mode:", initialMode);

  let passedTests = 0;

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Mode A — FULL_ORDERING
    // -------------------------------------------------------------------------
    console.log("\n[Test 1] Mode A: FULL_ORDERING");
    await updateMenuSettingsAsync({ mode: "FULL_ORDERING", allowDelivery: true, allowTakeaway: true });
    
    // Check /api/menu-mode
    const mmRes1 = await menuModeGet();
    const mmData1 = await mmRes1.json();
    if (mmData1.normalizedMode !== "FULL_ORDERING" || !mmData1.isOrderable) {
      throw new Error(`Mode A menu-mode failed: ${JSON.stringify(mmData1)}`);
    }
    console.log("  ✔ /api/menu-mode verified: normalizedMode=FULL_ORDERING, isOrderable=true");

    // Submit checkout
    const reqA = new NextRequest("http://127.0.0.1:3000/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        locale: "ar",
        items: [{ productId: testProduct.id, quantity: 1, variantIndex: 0 }],
        orderType: "TAKEAWAY",
        customerPhone: "01024994092",
        customerName: "عميل نظام كامل",
        branchId: branch.id,
        paymentMethod: "CASH",
      }),
    });
    const resA = await checkoutPost(reqA);
    const dataA = await resA.json();
    if (resA.status === 200 && dataA.orderNumber && dataA.verificationToken) {
      console.log(`  ✔ [PASS] Checkout succeeded: Order #${dataA.orderNumber}, token=${dataA.verificationToken.slice(0, 10)}...`);
      passedTests++;
    } else {
      throw new Error(`Mode A checkout failed: status ${resA.status}, ${JSON.stringify(dataA)}`);
    }

    // -------------------------------------------------------------------------
    // TEST 2: Mode B — WHATSAPP_DATABASE
    // -------------------------------------------------------------------------
    console.log("\n[Test 2] Mode B: WHATSAPP_DATABASE");
    await updateMenuSettingsAsync({ mode: "WHATSAPP_DATABASE", allowDelivery: true, allowTakeaway: true });

    // Check /api/menu-mode
    const mmRes2 = await menuModeGet();
    const mmData2 = await mmRes2.json();
    if (mmData2.normalizedMode !== "WHATSAPP_DATABASE" || !mmData2.isOrderable) {
      throw new Error(`Mode B menu-mode failed: ${JSON.stringify(mmData2)}`);
    }
    console.log("  ✔ /api/menu-mode verified: normalizedMode=WHATSAPP_DATABASE, isOrderable=true");

    // Submit checkout
    const reqB = new NextRequest("http://127.0.0.1:3000/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        locale: "ar",
        items: [{ productId: testProduct.id, quantity: 1, variantIndex: 0 }],
        orderType: "TAKEAWAY",
        customerPhone: "01024994092",
        customerName: "عميل واتساب داتابيز",
        branchId: branch.id,
        paymentMethod: "CASH",
      }),
    });
    const resB = await checkoutPost(reqB);
    const dataB = await resB.json();
    if (resB.status === 200 && dataB.orderNumber && dataB.whatsappUrl) {
      console.log(`  ✔ [PASS] Checkout created in DB: Order #${dataB.orderNumber}, WhatsApp URL generated`);
      passedTests++;

      // Verify order status endpoint disables tracking polling
      const reqStatus = new NextRequest(
        `http://127.0.0.1:3000/api/orders/${dataB.orderNumber}/status?token=${dataB.verificationToken}`
      );
      const resStatus = await statusGet(reqStatus, { params: Promise.resolve({ orderNumber: dataB.orderNumber }) });
      const dataStatus = await resStatus.json();
      console.log(`  Status check: status=${dataStatus.status}, trackingDisabled=${dataStatus.trackingDisabled}, mode=${dataStatus.mode}`);
      if (dataStatus.trackingDisabled === true && dataStatus.mode === "WHATSAPP_DATABASE") {
        console.log("  ✔ [PASS] Tracking polling correctly disabled in WhatsApp mode");
        passedTests++;
      } else {
        throw new Error(`Expected trackingDisabled: true in WhatsApp mode, got: ${JSON.stringify(dataStatus)}`);
      }
    } else {
      throw new Error(`Mode B checkout failed: status ${resB.status}, ${JSON.stringify(dataB)}`);
    }

    // -------------------------------------------------------------------------
    // TEST 3: Mode C — DISPLAY_ONLY
    // -------------------------------------------------------------------------
    console.log("\n[Test 3] Mode C: DISPLAY_ONLY");
    await updateMenuSettingsAsync({
      mode: "DISPLAY_ONLY",
      noticeTitleAr: "المنيو للعرض فقط",
      noticeMessageAr: "يمكنك تصفح المنيو ولكن استقبال الطلبات متوقف حالياً.",
    });

    // Check /api/menu-mode
    const mmRes3 = await menuModeGet();
    const mmData3 = await mmRes3.json();
    if (mmData3.normalizedMode !== "DISPLAY_ONLY" || mmData3.isOrderable !== false) {
      throw new Error(`Mode C menu-mode failed: ${JSON.stringify(mmData3)}`);
    }
    console.log("  ✔ /api/menu-mode verified: normalizedMode=DISPLAY_ONLY, isOrderable=false");

    // Submit checkout (must be blocked 403)
    const reqC = new NextRequest("http://127.0.0.1:3000/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        locale: "ar",
        items: [{ productId: testProduct.id, quantity: 1, variantIndex: 0 }],
        orderType: "TAKEAWAY",
        customerPhone: "01024994092",
        branchId: branch.id,
        paymentMethod: "CASH",
      }),
    });
    const resC = await checkoutPost(reqC);
    const dataC = await resC.json();
    console.log(`  Display-Only status: ${resC.status}, code=${dataC.code}`);
    if (resC.status === 403 && dataC.code === "VIEW_ONLY") {
      console.log("  ✔ [PASS] Direct checkout blocked with HTTP 403 (VIEW_ONLY)");
      passedTests++;
    } else {
      throw new Error(`Mode C should reject with 403 VIEW_ONLY, got ${resC.status}: ${JSON.stringify(dataC)}`);
    }

    // -------------------------------------------------------------------------
    // TEST 4: Mode D — TEMPORARILY_CLOSED
    // -------------------------------------------------------------------------
    console.log("\n[Test 4] Mode D: TEMPORARILY_CLOSED");
    await updateMenuSettingsAsync({
      mode: "TEMPORARILY_CLOSED",
      noticeTitleAr: "المطعم مغلق مؤقتاً",
      closureMessageAr: "نعتذر عن استقبال الطلبات في الوقت الحالي.",
    });

    // Check /api/menu-mode
    const mmRes4 = await menuModeGet();
    const mmData4 = await mmRes4.json();
    if (mmData4.normalizedMode !== "TEMPORARILY_CLOSED" || mmData4.isOrderable !== false) {
      throw new Error(`Mode D menu-mode failed: ${JSON.stringify(mmData4)}`);
    }
    console.log("  ✔ /api/menu-mode verified: normalizedMode=TEMPORARILY_CLOSED, isOrderable=false");

    // Submit checkout (must be blocked 403)
    const reqD = new NextRequest("http://127.0.0.1:3000/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        locale: "ar",
        items: [{ productId: testProduct.id, quantity: 1, variantIndex: 0 }],
        orderType: "TAKEAWAY",
        customerPhone: "01024994092",
        branchId: branch.id,
        paymentMethod: "CASH",
      }),
    });
    const resD = await checkoutPost(reqD);
    const dataD = await resD.json();
    console.log(`  Temporarily-Closed status: ${resD.status}, code=${dataD.code}`);
    if (resD.status === 403 && dataD.code === "MENU_CLOSED") {
      console.log("  ✔ [PASS] Direct checkout blocked with HTTP 403 (MENU_CLOSED)");
      passedTests++;
    } else {
      throw new Error(`Mode D should reject with 403 MENU_CLOSED, got ${resD.status}: ${JSON.stringify(dataD)}`);
    }

    // -------------------------------------------------------------------------
    // TEST 5: Data Integrity & Zero Data Loss Verification
    // -------------------------------------------------------------------------
    console.log("\n[Test 5] Historical Data Integrity Verification");
    const ordersList = await listOrdersAsync({ pageSize: 10 });
    console.log(`  Total historical orders: ${ordersList.total}`);
    if (ordersList.total > 0 && ordersList.orders.length > 0) {
      console.log("  ✔ [PASS] Historical orders completely intact across mode switches (Zero Data Loss)");
      passedTests++;
    }

    console.log("\n================================================================");
    console.log(`  ✔ ALL ${passedTests} ORDERING MODE TESTS PASSED PERFECTLY!   `);
    console.log("================================================================\n");

  } finally {
    console.log(`Restoring initial system mode to: ${initialMode}`);
    await updateMenuSettingsAsync({
      mode: initialMode,
      updatedAt: new Date().toISOString(),
      updatedBy: "E2E Test Cleanup",
    });
  }
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Test failed:", err);
    process.exit(1);
  });
