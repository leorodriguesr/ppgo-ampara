import {
  SSO_ADMIN_PROFILES,
  SSO_POLICE_PROFILES,
  sistemaNameSSO,
} from "@/config/sistema";
import type { AppRole } from "@/lib/rbac";
import type { AuthUser, SsoUserPayload } from "@/lib/sso/types";

function normalizeProfile(value: string) {
  return value.trim().toUpperCase();
}

export function extractPerfisSistemaAtual(payload: SsoUserPayload): string[] {
  if (!payload.perfis?.length) return [];

  const profiles: string[] = [];

  for (const perfil of payload.perfis) {
    const sistema = perfil.sistema?.descricao?.toUpperCase();
    const descricao = perfil.descricao ? normalizeProfile(perfil.descricao) : "";

    if (!descricao) continue;

    if (
      !sistema ||
      sistema === sistemaNameSSO.toUpperCase() ||
      sistema.includes(sistemaNameSSO.toUpperCase())
    ) {
      if (!profiles.includes(descricao)) {
        profiles.push(descricao);
      }
    }
  }

  return profiles;
}

export function mapPerfisToRole(perfisSistemaAtual: string[]): AppRole | null {
  if (perfisSistemaAtual.length === 0) return null;

  const hasAdmin = perfisSistemaAtual.some((perfil) =>
    (SSO_ADMIN_PROFILES as readonly string[]).includes(perfil),
  );
  if (hasAdmin) return "ADMIN";

  const hasPolice = perfisSistemaAtual.some((perfil) =>
    (SSO_POLICE_PROFILES as readonly string[]).includes(perfil),
  );
  if (hasPolice) return "POLICE";

  // Qualquer perfil válido do sistema concede acesso operacional padrão
  return "POLICE";
}

export function prepareSsoUserData(payload: SsoUserPayload): Omit<
  AuthUser,
  "id"
> & { rawEmail?: string } {
  const perfisSistemaAtual = extractPerfisSistemaAtual(payload);
  const semPerfilThisSistema = perfisSistemaAtual.length < 1;
  const role = mapPerfisToRole(perfisSistemaAtual) ?? "POLICE";

  const cpf = payload.servidor?.cpf ?? payload.cpf ?? null;
  const name =
    payload.servidor?.nome ??
    payload.nome ??
    (cpf ? `Servidor ${cpf}` : "Usuário SSO");
  const email =
    payload.servidor?.email ??
    payload.email ??
    (cpf
      ? `${cpf.replace(/\D/g, "")}@sso.mulhersegura.local`
      : "usuario@sso.mulhersegura.local");

  return {
    name,
    email: email.toLowerCase(),
    cpf,
    role,
    isActive: true,
    perfisSistemaAtual,
    semPerfilThisSistema,
    image: null,
  };
}
