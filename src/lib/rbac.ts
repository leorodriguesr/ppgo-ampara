import type { UserRole } from "@/generated/prisma/client";

export const ROLES = {
  ADMIN: "ADMIN",
  POLICE: "POLICE",
} as const satisfies Record<UserRole, UserRole>;

export type AppRole = keyof typeof ROLES;

export const ROLE_LABELS: Record<AppRole, string> = {
  ADMIN: "Administrador",
  POLICE: "Polícia Penal",
};

/** Rotas do painel acessíveis apenas por ADMIN */
export const ADMIN_ONLY_PATHS = ["/audit"] as const;

export function isAppRole(value: unknown): value is AppRole {
  return value === "ADMIN" || value === "POLICE";
}

export function hasRole(
  userRole: string | null | undefined,
  allowed: AppRole | AppRole[],
): boolean {
  if (!userRole || !isAppRole(userRole)) return false;
  const list = Array.isArray(allowed) ? allowed : [allowed];
  return list.includes(userRole);
}

export function isAdmin(userRole: string | null | undefined): boolean {
  return hasRole(userRole, "ADMIN");
}

export function canAccessPath(
  userRole: string | null | undefined,
  pathname: string,
): boolean {
  if (!isAppRole(userRole)) return false;

  const isAdminOnly = ADMIN_ONLY_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );

  if (isAdminOnly) {
    return isAdmin(userRole);
  }

  return true;
}
