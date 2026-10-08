-- CreateEnum
CREATE TYPE "EnquiryStatus" AS ENUM ('NEW', 'REVIEWING', 'ACCEPTED', 'DECLINED');

-- CreateTable
CREATE TABLE "CommissionEnquiry" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "artworkType" TEXT NOT NULL,
    "budget" TEXT,
    "message" TEXT NOT NULL,
    "timeline" TEXT,
    "artworkId" INTEGER,
    "status" "EnquiryStatus" NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommissionEnquiry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CommissionEnquiry_artworkId_idx" ON "CommissionEnquiry"("artworkId");

-- CreateIndex
CREATE INDEX "CommissionEnquiry_status_idx" ON "CommissionEnquiry"("status");

-- AddForeignKey
ALTER TABLE "CommissionEnquiry" ADD CONSTRAINT "CommissionEnquiry_artworkId_fkey" FOREIGN KEY ("artworkId") REFERENCES "Artwork"("id") ON DELETE SET NULL ON UPDATE CASCADE;
