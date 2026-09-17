import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { deleteProtectionOrdersCascade } from "@/repositories/protection-order.repository";

export type InmateListParams = {
  q?: string;
  page?: number;
  pageSize?: number;
};

export async function createInmate(data: {
  fullName: string;
  externalInmateId: string;
  document?: string;
  notes?: string;
  createdById: string;
}) {
  return prisma.inmate.create({
    data: {
      fullName: data.fullName,
      externalInmateId: data.externalInmateId,
      document: data.document,
      notes: data.notes,
      createdById: data.createdById,
    },
    include: {
      createdBy: {
        select: { id: true, name: true, email: true },
      },
      _count: { select: { protectionOrders: true } },
    },
  });
}

export async function updateInmate(
  id: string,
  data: {
    fullName?: string;
    externalInmateId?: string;
    document?: string | null;
    notes?: string | null;
  },
) {
  return prisma.inmate.update({
    where: { id },
    data,
    include: {
      createdBy: {
        select: { id: true, name: true, email: true },
      },
      _count: { select: { protectionOrders: true } },
    },
  });
}

export async function findInmateById(id: string) {
  return prisma.inmate.findUnique({
    where: { id },
    include: {
      createdBy: {
        select: { id: true, name: true, email: true },
      },
      protectionOrders: {
        select: {
          id: true,
          publicId: true,
          status: true,
          radiusMeters: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      _count: { select: { protectionOrders: true } },
    },
  });
}

export async function findInmateByExternalId(externalInmateId: string) {
  return prisma.inmate.findUnique({
    where: { externalInmateId },
  });
}

export async function listInmates(params: InmateListParams) {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 20));
  const q = params.q?.trim();

  const where: Prisma.InmateWhereInput = q
    ? {
        OR: [
          { fullName: { contains: q, mode: "insensitive" } },
          { externalInmateId: { contains: q, mode: "insensitive" } },
          { document: { contains: q, mode: "insensitive" } },
          { publicId: { contains: q, mode: "insensitive" } },
        ],
      }
    : {};

  const [total, data] = await Promise.all([
    prisma.inmate.count({ where }),
    prisma.inmate.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        _count: { select: { protectionOrders: true } },
      },
    }),
  ]);

  return {
    data,
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function deleteInmateById(id: string) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.inmate.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) return false;

    const orders = await tx.protectionOrder.findMany({
      where: { inmateId: id },
      select: { id: true },
    });
    await deleteProtectionOrdersCascade(
      orders.map((order) => order.id),
      tx,
    );
    await tx.inmate.delete({ where: { id } });
    return true;
  });
}
