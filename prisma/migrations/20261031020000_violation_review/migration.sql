CREATE TYPE "ViolationRuling" AS ENUM ('COUNTS', 'VICTIM_APPROACH', 'DISMISSED');

CREATE TABLE "violation_review" (
    "id" TEXT NOT NULL,
    "protectionOrderId" TEXT NOT NULL,
    "entryPointId" TEXT NOT NULL,
    "ruling" "ViolationRuling" NOT NULL,
    "actions" TEXT,
    "reviewedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "violation_review_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "violation_review_entryPointId_key" ON "violation_review"("entryPointId");
CREATE INDEX "violation_review_protectionOrderId_idx" ON "violation_review"("protectionOrderId");

ALTER TABLE "violation_review" ADD CONSTRAINT "violation_review_protectionOrderId_fkey" FOREIGN KEY ("protectionOrderId") REFERENCES "protection_order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "violation_review" ADD CONSTRAINT "violation_review_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
