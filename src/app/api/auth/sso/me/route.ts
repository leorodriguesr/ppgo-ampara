import { NextResponse } from "next/server";

import { readSessionFromCookies } from "@/lib/sso/session-cookie";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await readSessionFromCookies();

  if (!session) {
    return NextResponse.json(
      { code: "UNAUTHORIZED", message: "Não autenticado" },
      { status: 401 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      image: true,
    },
  });

  if (!user || !user.isActive) {
    return NextResponse.json(
      { code: "UNAUTHORIZED", message: "Sessão inválida" },
      { status: 401 },
    );
  }

  return NextResponse.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      cpf: session.cpf,
      image: user.image,
      perfisSistemaAtual: [],
      semPerfilThisSistema: false,
    },
  });
}
