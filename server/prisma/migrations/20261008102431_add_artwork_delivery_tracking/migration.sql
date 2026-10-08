-- CreateEnum
CREATE TYPE "ArtworkDeliveryProgress" AS ENUM ('PAYMENT_RECEIVED', 'PREPARING', 'PACKED', 'SHIPPED', 'DELIVERED');

-- AlterTable
ALTER TABLE "ArtworkOrder" ADD COLUMN     "courierName" TEXT,
ADD COLUMN     "deliveryProgress" "ArtworkDeliveryProgress" NOT NULL DEFAULT 'PAYMENT_RECEIVED',
ADD COLUMN     "trackingNumber" TEXT;

-- CreateIndex
CREATE INDEX "ArtworkOrder_deliveryProgress_idx" ON "ArtworkOrder"("deliveryProgress");
