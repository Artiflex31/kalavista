/*
  Warnings:

  - A unique constraint covering the columns `[trackingReference]` on the table `CommissionEnquiry` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "CommissionProgress" AS ENUM ('REQUEST_RECEIVED', 'QUOTE_READY', 'ADVANCE_RECEIVED', 'IN_PROGRESS', 'PREVIEW_READY', 'COMPLETED', 'CANCELLED');

-- AlterTable
ALTER TABLE "CommissionEnquiry" ADD COLUMN     "progress" "CommissionProgress" NOT NULL DEFAULT 'REQUEST_RECEIVED',
ADD COLUMN     "trackingReference" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "CommissionEnquiry_trackingReference_key" ON "CommissionEnquiry"("trackingReference");
