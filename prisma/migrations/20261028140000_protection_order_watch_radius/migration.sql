-- Raio de visualização do policial e última posição conhecida do agressor.
ALTER TABLE "protection_order" ADD COLUMN "watchRadiusMeters" INTEGER NOT NULL DEFAULT 1000;
ALTER TABLE "protection_order" ADD COLUMN "lastInmateLatitude" DOUBLE PRECISION;
ALTER TABLE "protection_order" ADD COLUMN "lastInmateLongitude" DOUBLE PRECISION;
ALTER TABLE "protection_order" ADD COLUMN "lastInmateAt" TIMESTAMP(3);
