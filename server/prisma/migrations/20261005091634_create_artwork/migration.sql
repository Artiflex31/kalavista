-- CreateEnum
CREATE TYPE "ArtworkAvailability" AS ENUM ('AVAILABLE', 'RESERVED', 'SOLD', 'NOT_FOR_SALE');

-- CreateTable
CREATE TABLE "Artwork" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "medium" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "dimensions" TEXT,
    "collection" TEXT,
    "moods" TEXT[],
    "categories" TEXT[],
    "availability" "ArtworkAvailability" NOT NULL DEFAULT 'AVAILABLE',
    "priceInPaise" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "imageUrl" TEXT,
    "alt" TEXT,
    "story" TEXT NOT NULL,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Artwork_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Artwork_slug_key" ON "Artwork"("slug");
