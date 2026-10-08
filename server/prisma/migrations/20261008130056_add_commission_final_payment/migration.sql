/*
  Warnings:

  - A unique constraint covering the columns `[finalRazorpayOrderId]` on the table `CommissionPayment` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[finalRazorpayPaymentId]` on the table `CommissionPayment` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "CommissionFinalPaymentStatus" AS ENUM ('NOT_REQUESTED', 'AWAITING_PAYMENT', 'PAID', 'CANCELLED');

-- AlterTable
ALTER TABLE "CommissionPayment" ADD COLUMN     "AmountInPaise" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "finalAmountInPaise" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "finalPaymentStatus" "CommissionFinalPaymentStatus" NOT NULL DEFAULT 'NOT_REQUESTED',
ADD COLUMN     "finalRazorpayOrderId" TEXT,
ADD COLUMN     "finalRazorpayPaymentId" TEXT,
ADD COLUMN     "finalRazorpaySignature" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "CommissionPayment_finalRazorpayOrderId_key" ON "CommissionPayment"("finalRazorpayOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "CommissionPayment_finalRazorpayPaymentId_key" ON "CommissionPayment"("finalRazorpayPaymentId");
