import { getGuardiaoEndpoints } from "@/config/guardiao";
import { haversineDistanceMeters } from "@/lib/geo";

import { AnkleMonitorApiError, AnkleMonitorTimeoutError } from "./errors";
import type { LocalizarRequest, LocalizarResponse } from "./types";

const LIVE_TIMEOUT_MS = 8_000;

type GuardiaoPessoa = {
  pessoa_tipo?: string;
  pessoa_ident?: string;
  pessoa_nome?: string;
  latitude?: string | number;
  longitude?: string | number;
};

function normalizeIdent(value: string) {
  return value.trim().toUpperCase();
}

function extractPessoas(payload: unknown): GuardiaoPessoa[] {
  if (Array.isArray(payload)) {
    return payload as GuardiaoPessoa[];
  }
  if (
    payload &&
    typeof payload === "object" &&
    "resposta_dados" in payload &&
    Array.isArray((payload as { resposta_dados: unknown }).resposta_dados)
  ) {
    return (payload as { resposta_dados: GuardiaoPessoa[] }).resposta_dados;
  }
  throw new AnkleMonitorApiError("Resposta inválida do Guardião");
}

function parseCoord(value: string | number | undefined): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function guardiaoConfig() {
  const { mapApiUrl, origin, token, deviceKey } = getGuardiaoEndpoints();
  return {
    url: mapApiUrl,
    token: token.trim(),
    deviceKey: deviceKey.trim(),
    origin,
  };
}

function redactHeaders(headers: Record<string, string>) {
  const logged: Record<string, string> = { ...headers };
  if (logged.Authorization) {
    logged.Authorization = `Bearer *** (${headers.Authorization.length} chars)`;
  }
  return logged;
}

function logGuardiao(message: string, extra?: unknown) {
  if (extra === undefined) {
    console.log(`[guardiao] ${message}`);
    return;
  }
  console.log(`[guardiao] ${message}`, extra);
}

export function isGuardiaoConfigured() {
  const { url, token } = guardiaoConfig();
  return Boolean(url && token);
}

/**
 * Busca no mapa do Guardião e devolve só o MONITORADO cujo pessoa_ident
 * bate com o ID da tornozeleira. A lista completa nunca sai daqui.
 */
export async function localizarNoGuardiao(
  request: LocalizarRequest,
): Promise<LocalizarResponse> {
  const { url, token, deviceKey, origin } = guardiaoConfig();
  if (!url || !token) {
    logGuardiao("não configurado", {
      hasUrl: Boolean(url),
      hasToken: Boolean(token),
    });
    throw new AnkleMonitorApiError(
      "Guardião não configurado",
    );
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LIVE_TIMEOUT_MS);

  try {
    const headers: Record<string, string> = {
      Accept: "application/json, text/plain, */*",
      "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
      Authorization: `Bearer ${token}`,
      Origin: origin,
      Referer: `${origin.replace(/\/$/, "")}/`,
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36",
      "x-device-tipo": "NAV",
      "x-device-latitude": String(request.latitude),
      "x-device-longitude": String(request.longitude),
    };
    if (deviceKey) {
      headers["x-device-key"] = deviceKey;
    }

    logGuardiao("request GET", {
      url,
      headers: redactHeaders(headers),
      idDetento: request.idDetento,
      latitudeVitima: request.latitude,
      longitudeVitima: request.longitude,
    });

    const response = await fetch(url, {
      method: "GET",
      headers,
      signal: controller.signal,
      cache: "no-store",
    });

    const rawBody = await response.text();
    if (!response.ok) {
      logGuardiao(`response ${response.status}`, {
        ok: false,
        contentType: response.headers.get("content-type"),
        body: rawBody.slice(0, 500),
      });
      throw new AnkleMonitorApiError(
        `Guardião respondeu ${response.status}`,
      );
    }

    let payload: unknown;
    try {
      payload = rawBody ? JSON.parse(rawBody) : null;
    } catch {
      throw new AnkleMonitorApiError("Resposta inválida do Guardião");
    }

    const pessoas = extractPessoas(payload);
    const envelope =
      payload && typeof payload === "object" && !Array.isArray(payload)
        ? (payload as { resposta_codigo?: number; resposta_msg?: string })
        : null;
    logGuardiao(`response ${response.status}`, {
      ok: true,
      resposta_codigo: envelope?.resposta_codigo ?? null,
      resposta_msg: envelope?.resposta_msg ?? null,
      totalPessoas: pessoas.length,
    });

    const wanted = normalizeIdent(request.idDetento);
    const match = pessoas.find((pessoa) => {
      const tipo = (pessoa.pessoa_tipo ?? "").trim().toUpperCase();
      const ident = normalizeIdent(pessoa.pessoa_ident ?? "");
      return tipo === "MONITORADO" && ident === wanted;
    });

    logGuardiao("filtro", {
      total: pessoas.length,
      wanted,
      encontrado: Boolean(match),
      match: match
        ? {
            pessoa_tipo: match.pessoa_tipo,
            pessoa_ident: match.pessoa_ident,
            latitude: match.latitude,
            longitude: match.longitude,
          }
        : null,
    });

    if (!match) {
      throw new AnkleMonitorApiError(
        "Monitorado não encontrado no mapa do Guardião",
      );
    }

    const latitudePreso = parseCoord(match.latitude);
    const longitudePreso = parseCoord(match.longitude);
    if (latitudePreso == null || longitudePreso == null) {
      throw new AnkleMonitorApiError(
        "Coordenadas inválidas do monitorado no Guardião",
      );
    }

    const distanciaMetros = haversineDistanceMeters(
      request.latitude,
      request.longitude,
      latitudePreso,
      longitudePreso,
    );

    return {
      distanciaMetros: Math.round(distanciaMetros * 100) / 100,
      latitudePreso,
      longitudePreso,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    logGuardiao("erro", {
      name: error instanceof Error ? error.name : "unknown",
      message: error instanceof Error ? error.message : String(error),
    });
    if (error instanceof AnkleMonitorApiError) throw error;
    if (
      error instanceof Error &&
      (error.name === "AbortError" || error.name === "TimeoutError")
    ) {
      throw new AnkleMonitorTimeoutError("Timeout na API do Guardião");
    }
    throw new AnkleMonitorApiError(
      error instanceof Error ? error.message : "Falha na API do Guardião",
    );
  } finally {
    clearTimeout(timer);
  }
}
