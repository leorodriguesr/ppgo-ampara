ALTER TABLE "victim" ADD COLUMN "addressZip" TEXT,
ADD COLUMN "addressStreet" TEXT,
ADD COLUMN "addressNumber" TEXT,
ADD COLUMN "addressComplement" TEXT,
ADD COLUMN "addressDistrict" TEXT,
ADD COLUMN "addressCity" TEXT,
ADD COLUMN "addressState" TEXT;

ALTER TABLE "inmate" ADD COLUMN "addressZip" TEXT,
ADD COLUMN "addressStreet" TEXT,
ADD COLUMN "addressNumber" TEXT,
ADD COLUMN "addressComplement" TEXT,
ADD COLUMN "addressDistrict" TEXT,
ADD COLUMN "addressCity" TEXT,
ADD COLUMN "addressState" TEXT;
