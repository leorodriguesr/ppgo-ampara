import { redirect } from "next/navigation";

import { ForbiddenError, UnauthorizedError } from "@/lib/errors";
import { canAccessPath, hasRole, type AppRole, isAppRole } from "@/lib/rbac";
import { readSessionFromCookies } from "@/lib/sso/session-cookie";
import type { AuthUser } from "@/lib/sso/types";
import { ensureUserFromSession } from "@/repositories/user.repository";

export type Session = {
  user: AuthUser;
};

export async function getSession(): Promise<Session | null> {
  const payload = await readSessionFromCookies();
  if (!payload) return null;

  if (!isAppRole(payload.role) || !payload.isActive) {
    return null;
  }

  const persisted = await ensureUserFromSession({
    id: payload.userId,
    email: payload.email,
    name: payload.name,
    role: payload.role,
    isActive: payload.isActive,
  });

  if (!persisted.isActive) {
    return null;
  }

  return {
    user: {
      id: persisted.id,
      name: persisted.name,
      email: persisted.email,
      cpf: payload.cpf,
      role: persisted.role,
      isActive: persisted.isActive,
      perfisSistemaAtual: [],
      semPerfilThisSistema: false,
      image: persisted.image,
    },
  };
}

export async function requireSession(): Promise<Session> {
  const session = await getSession();

  if (!session) {
    throw new UnauthorizedError();
  }

  if (!session.user.isActive) {
    throw new ForbiddenError("Usuário inativo");
  }

  return session;
}

export async function requireRole(
  allowed: AppRole | AppRole[],
): Promise<Session> {
  const session = await requireSession();

  if (!hasRole(session.user.role, allowed)) {
    throw new ForbiddenError("Permissão insuficiente");
  }

  return session;
}

export async function requirePageSession(pathname = "/"): Promise<Session> {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  if (!session.user.isActive) {
    redirect("/login?error=inactive");
  }

  if (
    !isAppRole(session.user.role) ||
    !canAccessPath(session.user.role, pathname)
  ) {
    redirect("/?error=forbidden");
  }

  return session;
}
