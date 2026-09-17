import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

/** Offset padrão (~800 m ao norte) quando a posição do preso ainda não foi definida. */
export const DEFAULT_MOCK_OFFSET_METERS = 800;

const METERS_PER_DEG_LAT = 111_320;

export type MockInmateLocation = {
  latitude: number;
  longitude: number;
  updatedAt: string;
};

type GlobalMockStore = {
  __mulherSeguraMockInmateStore?: Map<string, MockInmateLocation>;
};

const STORE_DIR = path.join(process.cwd(), ".data");
const STORE_FILE = path.join(STORE_DIR, "mock-inmate-locations.json");

function getStore(): Map<string, MockInmateLocation> {
  const g = globalThis as GlobalMockStore;
  if (!g.__mulherSeguraMockInmateStore) {
    g.__mulherSeguraMockInmateStore = loadFromDisk();
  }
  return g.__mulherSeguraMockInmateStore;
}

function loadFromDisk(): Map<string, MockInmateLocation> {
  const map = new Map<string, MockInmateLocation>();
  try {
    if (!existsSync(STORE_FILE)) return map;
    const raw = JSON.parse(readFileSync(STORE_FILE, "utf8")) as Record<
      string,
      MockInmateLocation
    >;
    for (const [id, value] of Object.entries(raw)) {
      if (
        value &&
        typeof value.latitude === "number" &&
        typeof value.longitude === "number"
      ) {
        map.set(id, {
          latitude: value.latitude,
          longitude: value.longitude,
          updatedAt: value.updatedAt ?? new Date().toISOString(),
        });
      }
    }
  } catch {
    // Arquivo corrompido ou indisponível — começa vazio.
  }
  return map;
}

function persistToDisk(store: Map<string, MockInmateLocation>) {
  try {
    if (!existsSync(STORE_DIR)) {
      mkdirSync(STORE_DIR, { recursive: true });
    }
    const obj: Record<string, MockInmateLocation> = {};
    for (const [id, value] of store.entries()) {
      obj[id] = value;
    }
    writeFileSync(STORE_FILE, JSON.stringify(obj, null, 2), "utf8");
  } catch {
    // Persistência best-effort; memória continua válida.
  }
}

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

export function setMockInmateLocation(
  externalInmateId: string,
  latitude: number,
  longitude: number,
): MockInmateLocation {
  const entry: MockInmateLocation = {
    latitude,
    longitude,
    updatedAt: new Date().toISOString(),
  };
  const store = getStore();
  store.set(externalInmateId, entry);
  persistToDisk(store);
  return entry;
}

export function getMockInmateLocation(
  externalInmateId: string,
): MockInmateLocation | undefined {
  return getStore().get(externalInmateId);
}

/**
 * Posição do preso no mock.
 * Se não houver valor no store, retorna ~800 m ao norte do ponto de referência da vítima.
 */
export function resolveMockInmateLocation(
  externalInmateId: string,
  referenceLatitude: number,
  referenceLongitude: number,
): MockInmateLocation {
  const existing = getStore().get(externalInmateId);
  if (existing) return existing;

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
