ALTER TABLE "violation_review" ADD COLUMN "finalizedAt" TIMESTAMP(3);

-- Anotações já salvas no modelo antigo equivalem a ocorrência registrada.
UPDATE "violation_review"
SET "finalizedAt" = "updatedAt"
WHERE "actions" IS NOT NULL AND BTRIM("actions") <> '';
