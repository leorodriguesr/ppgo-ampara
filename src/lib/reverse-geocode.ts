type NominatimAddress = {
  road?: string;
  pedestrian?: string;
  footway?: string;
  residential?: string;
  suburb?: string;
  neighbourhood?: string;
  city_district?: string;
};

type NominatimResponse = {
  name?: string;
  address?: NominatimAddress;
};

const GEOCODE_TIMEOUT_MS = 4_000;

function labelFromAddress(address: NominatimAddress, fallback?: string) {
  const road =
    address.road ||
    address.pedestrian ||
    address.footway ||
    address.residential;
  const area =
    address.suburb || address.neighbourhood || address.city_district;

  if (road && area) return `${road}, ${area}`;
  if (road) return road;
  if (area) return area;
  return fallback?.trim() || null;
}

/** Rua aproximada a partir da coordenada. Falha silenciosa: o ponto já foi salvo. */
export async function reverseGeocode(
  latitude: number,
  longitude: number,
): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GEOCODE_TIMEOUT_MS);

  try {
    const url = new URL("https://nominatim.openstreetmap.org/reverse");
    url.searchParams.set("lat", String(latitude));
    url.searchParams.set("lon", String(longitude));
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("zoom", "18");
    url.searchParams.set("addressdetails", "1");

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": "AMPARA-SSP/1.0 (relatorio de percurso)",
      },
      cache: "no-store",
    });

    if (!response.ok) return null;
    const data = (await response.json()) as NominatimResponse;
    return labelFromAddress(data.address ?? {}, data.name);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
