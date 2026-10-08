-- CreateEnum
CREATE TYPE "ArtworkOrderStatus" AS ENUM ('PENDING_PAYMENT', 'PAID', 'PAYMENT_FAILED', 'CANCELLED', 'FULFILLED', 'REFUNDED');

-- CreateTable
CREATE TABLE "ArtworkOrder" (
    "id" SERIAL NOT NULL,
    "reference" TEXT NOT NULL,
    "artworkId" INTEGER NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "customerPhone" TEXT,
    "shippingAddress" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "amountInPaise" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" "ArtworkOrderStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "razorpayOrderId" TEXT,
    "razorpayPaymentId" TEXT,
    "razorpaySignature" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArtworkOrder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ArtworkOrder_reference_key" ON "ArtworkOrder"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "ArtworkOrder_razorpayOrderId_key" ON "ArtworkOrder"("razorpayOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "ArtworkOrder_razorpayPaymentId_key" ON "ArtworkOrder"("razorpayPaymentId");

-- CreateIndex
CREATE INDEX "ArtworkOrder_artworkId_idx" ON "ArtworkOrder"("artworkId");

-- CreateIndex
CREATE INDEX "ArtworkOrder_status_idx" ON "ArtworkOrder"("status");

-- CreateIndex
CREATE INDEX "ArtworkOrder_customerEmail_idx" ON "ArtworkOrder"("customerEmail");

-- AddForeignKey
ALTER TABLE "ArtworkOrder" ADD CONSTRAINT "ArtworkOrder_artworkId_fkey" FOREIGN KEY ("artworkId") REFERENCES "Artwork"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
