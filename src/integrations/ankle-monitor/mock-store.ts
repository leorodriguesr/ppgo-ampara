/** Offset padrão (~800 m ao norte) quando a posição do preso ainda não foi definida. */
export const DEFAULT_MOCK_OFFSET_METERS = 800;

const METERS_PER_DEG_LAT = 111_320;

export type MockInmateLocation = {
  latitude: number;
  longitude: number;
  updatedAt: string;
};

/** Desloca lat/lng por metros ao norte e a leste (aproximação plana). */
export function offsetLatLng(
  latitude: number,
  longitude: number,
  northMeters: number,
  eastMeters = 0,
): { latitude: number; longitude: number } {
  const dLat = northMeters / METERS_PER_DEG_LAT;
  const cosLat = Math.cos((latitude * Math.PI) / 180);
  const metersPerDegLng = METERS_PER_DEG_LAT * Math.max(cosLat, 1e-6);
  const dLng = eastMeters / metersPerDegLng;
  return {
    latitude: latitude + dLat,
    longitude: longitude + dLng,
  };
}

/**
 * Posição do preso no mock.
 * Se não houver valor gravado, retorna ~800 m ao norte do ponto de referência da vítima.
 */
export function resolveMockInmateLocation(
  stored: { latitude: number; longitude: number; updatedAt: Date } | null,
  referenceLatitude: number,
  referenceLongitude: number,
): MockInmateLocation {
  if (stored) {
    return {
      latitude: stored.latitude,
      longitude: stored.longitude,
      updatedAt: stored.updatedAt.toISOString(),
    };
  }

  const offset = offsetLatLng(
    referenceLatitude,
    referenceLongitude,
    DEFAULT_MOCK_OFFSET_METERS,
  );
  return {
    latitude: offset.latitude,
    longitude: offset.longitude,
    updatedAt: new Date().toISOString(),
  };
}
