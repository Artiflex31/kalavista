/*
  Warnings:

  - Made the column `trackingReference` on table `CommissionEnquiry` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "CommissionEnquiry" ALTER COLUMN "trackingReference" SET NOT NULL;
