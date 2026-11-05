-- AlterEnum
CREATE TYPE "LookupStatus" AS ENUM ('UNKNOWN', 'OK', 'OUT_OF_WINDOW', 'FAILED');

-- AlterTable
ALTER TABLE "protection_order" ADD COLUMN "lastContactAt" TIMESTAMP(3),
ADD COLUMN "lastGpsAt" TIMESTAMP(3),
ADD COLUMN "lookupStatus" "LookupStatus" NOT NULL DEFAULT 'UNKNOWN';

-- AlterTable
ALTER TABLE "device" ADD COLUMN "backgroundEnabled" BOOLEAN;
