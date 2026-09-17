import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { deleteProtectionOrdersCascade } from "@/repositories/protection-order.repository";

export type VictimListParams = {
  q?: string;
  page?: number;
  pageSize?: number;
};

export async function createVictim(data: {
  fullName: string;
  phone?: string;
  document?: string;
  notes?: string;
  createdById: string;
}) {
  return prisma.victim.create({
    data: {
      fullName: data.fullName,
      phone: data.phone,
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

export async function updateVictim(
  id: string,
  data: {
    fullName?: string;
    phone?: string | null;
    document?: string | null;
    notes?: string | null;
  },
) {
  return prisma.victim.update({
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

export async function findVictimById(id: string) {
  return prisma.victim.findUnique({
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

export async function listVictims(params: VictimListParams) {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 20));
  const q = params.q?.trim();

  const where: Prisma.VictimWhereInput = q
    ? {
        OR: [
          { fullName: { contains: q, mode: "insensitive" } },
          { phone: { contains: q, mode: "insensitive" } },
          { document: { contains: q, mode: "insensitive" } },
          { publicId: { contains: q, mode: "insensitive" } },
        ],
      }
    : {};

  const [total, data] = await Promise.all([
    prisma.victim.count({ where }),
    prisma.victim.findMany({
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

export async function deleteVictimById(id: string) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.victim.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) return false;

    const orders = await tx.protectionOrder.findMany({
      where: { victimId: id },
      select: { id: true },
    });
    await deleteProtectionOrdersCascade(
      orders.map((order) => order.id),
      tx,
    );
    await tx.victim.delete({ where: { id } });
    return true;
  });
}
