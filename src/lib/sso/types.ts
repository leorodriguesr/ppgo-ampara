import type { AppRole } from "@/lib/rbac";

export type SsoPerfil = {
  descricao?: string;
  sistema?: {
    descricao?: string;
  };
};

export type SsoServidor = {
  cpf?: string;
  nome?: string;
  email?: string;
};

/** Formato típico retornado pelo SSO / API de verificação SSP */
export type SsoUserPayload = {
  token?: string;
  servidor?: SsoServidor;
  nome?: string;
  email?: string;
  cpf?: string;
  perfis?: SsoPerfil[];
  semPerfilThisSistema?: boolean;
  perfisSistemaAtual?: string[];
};

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  cpf: string | null;
  role: AppRole;
  isActive: boolean;
  perfisSistemaAtual: string[];
  semPerfilThisSistema: boolean;
  image?: string | null;
};

export type AuthState = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  verificandoToken: boolean;
  deslogar: boolean;
  redirectLogin: boolean;
  error: string | null;
};

export type SessionPayload = {
  userId: string;
  email: string;
  name: string;
  role: AppRole;
  cpf: string | null;
  isActive: boolean;
  exp: number;
};
