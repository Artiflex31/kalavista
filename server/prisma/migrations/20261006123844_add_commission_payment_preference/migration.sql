-- CreateEnum
CREATE TYPE "CommissionPaymentPreference" AS ENUM ('ADVANCE_60', 'FULL_PAYMENT');

-- AlterTable
ALTER TABLE "CommissionPayment" ADD COLUMN     "amountDueInPaise" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "paymentPreference" "CommissionPaymentPreference" NOT NULL DEFAULT 'ADVANCE_60';
