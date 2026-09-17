export const APP_NAME = "AMPARA";

/**
 * Identidade no SSO SSP-GO (client_id / descricao do sistema).
 * Precisa estar cadastrado no SSO com redirect
 * https://ampara-h.ssp.go.gov.br/auth/callback
 */
export const sistemaNameSSO = "ampara";

export const APP_HOSTS = {
  DESV: "localhost:3000",
  HOMO: "ampara-h.ssp.go.gov.br",
  PROD: "ampara.ssp.go.gov.br",
} as const;

export const domainNameProd = APP_HOSTS.PROD;
export const domainNameHomo = APP_HOSTS.HOMO;
export const domainNameDesv = "localhost";

export type Ambiente = "PROD" | "HOMO" | "DESV";

function hostnameOnly(value: string) {
  return value.split(":")[0].toLowerCase();
}

export function resolveAmbiente(hostname?: string | null): Ambiente {
  const host = hostnameOnly(hostname || inferHostname());

  if (host === "localhost" || host === "127.0.0.1") return "DESV";
  if (host === hostnameOnly(APP_HOSTS.PROD)) return "PROD";
  return "HOMO";
}

function inferHostname() {
  if (process.env.NODE_ENV === "production") return APP_HOSTS.HOMO;
  return APP_HOSTS.DESV;
}

export function getAppOrigin(hostname?: string | null): string {
  const ambiente = resolveAmbiente(hostname);

  if (ambiente === "PROD") return `https://${APP_HOSTS.PROD}`;
  if (ambiente === "HOMO") return `https://${APP_HOSTS.HOMO}`;
  return `http://${APP_HOSTS.DESV}`;
}

/** Mock de SSO só fora de production (next start / K8s). */
export function isSsoDevMockEnabled() {
  return process.env.NODE_ENV !== "production";
}

/** Perfis SSO que mapeiam para role ADMIN no painel */
export const SSO_ADMIN_PROFILES = ["ADMIN", "ADM", "ADMINISTRADOR"] as const;

/** Perfis SSO que mapeiam para role POLICE no painel */
export const SSO_POLICE_PROFILES = [
  "POLICE",
  "POLICIA",
  "AGENTE",
  "OPERADOR",
  "ATENDENTE",
  "BASICO",
  "SUPORTE",
] as const;
