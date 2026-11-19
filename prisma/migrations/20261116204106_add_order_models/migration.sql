-- CreateEnum
CREATE TYPE "OfferType" AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT', 'SPECIAL_PRICE', 'BUNDLE', 'BUY_X_GET_Y');

-- CreateEnum
CREATE TYPE "OrderType" AS ENUM ('DELIVERY', 'TAKEAWAY');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'CARD');

-- AlterTable
ALTER TABLE "Branch" ADD COLUMN     "addressEn" TEXT,
ADD COLUMN     "isOrderable" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "nameEn" TEXT,
ADD COLUMN     "openingHoursAr" TEXT,
ADD COLUMN     "openingHoursEn" TEXT,
ADD COLUMN     "whatsappNumber" TEXT;

-- AlterTable
ALTER TABLE "RestaurantSettings" ADD COLUMN     "deliveryFee" DECIMAL(10,2);

-- CreateTable
CREATE TABLE "OptionGroup" (
    "id" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "nameEn" TEXT,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "isMulti" BOOLEAN NOT NULL DEFAULT false,
    "minSelect" INTEGER NOT NULL DEFAULT 0,
    "maxSelect" INTEGER NOT NULL DEFAULT 1,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OptionGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OptionItem" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "nameEn" TEXT,
    "price" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OptionItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductOptionGroup" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProductOptionGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Offer" (
    "id" TEXT NOT NULL,
    "titleAr" TEXT NOT NULL,
    "titleEn" TEXT,
    "descAr" TEXT,
    "descEn" TEXT,
    "offerType" "OfferType" NOT NULL DEFAULT 'PERCENTAGE',
    "discountValue" DECIMAL(10,2),
    "promoPrice" DECIMAL(10,2),
    "buyQty" INTEGER DEFAULT 1,
    "getQty" INTEGER DEFAULT 1,
    "minOrderAmount" DECIMAL(10,2),
    "minQuantity" INTEGER DEFAULT 1,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "imageUrl" TEXT,
    "imagePublicId" TEXT,
    "badgeAr" TEXT DEFAULT 'عرض خاص',
    "badgeEn" TEXT DEFAULT 'Special Offer',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Offer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OfferProductTarget" (
    "id" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OfferProductTarget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OfferCategoryTarget" (
    "id" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OfferCategoryTarget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OfferLocationTarget" (
    "id" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "targetLocationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OfferLocationTarget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "type" "OrderType" NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "paymentMethod" "PaymentMethod" NOT NULL,
    "customerName" TEXT,
    "customerPhone" TEXT NOT NULL,
    "customerNotes" TEXT,
    "deliveryAddress" TEXT,
    "deliveryFee" DECIMAL(10,2),
    "branchId" TEXT,
    "subtotal" DECIMAL(10,2) NOT NULL,
    "totalDiscount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(10,2) NOT NULL,
    "whatsappSent" BOOLEAN NOT NULL DEFAULT false,
    "whatsappError" TEXT,
    "idempotencyKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "variantLabel" TEXT,
    "baseUnitPrice" DECIMAL(10,2) NOT NULL,
    "selectedOptions" JSONB,
    "appliedOffer" JSONB,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "notes" TEXT,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OptionGroup_isActive_sortOrder_idx" ON "OptionGroup"("isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "OptionItem_groupId_sortOrder_idx" ON "OptionItem"("groupId", "sortOrder");

-- CreateIndex
CREATE INDEX "ProductOptionGroup_productId_idx" ON "ProductOptionGroup"("productId");

-- CreateIndex
CREATE INDEX "ProductOptionGroup_groupId_idx" ON "ProductOptionGroup"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductOptionGroup_productId_groupId_key" ON "ProductOptionGroup"("productId", "groupId");

-- CreateIndex
CREATE INDEX "Offer_isActive_sortOrder_idx" ON "Offer"("isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "Offer_startDate_endDate_idx" ON "Offer"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "OfferProductTarget_offerId_idx" ON "OfferProductTarget"("offerId");

-- CreateIndex
CREATE INDEX "OfferProductTarget_productId_idx" ON "OfferProductTarget"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "OfferProductTarget_offerId_productId_key" ON "OfferProductTarget"("offerId", "productId");

-- CreateIndex
CREATE INDEX "OfferCategoryTarget_offerId_idx" ON "OfferCategoryTarget"("offerId");

-- CreateIndex
CREATE INDEX "OfferCategoryTarget_categoryId_idx" ON "OfferCategoryTarget"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "OfferCategoryTarget_offerId_categoryId_key" ON "OfferCategoryTarget"("offerId", "categoryId");

-- CreateIndex
CREATE INDEX "OfferLocationTarget_offerId_idx" ON "OfferLocationTarget"("offerId");

-- CreateIndex
CREATE INDEX "OfferLocationTarget_targetLocationId_idx" ON "OfferLocationTarget"("targetLocationId");

-- CreateIndex
CREATE UNIQUE INDEX "OfferLocationTarget_offerId_targetLocationId_key" ON "OfferLocationTarget"("offerId", "targetLocationId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_orderNumber_key" ON "Order"("orderNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Order_idempotencyKey_key" ON "Order"("idempotencyKey");

-- CreateIndex
CREATE INDEX "Order_status_createdAt_idx" ON "Order"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Order_branchId_createdAt_idx" ON "Order"("branchId", "createdAt");

-- CreateIndex
CREATE INDEX "Order_customerPhone_idx" ON "Order"("customerPhone");

-- CreateIndex
CREATE INDEX "Order_idempotencyKey_idx" ON "Order"("idempotencyKey");

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");

-- CreateIndex
CREATE INDEX "OrderItem_productId_idx" ON "OrderItem"("productId");

-- AddForeignKey
ALTER TABLE "OptionItem" ADD CONSTRAINT "OptionItem_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "OptionGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductOptionGroup" ADD CONSTRAINT "ProductOptionGroup_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductOptionGroup" ADD CONSTRAINT "ProductOptionGroup_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "OptionGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfferProductTarget" ADD CONSTRAINT "OfferProductTarget_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "Offer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfferProductTarget" ADD CONSTRAINT "OfferProductTarget_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfferCategoryTarget" ADD CONSTRAINT "OfferCategoryTarget_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "Offer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfferCategoryTarget" ADD CONSTRAINT "OfferCategoryTarget_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfferLocationTarget" ADD CONSTRAINT "OfferLocationTarget_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "Offer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
