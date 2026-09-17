import {
  type Ambiente,
  domainNameDesv,
  resolveAmbiente,
} from "@/config/sistema";

export type { Ambiente };

export type UrlsServices = {
  SSOWS: string;
  SIGUWS: string;
  LEGADOWS: string;
};

const URLS_PROD: UrlsServices = {
  SSOWS: "https://ssows.ssp.go.gov.br/",
  SIGUWS: "https://siguws.ssp.go.gov.br/",
  LEGADOWS: "https://legadows.ssp.go.gov.br/",
};

const URLS_HOMO: UrlsServices = {
  SSOWS: "https://ssows-h.ssp.go.gov.br/",
  SIGUWS: "https://siguws-h.ssp.go.gov.br/",
  LEGADOWS: "https://legadows-h.ssp.go.gov.br/",
};

function resolveUrls(hostname?: string | null): {
  urls: UrlsServices;
  ambiente: Ambiente;
} {
  const ambiente = resolveAmbiente(hostname);
  return {
    ambiente,
    urls: ambiente === "PROD" ? URLS_PROD : URLS_HOMO,
  };
}

export function getClientUrlsServices(): {
  urls: UrlsServices;
  ambiente: Ambiente;
} {
  if (typeof window === "undefined") {
    return resolveUrls(domainNameDesv);
  }
  return resolveUrls(window.location.hostname);
}

export function getServerUrlsServices(hostname?: string | null): {
  urls: UrlsServices;
  ambiente: Ambiente;
} {
  return resolveUrls(hostname);
}
