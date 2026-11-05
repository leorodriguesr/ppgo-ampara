-- AlterTable
ALTER TABLE "protection_order" ADD COLUMN "simVictimLatitude" DOUBLE PRECISION,
ADD COLUMN "simVictimLongitude" DOUBLE PRECISION,
ADD COLUMN "simVictimAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "simulated_inmate_location" (
    "externalInmateId" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "simulated_inmate_location_pkey" PRIMARY KEY ("externalInmateId")
);

-- AddForeignKey
ALTER TABLE "simulated_inmate_location" ADD CONSTRAINT "simulated_inmate_location_externalInmateId_fkey" FOREIGN KEY ("externalInmateId") REFERENCES "inmate"("externalInmateId") ON DELETE CASCADE ON UPDATE CASCADE;
