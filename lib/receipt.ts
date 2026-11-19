import type { Locale } from "@/lib/i18n";
import type { CartItem } from "@/lib/cart";

type OrderType = "DELIVERY" | "TAKEAWAY";
type PaymentMethod = "CASH" | "CARD";

export function formatOrderReceipt(params: {
  orderNumber: string;
  orderType: OrderType;
  customerName?: string;
  customerPhone: string;
  customerNotes?: string;
  deliveryAddress?: string;
  branchName?: string;
  branchAddress?: string;
  items: CartItem[];
  currency: string;
  subtotal: number;
  totalDiscount: number;
  deliveryFee: number;
  total: number;
  vatNote?: string;
  paymentMethod: PaymentMethod;
  locale: "ar" | "en";
}): string {
  const isAr = params.locale === "ar";
  const t = {
    orderNumber: isAr ? "رقم الطلب" : "Order Number",
    orderType: isAr ? "نوع الطلب" : "Order Type",
    delivery: isAr ? "توصيل" : "Delivery",
    takeaway: isAr ? "استلام" : "Takeaway",
    customer: isAr ? "العميل" : "Customer",
    phone: isAr ? "الهاتف" : "Phone",
    address: isAr ? "عنوان التوصيل" : "Delivery Address",
    branch: isAr ? "فرع الاستلام" : "Pickup Branch",
    items: isAr ? "العناصر" : "Items",
    qty: isAr ? "الكمية" : "Qty",
    price: isAr ? "السعر" : "Price",
    subtotal: isAr ? "المجموع الفرعي" : "Subtotal",
    discount: isAr ? "الخصم" : "Discount",
    deliveryFee: isAr ? "رسوم التوصيل" : "Delivery Fee",
    total: isAr ? "الإجمالي" : "Total",
    paymentMethod: isAr ? "طريقة الدفع" : "Payment Method",
    cash: isAr ? "نقداً" : "Cash",
    card: isAr ? "بطاقة" : "Card",
    notes: isAr ? "ملاحظات" : "Notes",
    thankYou: isAr ? "شكراً لطلبكم!" : "Thank you for your order!",
    vatNote: isAr ? "الأسعار تشمل ضريبة القيمة المضافة" : "Prices include VAT",
  };

  const lines: string[] = [];
  lines.push(`🍽️ *${isAr ? "قرية الناقر" : "Al Naqer Village"}*`);
  lines.push(`📋 *${t.orderNumber}:* ${params.orderNumber}`);
  lines.push(`📦 *${t.orderType}:* ${params.orderType === "DELIVERY" ? t.delivery : t.takeaway}`);
  
  if (params.customerName) {
    lines.push(`👤 *${t.customer}:* ${params.customerName}`);
  }
  lines.push(`📞 *${t.phone}:* ${params.customerPhone}`);
  
  if (params.orderType === "DELIVERY" && params.deliveryAddress) {
    lines.push(`📍 *${t.address}:* ${params.deliveryAddress}`);
  }
  
  if (params.orderType === "TAKEAWAY" && params.branchName) {
    lines.push(`🏢 *${t.branch}:* ${params.branchName}`);
    if (params.branchAddress) {
      lines.push(`📍 ${params.branchAddress}`);
    }
  }
  
  lines.push("────────────────────");
  lines.push(`*${t.items}:*`);
  
  params.items.forEach((item, index) => {
    const itemNum = index + 1;
    const variantSuffix = item.variantLabel ? ` (${item.variantLabel})` : "";
    lines.push(`${itemNum}. *${item.name}*${variantSuffix}`);
    lines.push(`   • ${t.qty}: ${item.quantity}`);
    
    if (item.appliedOffer) {
      lines.push(`   • ${isAr ? "السعر الأصلي" : "Original Price"}: ${item.baseUnitPrice} ${params.currency}`);
      lines.push(`   • ${isAr ? "الخصم" : "Discount"}: -${item.appliedOffer.discountPerUnit} ${params.currency} (${item.appliedOffer.title})`);
    }
    
    if (item.selectedOptions && item.selectedOptions.length > 0) {
      const optsStr = item.selectedOptions
        .map((o) => `${o.name}${o.price > 0 ? ` (+${o.price} ${params.currency})` : ""}`)
        .join("، ");
      lines.push(`   • ${isAr ? "الإضافات" : "Add-ons"}: ${optsStr}`);
    }
    
    lines.push(`   • ${t.price}: ${item.unitPrice} ${params.currency} (${item.quantity} × ${item.unitPrice} = ${item.quantity * item.unitPrice} ${params.currency})`);
    
    if (item.notes && item.notes.trim()) {
      lines.push(`   📝 ${t.notes}: ${item.notes.trim()}`);
    }
    if (index < params.items.length - 1) {
      lines.push("");
    }
  });
  
  lines.push("────────────────────");
  
  if (params.totalDiscount > 0) {
    lines.push(`💰 *${isAr ? "المجموع قبل الخصم" : "Original Subtotal"}:* ${params.subtotal + params.totalDiscount} ${params.currency}`);
    lines.push(`🏷️ *${t.discount}:* -${params.totalDiscount} ${params.currency}`);
  }
  
  lines.push(`💰 *${t.subtotal}:* ${params.subtotal} ${params.currency}`);
  
  if (params.deliveryFee > 0) {
    lines.push(`🚚 *${t.deliveryFee}:* ${params.deliveryFee} ${params.currency}`);
  }
  
  if (params.vatNote) {
    lines.push(`ℹ️ ${params.vatNote}`);
  }
  
  lines.push(`🧾 *${t.total}:* ${params.total} ${params.currency}`);
  lines.push(`💳 *${t.paymentMethod}:* ${params.paymentMethod === "CASH" ? t.cash : t.card}`);
  
  if (params.customerNotes && params.customerNotes.trim()) {
    lines.push("────────────────────");
    lines.push(`📝 *${t.notes}:*`);
    lines.push(params.customerNotes.trim());
  }
  
  lines.push("────────────────────");
  lines.push(`✨ ${t.thankYou}`);
  
  return lines.join("\n");
}