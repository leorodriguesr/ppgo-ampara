import { haversineDistanceMeters } from "@/lib/geo";
import { findSimulatedInmateLocation } from "@/repositories/simulated-inmate-location.repository";

import { localizarNoGuardiao } from "./guardiao";
import { resolveMockInmateLocation } from "./mock-store";
import type { LocalizarRequest, LocalizarResponse } from "./types";

async function localizarMock(
  request: LocalizarRequest,
): Promise<LocalizarResponse> {
  const stored = await findSimulatedInmateLocation(request.idDetento);
  const location = resolveMockInmateLocation(
    stored,
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
    return await localizarMock(request);
  }
  return localizarNoGuardiao(request);
}
