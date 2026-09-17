import { resolveAmbiente } from "@/config/sistema";

const PATH =
  "/ppgo-url-apis/ppguardiao/usuarios-posicoes/pessoas-mapa-informacoes/";

/** Temporário: credenciais no código até irem para o secret do K8s. */
const GUARDIAO_API_TOKEN =
  "hr5mffm3v23gb4g2lkwiy3bkzco8jv7kv660cr1b9f3axp1l44nocaqkj6a5a5ss";
const GUARDIAO_DEVICE_KEY = "e118ec7b-dc3d-43f1-8ff3-28ec0c3fd5e6";

const GUARDIAO = {
  HOMO: {
    mapApiUrl: `https://ppguardiaows-h.servpp.net${PATH}`,
    origin: "https://ppguardiao-homo.servpp.net",
    token: GUARDIAO_API_TOKEN,
    deviceKey: GUARDIAO_DEVICE_KEY,
  },
  PROD: {
    mapApiUrl: `https://ppguardiaows.servpp.net${PATH}`,
    origin: "https://ppguardiao.servpp.net",
    token: GUARDIAO_API_TOKEN,
    deviceKey: GUARDIAO_DEVICE_KEY,
  },
} as const;

export function getGuardiaoEndpoints(hostname?: string | null) {
  const ambiente = resolveAmbiente(hostname);
  return ambiente === "PROD" ? GUARDIAO.PROD : GUARDIAO.HOMO;
}
