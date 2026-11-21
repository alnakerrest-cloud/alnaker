const res = await fetch("https://naqer-menu.vercel.app/api/checkout", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    locale: "ar",
    items: [
      {
        id: "item-1",
        productId: "5580e943-c91a-41b4-9a62-b8591af1fc3e",
        name: "صينية الملوك",
        productName: "صينية الملوك",
        unitPrice: 2100,
        quantity: 1,
        totalPrice: 2100,
      },
    ],
    orderType: "DELIVERY",
    customerName: "فحص الإنتاج المباشر",
    customerPhone: "01024994092",
    deliveryAddress: "شارع الجمهورية - عمارة 14",
    branchId: "7fa2be20-67bd-4060-a83a-81ded2550018",
    paymentMethod: "CASH",
  }),
});

console.log("HTTP Status:", res.status);
const text = await res.text();
console.log("Body:", text);
