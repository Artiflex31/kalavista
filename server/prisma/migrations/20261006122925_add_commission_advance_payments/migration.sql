-- CreateEnum
CREATE TYPE "CommissionPaymentStatus" AS ENUM ('NOT_REQUESTED', 'AWAITING_ADVANCE', 'ADVANCE_PAID', 'FULLY_PAID', 'CANCELLED');

-- CreateTable
CREATE TABLE "CommissionPayment" (
    "id" SERIAL NOT NULL,
    "reference" TEXT NOT NULL,
    "enquiryId" INTEGER NOT NULL,
    "totalPriceInPaise" INTEGER NOT NULL,
    "advanceInPaise" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" "CommissionPaymentStatus" NOT NULL DEFAULT 'NOT_REQUESTED',
    "razorpayOrderId" TEXT,
    "razorpayPaymentId" TEXT,
    "razorpaySignature" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommissionPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CommissionPayment_reference_key" ON "CommissionPayment"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "CommissionPayment_enquiryId_key" ON "CommissionPayment"("enquiryId");

-- CreateIndex
CREATE UNIQUE INDEX "CommissionPayment_razorpayOrderId_key" ON "CommissionPayment"("razorpayOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "CommissionPayment_razorpayPaymentId_key" ON "CommissionPayment"("razorpayPaymentId");

-- CreateIndex
CREATE INDEX "CommissionPayment_status_idx" ON "CommissionPayment"("status");

-- AddForeignKey
ALTER TABLE "CommissionPayment" ADD CONSTRAINT "CommissionPayment_enquiryId_fkey" FOREIGN KEY ("enquiryId") REFERENCES "CommissionEnquiry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
