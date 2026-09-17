export function getQueryParam(name: string): string | null {
  if (typeof window === "undefined") return null;

  const params = new URLSearchParams(window.location.search);
  const value = params.get(name);
  return value;
}

export function removeQueryParam(name: string) {
  if (typeof window === "undefined") return;

  const url = new URL(window.location.href);
  url.searchParams.delete(name);
  window.history.replaceState({}, "", url.toString());
}

export function buildRedirectUri(origin: string) {
  // Callback dedicado — evita perder access_token no middleware
  return `${origin}/auth/callback`;
}
