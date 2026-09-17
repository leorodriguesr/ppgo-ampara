import { sistemaNameSSO } from "@/config/sistema";
import { getClientUrlsServices } from "@/config/urls";
import { SSO_TOKEN_STORAGE_KEY } from "@/lib/sso/constants";
import { buildRedirectUri } from "@/lib/sso/url-utils";

export function getSsoBaseUrl() {
  return getClientUrlsServices().urls.SSOWS;
}

/** URL de autenticação SSO (mesmo padrão do agendaac4). */
export function getUrlLogin(redirectOrigin?: string) {
  const origin =
    redirectOrigin ??
    (typeof window !== "undefined" ? window.location.origin : "");
  const redirectUri = buildRedirectUri(origin);

  return `${getSsoBaseUrl()}auth?response_type=token_only&client_id=${sistemaNameSSO}&redirect_uri=${encodeURIComponent(
    redirectUri.replace("#", "|"),
  )}`;
}

export function getUrlValidate(token: string) {
  return `${getSsoBaseUrl()}validate?token=${encodeURIComponent(token)}`;
}

export function getUrlLogout(token: string) {
  return `${getSsoBaseUrl()}logout?token=${encodeURIComponent(token)}`;
}

export async function apiLogoutUsuarioLogado() {
  const token =
    typeof window !== "undefined"
      ? window.localStorage.getItem(SSO_TOKEN_STORAGE_KEY)
      : null;

  if (!token) return;

  await fetch(getUrlLogout(token), {
    method: "GET",
    cache: "no-store",
  }).catch(() => undefined);
}
