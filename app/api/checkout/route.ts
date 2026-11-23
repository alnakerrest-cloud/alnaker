import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { getMenuForLocale } from "@/lib/menu-db";
import { getSiteData } from "@/lib/site-db";
import { getActiveOffers } from "@/lib/offers-db";
import { calculateOfferDiscount } from "@/lib/offers";
import { normalizeWhatsAppPhone, type CartItem, type SelectedOption } from "@/lib/cart";
import { 
  createOrder, 
  generateOrderNumber,
  generateVerificationToken,
  generateVerificationCode,
  getMenuSettings,
  getMenuSettingsAsync,
  normalizeOrderingMode,
  REASON_PRESETS,
  type OrderType, 
  type PaymentMethod,
  type OrderItemRecord,
  type SelectedOptionSnapshot,
  type AppliedOfferSnapshot
} from "@/lib/orders-store";

import { signCustomerSession, verifyCustomerSession, CUSTOMER_COOKIE_NAME, generateCustomerId } from "@/lib/customer-session";
import { resolveEffectiveBranch } from "@/lib/order-settings-types";
import { getOrCreateCustomerByPhoneAsync, getCustomerByIdAsync, updateCustomerNameAsync, normalizeEgyptianPhone } from "@/lib/customer-store";
import { getCustomerAddressesAsync, createCustomerAddressAsync, createOrderNotificationAsync } from "@/lib/customer-hub-store";

interface CheckoutRequest {
  locale: "ar" | "en";
  items: CartItem[];
  orderType: OrderType;
  customerName?: string;
  customerPhone: string;
  customerNotes?: string;
  deliveryAddress?: string;
  branchId: string;
  paymentMethod: PaymentMethod;
  idempotencyKey?: string;
  saveAddress?: boolean;
  addressDetails?: {
    label?: string;
    city?: string;
    area?: string;
    street?: string;
    building?: string;
    floor?: string;
    apartment?: string;
    notes?: string;
    isDefault?: boolean;
  };
}

function validateEgyptianPhone(phone: string): { valid: boolean; normalized: string; error?: string } {
  return normalizeEgyptianPhone(phone);
}

function formatWhatsAppOrderMessage(params: {
  orderNumber: string;
  orderType: OrderType;
  customerName?: string;
  customerPhone: string;
  customerNotes?: string;
  deliveryAddress?: string;
  branchName: string;
  branchAddress?: string;
  items: OrderItemRecord[];
  currency: string;
  subtotal: number;
  totalDiscount: number;
  deliveryFee: number;
  total: number;
  paymentMethod: PaymentMethod;
  locale: "ar" | "en";
  verificationToken?: string;
}): string {
  const isAr = params.locale === "ar";
  const lines: string[] = [];

  lines.push(`🍽️ *${isAr ? "قرية الناقر — طلب جديد" : "Al Naqer Village — New Order"}*`);
  lines.push(`📋 *${isAr ? "رقم الطلب" : "Order #"}:* ${params.orderNumber}`);
  lines.push(`📦 *${isAr ? "نوع الطلب" : "Order Type"}:* ${params.orderType === "DELIVERY" ? (isAr ? "توصيل للمنزل 🚚" : "Delivery 🚚") : (isAr ? "استلام من الفرع 🏢" : "Takeaway 🏢")}`);
  lines.push(`🏢 *${isAr ? "الفرع" : "Branch"}:* ${params.branchName}`);

  if (params.customerName) {
    lines.push(`👤 *${isAr ? "اسم العميل" : "Customer"}:* ${params.customerName}`);
  }
  lines.push(`📞 *${isAr ? "رقم الهاتف" : "Phone"}:* ${params.customerPhone}`);

  if (params.orderType === "DELIVERY" && params.deliveryAddress) {
    lines.push(`📍 *${isAr ? "عنوان التوصيل" : "Address"}:* ${params.deliveryAddress}`);
  }

  lines.push("────────────────────");
  lines.push(`*${isAr ? "الأصناف المطلوبة" : "Ordered Items"}:*`);

  params.items.forEach((item, index) => {
    const num = index + 1;
    const variantSuffix = item.variantLabel ? ` (${item.variantLabel})` : "";
    lines.push(`${num}. *${item.productName}*${variantSuffix}`);
    lines.push(`   • ${isAr ? "الكمية" : "Qty"}: ${item.quantity}`);

    if (item.selectedOptions && item.selectedOptions.length > 0) {
      const opts = item.selectedOptions
        .map((o) => `${o.name}${o.price > 0 ? ` (+${o.price} ${params.currency})` : ""}`)
        .join("، ");
      lines.push(`   • ${isAr ? "الإضافات" : "Addons"}: ${opts}`);
    }

    if (item.removedIngredients && item.removedIngredients.length > 0) {
      lines.push(`   • 🚫 ${isAr ? "بدون" : "Without"}: ${item.removedIngredients.join("، ")}`);
    }

    if (item.appliedOffer) {
      lines.push(`   • 🏷️ ${item.appliedOffer.title} (-${item.appliedOffer.discountPerUnit} ${params.currency})`);
    }

    lines.push(`   • ${isAr ? "السعر" : "Price"}: ${item.unitPrice} × ${item.quantity} = ${item.totalPrice} ${params.currency}`);

    if (item.notes) {
      lines.push(`   📝 ${isAr ? "ملاحظة" : "Note"}: ${item.notes}`);
    }
  });

  lines.push("────────────────────");
  if (params.totalDiscount > 0) {
    lines.push(`💰 *${isAr ? "المجموع قبل الخصم" : "Before Discount"}:* ${params.subtotal + params.totalDiscount} ${params.currency}`);
    lines.push(`🏷️ *${isAr ? "إجمالي الخصم" : "Discount"}:* -${params.totalDiscount} ${params.currency}`);
  }
  lines.push(`💰 *${isAr ? "المجموع الفرعي" : "Subtotal"}:* ${params.subtotal} ${params.currency}`);

  if (params.deliveryFee > 0) {
    lines.push(`🚚 *${isAr ? "رسوم التوصيل" : "Delivery Fee"}:* ${params.deliveryFee} ${params.currency}`);
  }

  lines.push(`🧾 *${isAr ? "الإجمالي النهائي" : "Total"}:* ${params.total} ${params.currency}`);
  lines.push(`💳 *${isAr ? "طريقة الدفع" : "Payment"}:* ${params.paymentMethod === "CASH" ? (isAr ? "نقداً عند الاستلام" : "Cash on Delivery") : (isAr ? "بطاقة دفع إلكتروني" : "Card")}`);

  if (params.customerNotes) {
    lines.push("────────────────────");
    lines.push(`📝 *${isAr ? "ملاحظات إضافية" : "Notes"}:* ${params.customerNotes}`);
  }

  if (params.verificationToken) {
    lines.push("────────────────────");
    lines.push(`🔍 *${isAr ? "رابط المتابعة المباشر" : "Live Tracking"}:* ${process.env.NEXT_PUBLIC_SITE_URL || "http://127.0.0.1:3000"}/${params.locale}/receipt/${params.orderNumber}?token=${params.verificationToken}`);
  }

  lines.push("────────────────────");
  lines.push(isAr ? "⏳ هذا الطلب قيد المراجعة ولا يعتبر مقبولاً نهائياً إلا بعد تأكيد إدارة المطعم." : "⏳ This order is under review and will only be officially accepted after restaurant confirmation.");

  return lines.join("\n");
}

export async function POST(request: NextRequest) {
  let body: CheckoutRequest;
  try {
    body = (await request.json()) as CheckoutRequest;
  } catch {
    return NextResponse.json({ error: "طلب غير صالح أو صيغة طلب غير صحيحة." }, { status: 400 });
  }

  try {
    const {
      locale = "ar",
      items,
      orderType,
      customerName,
      customerPhone,
      customerNotes,
      deliveryAddress,
      branchId,
      paymentMethod,
      idempotencyKey,
    } = body;

    // 1. Check Menu Operating Mode (always force fresh on checkout evaluation)
    const menuSettings = await getMenuSettingsAsync(true);
    const activeMode = normalizeOrderingMode(menuSettings.mode);

    if (activeMode === "DISPLAY_ONLY") {
      const isEn = locale === "en";
      const title = isEn
        ? menuSettings.noticeTitleEn || "Ordering is temporarily unavailable"
        : menuSettings.noticeTitleAr || "الطلبات متوقفة مؤقتًا";
      const msg = isEn
        ? menuSettings.noticeMessageEn || menuSettings.closureMessageEn || "You can browse our menu, but orders are not being accepted right now."
        : menuSettings.noticeMessageAr || menuSettings.closureMessageAr || "يمكنك تصفح المنيو والأسعار، لكن استقبال الطلبات غير متاح حاليًا.";
      const reasonLabel =
        menuSettings.reasonCode && REASON_PRESETS[menuSettings.reasonCode]
          ? isEn
            ? REASON_PRESETS[menuSettings.reasonCode].labelEn
            : REASON_PRESETS[menuSettings.reasonCode].labelAr
          : "";

      return NextResponse.json(
        {
          error: `${title}: ${msg}${reasonLabel ? ` (${isEn ? "Reason" : "السبب"}: ${reasonLabel})` : ""}`,
          title,
          message: msg,
          reason: reasonLabel,
          expectedResumeAt: menuSettings.expectedResumeAt || undefined,
          code: "VIEW_ONLY",
          mode: activeMode,
        },
        { status: 403 }
      );
    }
    if (activeMode === "TEMPORARILY_CLOSED") {
      const isEn = locale === "en";
      const title = isEn
        ? menuSettings.noticeTitleEn || "Restaurant Temporarily Closed"
        : menuSettings.noticeTitleAr || "المطعم مغلق مؤقتاً";
      const msg = isEn
        ? menuSettings.closureMessageEn || menuSettings.noticeMessageEn || "We are currently not accepting orders."
        : menuSettings.closureMessageAr || menuSettings.noticeMessageAr || "نعتذر عن استقبال الطلبات في الوقت الحالي.";
      const reasonLabel =
        menuSettings.reasonCode && REASON_PRESETS[menuSettings.reasonCode]
          ? isEn
            ? REASON_PRESETS[menuSettings.reasonCode].labelEn
            : REASON_PRESETS[menuSettings.reasonCode].labelAr
          : "";

      return NextResponse.json(
        {
          error: `${title}: ${msg}${reasonLabel ? ` (${isEn ? "Reason" : "السبب"}: ${reasonLabel})` : ""}`,
          title,
          message: msg,
          reason: reasonLabel,
          expectedResumeAt: menuSettings.expectedResumeAt || undefined,
          code: "MENU_CLOSED",
          mode: activeMode,
        },
        { status: 403 }
      );
    }

    // 2. Validate Order Type Allowed
    if (orderType === "DELIVERY" && !menuSettings.allowDelivery) {
      return NextResponse.json(
        { error: locale === "en" ? "Home delivery is temporarily paused." : "خدمة التوصيل للمنزل متوقفة مؤقتاً." },
        { status: 400 }
      );
    }
    if (orderType === "TAKEAWAY" && !menuSettings.allowTakeaway) {
      return NextResponse.json(
        { error: locale === "en" ? "Takeaway orders are temporarily paused." : "طلبات الاستلام من الفرع متوقفة مؤقتاً." },
        { status: 400 }
      );
    }

    // 3. Basic Payload Validation
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: locale === "en" ? "Cart is empty." : "السلة فارغة." }, { status: 400 });
    }

    if (!["DELIVERY", "TAKEAWAY"].includes(orderType)) {
      return NextResponse.json({ error: "نوع طلب غير صحيح." }, { status: 400 });
    }

    if (!["CASH", "CARD"].includes(paymentMethod)) {
      return NextResponse.json({ error: "طريقة دفع غير صحيحة." }, { status: 400 });
    }

    if (!customerPhone || !customerPhone.trim()) {
      return NextResponse.json({ error: "رقم الهاتف مطلوب." }, { status: 400 });
    }

    if (!branchId || !branchId.trim()) {
      return NextResponse.json({ error: "يجب اختيار الفرع." }, { status: 400 });
    }

    if (orderType === "DELIVERY" && (!deliveryAddress || !deliveryAddress.trim())) {
      return NextResponse.json({ error: "عنوان التوصيل مطلوب بالتفصيل." }, { status: 400 });
    }

    // Validate Egyptian Phone Number
    const phoneCheck = validateEgyptianPhone(customerPhone);
    if (!phoneCheck.valid) {
      return NextResponse.json({ error: phoneCheck.error }, { status: 400 });
    }
    const normalizedPhone = phoneCheck.normalized;

    // 4. Validate Branch
    const [categories, siteData, offers] = await Promise.all([
      getMenuForLocale(locale),
      getSiteData(locale),
      getActiveOffers(locale),
    ]);

    const branch = siteData.branches.find((b) => b.id === branchId);
    if (!branch) {
      return NextResponse.json({ error: "الفرع المحدد غير موجود." }, { status: 400 });
    }

    const branchOverride = menuSettings.branchOverrides?.[branchId];
    const effectiveBranch = resolveEffectiveBranch(branch, branchOverride);
    const isBranchOrderable = effectiveBranch.isOrderable;
    const isBranchOpen = effectiveBranch.isOpen;
    const isBranchActive = effectiveBranch.isActive;

    if (!isBranchActive || !isBranchOpen || !isBranchOrderable) {
      const msg =
        (locale === "en" ? branchOverride?.customMessageEn : branchOverride?.customMessageAr) ||
        branchOverride?.customMessageAr ||
        (locale === "en" ? "Selected branch is currently unavailable for orders." : "الفرع المحدد غير متاح لاستقبال الطلبات حالياً.");
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    if (orderType === "DELIVERY" && branchOverride?.allowDelivery === false) {
      return NextResponse.json(
        {
          error:
            locale === "en"
              ? "Home delivery is temporarily unavailable from this branch."
              : "خدمة التوصيل للمنزل غير متاحة حالياً من هذا الفرع.",
        },
        { status: 400 }
      );
    }

    if (orderType === "TAKEAWAY" && branchOverride?.allowTakeaway === false) {
      return NextResponse.json(
        {
          error:
            locale === "en"
              ? "Takeaway is temporarily unavailable from this branch."
              : "خدمة الاستلام من الفرع غير متاحة حالياً من هذا الفرع.",
        },
        { status: 400 }
      );
    }

    // 5. Build Item Lookup & Recalculate Prices Strictly Server-Side
    const productMap = new Map<string, any>();
    for (const cat of categories) {
      for (const sec of cat.sections) {
        for (const it of sec.items) {
          productMap.set(it.id, it);
        }
      }
    }

    let subtotal = 0;
    let totalDiscount = 0;
    const verifiedItems: OrderItemRecord[] = [];

    for (const cartItem of items) {
      const product = productMap.get(cartItem.productId);
      if (!product) {
        return NextResponse.json(
          { error: `المنتج غير موجود بالمنيو: ${cartItem.name || cartItem.productId}` },
          { status: 400 }
        );
      }

      // Quantity must be integer >= 1
      const quantity = Math.max(1, Math.floor(Number(cartItem.quantity) || 1));

      // Variant index validation
      const variantIdx = Math.max(
        0,
        Math.min(cartItem.variantIndex ?? 0, product.prices.length - 1)
      );
      const priceObj = product.prices[variantIdx];
      const basePrice =
        typeof priceObj.value === "number"
          ? priceObj.value
          : parseFloat(String(priceObj.value).split(/[\u2013\-]/)[0]) || 0;

      // Validate Options / Add-ons against product's actual option groups
      let addonsTotal = 0;
      const verifiedOptions: SelectedOptionSnapshot[] = [];

      if (product.optionGroups && product.optionGroups.length > 0) {
        for (const grp of product.optionGroups) {
          const selectedInGroup = (cartItem.selectedOptions || []).filter((o: any) =>
            grp.options.some((opt: any) => opt.id === o.id)
          );

          if (grp.isRequired && selectedInGroup.length === 0) {
            return NextResponse.json(
              { error: `يجب اختيار أحد خيارات: ${grp.name}` },
              { status: 400 }
            );
          }

          if (grp.minSelect && selectedInGroup.length < grp.minSelect) {
            return NextResponse.json(
              { error: `الحد الأدنى لخيارات ${grp.name} هو ${grp.minSelect}` },
              { status: 400 }
            );
          }

          if (grp.maxSelect && selectedInGroup.length > grp.maxSelect) {
            return NextResponse.json(
              { error: `الحد الأقصى لخيارات ${grp.name} هو ${grp.maxSelect}` },
              { status: 400 }
            );
          }
        }
      }

      if (cartItem.selectedOptions && product.optionGroups) {
        for (const opt of cartItem.selectedOptions) {
          for (const grp of product.optionGroups) {
            const matched = grp.options.find((o: any) => o.id === opt.id);
            if (matched) {
              const optPrice = Number(matched.price) || 0;
              verifiedOptions.push({
                id: matched.id,
                groupId: grp.id,
                groupName: grp.name,
                name: matched.name,
                price: optPrice,
              });
              addonsTotal += optPrice;
              break;
            }
          }
        }
      }

      const rawUnitPrice = basePrice + addonsTotal;

      // Offer discount recalculation
      const pricing = calculateOfferDiscount({
        productId: product.id,
        categoryId: product.categoryId ?? "",
        unitPrice: basePrice,
        quantity,
        branchId,
        activeOffers: offers,
        locale,
      });

      const unitPrice = pricing.discountedUnitPrice + addonsTotal;
      const itemTotalPrice = unitPrice * quantity;

      subtotal += itemTotalPrice;
      if (pricing.appliedOffer) {
        totalDiscount += (pricing.appliedOffer.discountPerUnit || 0) * quantity;
      }

      verifiedItems.push({
        id: `item-${product.id}-${variantIdx}-${verifiedItems.length}`,
        productId: product.id,
        productName: product.name,
        variantIndex: variantIdx,
        variantLabel: priceObj.label,
        baseUnitPrice: rawUnitPrice,
        selectedOptions: verifiedOptions,
        removedIngredients: Array.isArray(cartItem.removedIngredients) && cartItem.removedIngredients.length > 0
          ? cartItem.removedIngredients.map(String).map((s) => s.slice(0, 50))
          : undefined,
        appliedOffer: pricing.appliedOffer
          ? {
              id: pricing.appliedOffer.id,
              title: pricing.appliedOffer.title,
              discountPerUnit: pricing.appliedOffer.discountPerUnit,
            }
          : undefined,
        unitPrice,
        quantity,
        totalPrice: itemTotalPrice,
        notes: cartItem.notes ? String(cartItem.notes).slice(0, 300).trim() : undefined,
      });
    }

    // Delivery fee: only for DELIVERY
    const deliveryFee = orderType === "DELIVERY" ? (siteData.deliveryFee ?? 0) : 0;
    const finalTotal = subtotal + deliveryFee;

    // Target Phone for WhatsApp
    const targetPhone = branch.whatsappNumber || branch.phoneIntl || siteData.phoneIntl;
    const cleanWhatsAppPhone = normalizeWhatsAppPhone(targetPhone);

    // 5. Pre-generate durable Order Number & Security Tokens
    const generatedOrderNumber = generateOrderNumber();
    const generatedToken = generateVerificationToken();
    const generatedCode = generateVerificationCode();

    // Format definitive WhatsApp Message with exact orderNumber and verificationToken
    const finalWhatsAppMsg = formatWhatsAppOrderMessage({
      orderNumber: generatedOrderNumber,
      orderType,
      customerName: customerName ? customerName.slice(0, 100).trim() : undefined,
      customerPhone: normalizedPhone,
      customerNotes: customerNotes ? customerNotes.slice(0, 500).trim() : undefined,
      deliveryAddress: orderType === "DELIVERY" ? deliveryAddress?.slice(0, 300).trim() : undefined,
      branchName: branch.nameAr,
      branchAddress: branch.addressAr,
      items: verifiedItems,
      currency: siteData.currency,
      subtotal,
      totalDiscount,
      deliveryFee,
      total: finalTotal,
      paymentMethod,
      locale,
      verificationToken: generatedToken,
    });
    const finalWhatsAppUrl = `https://wa.me/${cleanWhatsAppPhone}?text=${encodeURIComponent(finalWhatsAppMsg)}`;

    // 6. Resolve / Create persistent Customer Identity
    const cookieToken = request.cookies.get(CUSTOMER_COOKIE_NAME)?.value;
    const authHeader = request.headers.get("authorization");
    const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    const existingCookie = cookieToken || bearerToken;
    const existingSession = verifyCustomerSession(existingCookie);

    const cleanCustomerName = customerName ? customerName.slice(0, 100).trim() : undefined;

    let customerRecord: any = null;
    try {
      if (existingSession && existingSession.phoneNormalized === normalizedPhone) {
        customerRecord = await getCustomerByIdAsync(existingSession.customerId);
      }
      if (!customerRecord) {
        customerRecord = await getOrCreateCustomerByPhoneAsync(
          normalizedPhone,
          cleanCustomerName,
          existingSession?.customerId
        );
      } else if (cleanCustomerName && (!customerRecord.name || customerRecord.name !== cleanCustomerName)) {
        await updateCustomerNameAsync(customerRecord.id, cleanCustomerName);
        customerRecord.name = cleanCustomerName;
      }
    } catch (custErr) {
      console.warn("[checkout] Customer resolve warning:", custErr);
    }
    const resolvedCustomerId = customerRecord?.id || generateCustomerId(normalizedPhone);

    // 7. Create and DURABLY AWAIT order commit to database
    const clientIp = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "127.0.0.1";

    const order = await createOrder({
      customerId: resolvedCustomerId,
      orderNumber: generatedOrderNumber,
      verificationToken: generatedToken,
      verificationCode: generatedCode,
      orderingMode: activeMode,
      type: orderType,
      paymentMethod,
      customerName: customerName ? customerName.slice(0, 100).trim() : undefined,
      customerPhone: customerPhone.trim(),
      customerPhoneNormalized: normalizedPhone,
      customerNotes: customerNotes ? customerNotes.slice(0, 500).trim() : undefined,
      deliveryAddress: orderType === "DELIVERY" ? deliveryAddress?.slice(0, 300).trim() : undefined,
      deliveryFee,
      branchId,
      branchNameAr: branch.nameAr,
      branchNameEn: branch.nameEn,
      branchAddressAr: branch.addressAr,
      branchAddressEn: branch.addressEn,
      branchPhoneIntl: branch.phoneIntl,
      branchWhatsappNumber: branch.whatsappNumber,
      currency: siteData.currency,
      items: verifiedItems,
      subtotal,
      totalDiscount,
      serviceCharge: 0,
      vatNote: siteData.vat,
      total: finalTotal,
      idempotencyKey,
      clientIp,
      whatsappMessage: finalWhatsAppMsg,
      whatsappUrl: finalWhatsAppUrl,
    });

    if (!order || !order.orderNumber) {
      throw new Error("تعذّر حفظ وتأكيد الطلب في قاعدة البيانات");
    }

    // Auto-save delivery address for customer if provided
    if (resolvedCustomerId && orderType === "DELIVERY" && deliveryAddress) {
      const cleanAddr = deliveryAddress.trim();
      getCustomerAddressesAsync(resolvedCustomerId).then((existingAddrs) => {
        if (!existingAddrs.some((a) => a.street === cleanAddr || `${a.street} ${a.building || ''}`.trim() === cleanAddr)) {
          createCustomerAddressAsync(resolvedCustomerId, {
            label: existingAddrs.length === 0 ? "المنزل" : "عنوان التوصيل",
            street: cleanAddr,
            isDefault: existingAddrs.length === 0,
          }).catch(() => {});
        }
      }).catch(() => {});
    }

    // Initial order notification
    if (resolvedCustomerId) {
      createOrderNotificationAsync({
        customerId: resolvedCustomerId,
        orderNumber: order.orderNumber,
        title: "تم استلام طلبك الجديد",
        message: `تم استلام طلبك رقم ${order.orderNumber} بنجاح بإجمالي ${order.total} ${order.currency || "ج.م"}.`,
        type: "ORDER_CREATED",
      }).catch(() => {});
    }

    // 7. Optional PostgreSQL Database Sync into relational Order and OrderItem tables
    try {
      await prisma.order.create({
        data: {
          id: order.id,
          orderNumber: order.orderNumber,
          type: order.type as any,
          status: "PENDING" as any,
          paymentMethod: order.paymentMethod as any,
          customerName: order.customerName,
          customerPhone: order.customerPhoneNormalized,
          customerNotes: order.customerNotes,
          deliveryAddress: order.deliveryAddress,
          deliveryFee: order.deliveryFee,
          branchId: branch.id,
          subtotal: order.subtotal,
          totalDiscount: order.totalDiscount,
          total: order.total,
          idempotencyKey: order.idempotencyKey,
          items: {
            create: verifiedItems.map((vi) => ({
              // vi.id is only unique inside one cart (item-<product>-<variant>-<index>).
              // Prefixing with the order id keeps OrderItem primary keys unique across orders.
              id: `${order.id}:${vi.id}`,
              productId: vi.productId,
              productName: vi.productName,
              variantLabel: vi.variantLabel,
              baseUnitPrice: vi.baseUnitPrice,
              selectedOptions: (vi.selectedOptions as any) ?? undefined,
              appliedOffer: (vi.appliedOffer as any) ?? undefined,
              unitPrice: vi.unitPrice,
              quantity: vi.quantity,
              notes: vi.notes,
            })),
          },
        },
      });
    } catch (dbErr: any) {
      console.warn("[checkout] DB sync note (relational Order table):", dbErr?.message || dbErr);
    }

    // Auto-save Delivery Address to Customer's Saved Addresses if requested
    if (orderType === "DELIVERY" && body.saveAddress) {
      try {
        const details = body.addressDetails || {};
        const streetVal = (details.street || deliveryAddress || "").trim();
        if (streetVal) {
          await createCustomerAddressAsync(resolvedCustomerId, {
            label: details.label || "المنزل",
            city: details.city,
            area: details.area,
            street: streetVal,
            building: details.building,
            floor: details.floor,
            apartment: details.apartment,
            notes: details.notes || customerNotes,
            isDefault: Boolean(details.isDefault),
          });
        }
      } catch (addrErr) {
        console.warn("[checkout] Error auto-saving customer address:", addrErr);
      }
    }

    const customerId = order.customerId || resolvedCustomerId;
    const sessionToken = signCustomerSession(customerId, normalizedPhone, order.customerName);

    const response = NextResponse.json({
      success: true,
      mode: activeMode,
      orderId: order.id,
      orderNumber: order.orderNumber,
      verificationToken: order.verificationToken,
      verificationCode: order.verificationCode,
      status: order.status,
      whatsappUrl: finalWhatsAppUrl,
      customerId,
      customerSessionToken: sessionToken,
      order,
    });

    response.cookies.set({
      name: CUSTOMER_COOKIE_NAME,
      value: sessionToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 60, // 60 days
    });

    return response;
  } catch (error: any) {
    const errorId = `err_${crypto.randomUUID().slice(0, 8)}`;
    console.error(`[checkout][${errorId}] Error creating order:`, {
      message: error?.message || String(error),
      name: error?.name,
      stack: error?.stack?.split("\n").slice(0, 3).join("\n"),
    });
    return NextResponse.json(
      { 
        error: "حدث خطأ أثناء معالجة الطلب. يرجى المحاولة مرة أخرى.",
        errorId,
      },
      { status: 500 }
    );
  }
}
