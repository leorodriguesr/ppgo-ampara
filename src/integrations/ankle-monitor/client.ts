import { haversineDistanceMeters } from "@/lib/geo";

import { localizarNoGuardiao } from "./guardiao";
import { resolveMockInmateLocation } from "./mock-store";
import type { LocalizarRequest, LocalizarResponse } from "./types";

function localizarMock(request: LocalizarRequest): LocalizarResponse {
  const location = resolveMockInmateLocation(
    request.idDetento,
    request.latitude,
    request.longitude,
  );

  const distanciaMetros = haversineDistanceMeters(
    request.latitude,
    request.longitude,
    location.latitude,
    location.longitude,
  );

  return {
    distanciaMetros: Math.round(distanciaMetros * 100) / 100,
    latitudePreso: location.latitude,
    longitudePreso: location.longitude,
    timestamp: location.updatedAt,
  };
}

/**
 * Simulação (padrão da medida) usa mock; medida real usa o mapa do Guardião.
 */
export async function localizarDetento(
  request: LocalizarRequest,
): Promise<LocalizarResponse> {
  if (request.isSimulation !== false) {
    console.log("[guardiao] medida em simulação — não chama a API", {
      idDetento: request.idDetento,
    });
    return localizarMock(request);
  }
  return localizarNoGuardiao(request);
}
