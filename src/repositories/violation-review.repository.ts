import type { ViolationRuling } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export async function listViolationReviews(entryPointIds: string[]) {
  if (entryPointIds.length === 0) return [];
  return prisma.violationReview.findMany({
    where: { entryPointId: { in: entryPointIds } },
  });
}

export async function saveViolationReview(input: {
  protectionOrderId: string;
  entryPointId: string;
  ruling: ViolationRuling;
  actions: string | null;
  reviewedById: string;
  finalizedAt?: Date | null;
}) {
  const { finalizedAt, ...data } = input;
  return prisma.violationReview.upsert({
    where: { entryPointId: input.entryPointId },
    create: {
      ...data,
      ...(finalizedAt ? { finalizedAt } : {}),
    },
    update: {
      ruling: input.ruling,
      actions: input.actions,
      reviewedById: input.reviewedById,
      ...(finalizedAt !== undefined ? { finalizedAt } : {}),
    },
  });
}
