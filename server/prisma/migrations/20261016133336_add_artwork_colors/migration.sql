-- AlterTable
ALTER TABLE "Artwork" ADD COLUMN     "colors" TEXT[] DEFAULT ARRAY[]::TEXT[];
