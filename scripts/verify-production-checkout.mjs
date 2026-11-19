async function runProductionTests() {
  const PROD_URL = "https://naqer-menu.vercel.app/api/checkout";
  console.log("Testing live production checkout at:", PROD_URL);

  // Test 1: Missing required options
  console.log("\n--- TEST 1: Missing Required Option (should return 400, not 500) ---");
  const badPayload = {
    branchId: "7fa2be20-67bd-4060-a83a-81ded2550018",
    orderType: "TAKEAWAY",
    customerName: "فحص الإنتاج تجريبي",
    customerPhone: "01012345678",
    paymentMethod: "CASH",
    items: [
      {
        productId: "p-mix-grill", // Has required "نوع اللحم"
        name: "مشكل مشاوي",
        quantity: 1,
        price: 250,
        options: [] // Missing required options!
      }
    ]
  };

  const res1 = await fetch(PROD_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(badPayload)
  });
  const data1 = await res1.json();
  console.log(`HTTP Status: ${res1.status}`);
  console.log("Response Body:", JSON.stringify(data1, null, 2));

  // Test 2: Valid checkout with valid options
  console.log("\n--- TEST 2: Valid Checkout (should return 200 with orderNumber & whatsappUrl) ---");
  const idempotencyKey = "prod-test-" + Date.now();
  const validPayload = {
    branchId: "7fa2be20-67bd-4060-a83a-81ded2550018",
    orderType: "TAKEAWAY",
    customerName: "فحص التحقق المباشر",
    customerPhone: "01099887766",
    paymentMethod: "CASH",
    idempotencyKey: idempotencyKey,
    items: [
      {
        productId: "p-mix-grill",
        name: "مشكل مشاوي",
        quantity: 1,
        price: 250,
        options: [
          {
            groupId: "grp-meat-type",
            groupName: "نوع اللحم",
            choiceId: "ch-lamb",
            choiceName: "ضاني",
            price: 40
          }
        ]
      }
    ]
  };

  const res2 = await fetch(PROD_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(validPayload)
  });
  const data2 = await res2.json();
  console.log(`HTTP Status: ${res2.status}`);
  console.log("Response Body:", JSON.stringify(data2, null, 2));

  // Test 3: Idempotency Retry with same idempotencyKey
  console.log("\n--- TEST 3: Idempotency Re-send with Same Key (should return 200 with same order) ---");
  const res3 = await fetch(PROD_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(validPayload)
  });
  const data3 = await res3.json();
  console.log(`HTTP Status: ${res3.status}`);
  console.log(`Same orderNumber returned? ${data2.order?.orderNumber === data3.order?.orderNumber}`);
  console.log("Response Body:", JSON.stringify(data3, null, 2));
}

runProductionTests().catch(console.error);
