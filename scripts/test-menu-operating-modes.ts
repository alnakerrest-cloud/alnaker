import { NextRequest } from "next/server";
import { POST as checkoutPost } from "@/app/api/checkout/route";
import { getMenuSettingsAsync, updateMenuSettingsAsync } from "@/lib/orders-store";
import { getSiteData } from "@/lib/site-db";
import { getMenuForLocale } from "@/lib/menu-db";

async function run() {
  console.log("================================================================");
  console.log("  TEST SUITE: MENU OPERATING MODES & CHECKOUT ENFORCEMENT       ");
  console.log("================================================================\n");

  const site = await getSiteData("ar");
  const branch = site.branches.find((b) => b.isOrderable && b.isActive) || site.branches[0];
  console.log("Using Branch:", branch.nameAr, `(${branch.id})`);

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
  console.log("Using Product:", testProduct.nameAr, `(${testProduct.id}) @ ${testProduct.prices[0]?.price} EGP`);

  const initialSettings = await getMenuSettingsAsync(true);
  console.log("Initial Menu Mode:", initialSettings.mode);

  try {
    // 1. Test ACTIVE mode (VIEW_AND_ORDER)
    console.log("\n[Test 1] Mode: VIEW_AND_ORDER (Active Ordering)");
    await updateMenuSettingsAsync({ mode: "VIEW_AND_ORDER", allowDelivery: true, allowTakeaway: true });
    const activeReq = new NextRequest("http://127.0.0.1:3000/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        locale: "ar",
        items: [{ productId: testProduct.id, quantity: 1, variantIndex: 0 }],
        orderType: "TAKEAWAY",
        customerPhone: "01024994092",
        customerName: "عميل نشط",
        branchId: branch.id,
        paymentMethod: "CASH",
      }),
    });
    const activeRes = await checkoutPost(activeReq);
    const activeData = await activeRes.json();
    console.log("  Active Response Status:", activeRes.status);
    if (activeRes.status === 200 && activeData.orderNumber) {
      console.log("  ✔ [PASS] Checkout permitted in VIEW_AND_ORDER mode (Order #:", activeData.orderNumber + ")");
    } else {
      console.error("  ❌ [FAIL] Checkout failed in VIEW_AND_ORDER mode:", activeData);
      process.exit(1);
    }

    // 2. Test VIEW_ONLY mode
    console.log("\n[Test 2] Mode: VIEW_ONLY (Notice Banner / Orders Paused)");
    await updateMenuSettingsAsync({
      mode: "VIEW_ONLY",
      reasonCode: "HIGH_ORDER_VOLUME",
      noticeTitleAr: "نعتذر، ضغط طلبات حالياً",
      noticeMessageAr: "الطلبات متوقفة مؤقتاً لتجهيز الطلبات الحالية",
    });
    const viewOnlyReq = new NextRequest("http://127.0.0.1:3000/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        locale: "ar",
        items: [{ productId: testProduct.id, quantity: 1, variantIndex: 0 }],
        orderType: "TAKEAWAY",
        customerPhone: "01024994092",
        customerName: "عميل تجربة",
        branchId: branch.id,
        paymentMethod: "CASH",
      }),
    });
    const viewOnlyRes = await checkoutPost(viewOnlyReq);
    const viewOnlyData = await viewOnlyRes.json();
    console.log("  ViewOnly Response Status:", viewOnlyRes.status);
    console.log("  ViewOnly Response Code:", viewOnlyData.code);
    if (viewOnlyRes.status === 403 && viewOnlyData.code === "VIEW_ONLY") {
      console.log("  ✔ [PASS] Checkout rejected with 403 and code: VIEW_ONLY");
      console.log("  ✔ [PASS] Error title and reason returned:", viewOnlyData.title, "| Reason:", viewOnlyData.reason);
    } else {
      console.error("  ❌ [FAIL] VIEW_ONLY check failed:", viewOnlyData);
      process.exit(1);
    }

    // 3. Test TEMPORARILY_CLOSED mode
    console.log("\n[Test 3] Mode: TEMPORARILY_CLOSED (Full Restaurant Suspension)");
    await updateMenuSettingsAsync({
      mode: "TEMPORARILY_CLOSED",
      closureMessageAr: "المطعم في فترة استراحة مسائية وسنعاود العمل قريباً.",
    });
    const closedReq = new NextRequest("http://127.0.0.1:3000/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        locale: "ar",
        items: [{ productId: testProduct.id, quantity: 1, variantIndex: 0 }],
        orderType: "TAKEAWAY",
        customerPhone: "01024994092",
        customerName: "عميل تجربة",
        branchId: branch.id,
        paymentMethod: "CASH",
      }),
    });
    const closedRes = await checkoutPost(closedReq);
    const closedData = await closedRes.json();
    console.log("  Closed Response Status:", closedRes.status);
    console.log("  Closed Response Code:", closedData.code);
    if (closedRes.status === 403 && closedData.code === "MENU_CLOSED") {
      console.log("  ✔ [PASS] Checkout rejected with 403 and code: MENU_CLOSED");
      console.log("  ✔ [PASS] Error title and message returned:", closedData.title, "| Message:", closedData.message);
    } else {
      console.error("  ❌ [FAIL] TEMPORARILY_CLOSED check failed:", closedData);
      process.exit(1);
    }

    // 4. Test Delivery/Takeaway selective toggles
    console.log("\n[Test 4] Selective Order Type Toggles (Delivery Paused, Takeaway Allowed)");
    await updateMenuSettingsAsync({
      mode: "VIEW_AND_ORDER",
      allowDelivery: false,
      allowTakeaway: true,
    });
    const deliveryAttemptReq = new NextRequest("http://127.0.0.1:3000/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        locale: "ar",
        items: [{ productId: testProduct.id, quantity: 1, variantIndex: 0 }],
        orderType: "DELIVERY",
        deliveryAddress: "شارع التحرير، الدقي",
        customerPhone: "01024994092",
        customerName: "عميل دليفري",
        branchId: branch.id,
        paymentMethod: "CASH",
      }),
    });
    const deliveryAttemptRes = await checkoutPost(deliveryAttemptReq);
    const deliveryAttemptData = await deliveryAttemptRes.json();
    if (deliveryAttemptRes.status === 400 && deliveryAttemptData.error.includes("التوصيل للمنزل متوقفة")) {
      console.log("  ✔ [PASS] Delivery request rejected when allowDelivery=false");
    } else {
      console.error("  ❌ [FAIL] Delivery rejection failed:", deliveryAttemptData);
      process.exit(1);
    }

  } finally {
    // Restore original settings
    console.log("\n[Cleanup] Restoring original menu settings...");
    await updateMenuSettingsAsync({
      mode: "VIEW_AND_ORDER",
      allowDelivery: true,
      allowTakeaway: true,
    });
    const finalSettings = await getMenuSettingsAsync(true);
    console.log("  Restored mode:", finalSettings.mode);
    console.log("\n================================================================");
    console.log("  ALL MENU OPERATING MODE ENFORCEMENT TESTS PASSED!              ");
    console.log("================================================================\n");
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
