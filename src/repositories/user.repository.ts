import type { UserRole } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export async function findUserById(id: string) {
  return prisma.user.findUnique({ where: { id } });
}

export async function findUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
  });
}

/**
 * Garante User no banco a partir do cookie SSO.
 * Depois de um reset local o cookie sobrevive e o id some — sem isso
 * create de vítima/preso/medida quebra no FK createdById.
 */
export async function ensureUserFromSession(data: {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
}) {
  const email = data.email.trim().toLowerCase();

  const byId = await prisma.user.findUnique({ where: { id: data.id } });
  if (byId) return byId;

  const byEmail = await prisma.user.findUnique({ where: { email } });
  if (byEmail) return byEmail;

  try {
    return await prisma.user.create({
      data: {
        id: data.id,
        email,
        name: data.name,
        role: data.role,
        isActive: data.isActive,
        emailVerified: true,
      },
    });
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error
        ? String(error.code)
        : "";
    if (code === "P2002") {
      const existing =
        (await prisma.user.findUnique({ where: { id: data.id } })) ??
        (await prisma.user.findUnique({ where: { email } }));
      if (existing) return existing;
    }
    throw error;
  }
}
