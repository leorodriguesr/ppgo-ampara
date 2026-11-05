-- Percurso do agressor e da vítima a partir do raio de acompanhamento.
CREATE TYPE "TrackingZone" AS ENUM ('WATCH', 'VIOLATION');

CREATE TABLE "tracking_point" (
    "id" TEXT NOT NULL,
    "protectionOrderId" TEXT NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL,
    "zone" "TrackingZone" NOT NULL,
    "distanceMeters" DOUBLE PRECISION NOT NULL,
    "victimLatitude" DOUBLE PRECISION NOT NULL,
    "victimLongitude" DOUBLE PRECISION NOT NULL,
    "inmateLatitude" DOUBLE PRECISION NOT NULL,
    "inmateLongitude" DOUBLE PRECISION NOT NULL,
    "inmatePlace" TEXT,
    "victimPlace" TEXT,
    "radiusMeters" INTEGER NOT NULL,
    "watchRadiusMeters" INTEGER NOT NULL,

    CONSTRAINT "tracking_point_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "tracking_point_protectionOrderId_recordedAt_idx" ON "tracking_point"("protectionOrderId", "recordedAt");
CREATE INDEX "tracking_point_recordedAt_idx" ON "tracking_point"("recordedAt");

ALTER TABLE "tracking_point" ADD CONSTRAINT "tracking_point_protectionOrderId_fkey" FOREIGN KEY ("protectionOrderId") REFERENCES "protection_order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
