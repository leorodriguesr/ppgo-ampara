import { isSsoDevMockEnabled, sistemaNameSSO } from "@/config/sistema";
import { getServerUrlsServices } from "@/config/urls";
import { prisma } from "@/lib/prisma";
import { prepareSsoUserData } from "@/lib/sso/prepare-user";
import type { AuthUser, SsoUserPayload } from "@/lib/sso/types";

async function fetchSsoValidate(
  token: string,
  hostname?: string | null,
): Promise<SsoUserPayload> {
  const { urls } = getServerUrlsServices(hostname);
  const validateUrl = `${urls.SSOWS}validate?token=${encodeURIComponent(token)}`;

  const response = await fetch(validateUrl, {
    method: "GET",
    cache: "no-store",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`SSO validate falhou (${response.status})`);
  }

  const data = (await response.json()) as SsoUserPayload;
  return data;
}

function buildDevMockPayload(token: string): SsoUserPayload | null {
  if (!isSsoDevMockEnabled()) return null;

  if (token === "dev-mock-admin") {
    return {
      servidor: {
        cpf: "00000000000",
        nome: "Admin Dev",
        email: "admin@mulhersegura.local",
      },
      perfis: [
        {
          descricao: "ADMIN",
          sistema: { descricao: sistemaNameSSO },
        },
      ],
    };
  }

  if (token === "dev-mock-police") {
    return {
      servidor: {
        cpf: "11111111111",
        nome: "Polícia Dev",
        email: "police@mulhersegura.local",
      },
      perfis: [
        {
          descricao: "POLICE",
          sistema: { descricao: sistemaNameSSO },
        },
      ],
    };
  }

  return null;
}

export async function validateSsoTokenAndSyncUser(params: {
  token: string;
  hostname?: string | null;
}): Promise<AuthUser> {
  const mockPayload = buildDevMockPayload(params.token);
  const payload =
    mockPayload ?? (await fetchSsoValidate(params.token, params.hostname));

  const prepared = prepareSsoUserData(payload);

  if (prepared.semPerfilThisSistema) {
    const error = new Error("NO_PROFILE");
    error.name = "NoProfileError";
    throw error;
  }

  const user = await prisma.user.upsert({
    where: { email: prepared.email },
    create: {
      email: prepared.email,
      name: prepared.name,
      emailVerified: true,
      role: prepared.role,
      isActive: true,
      image: prepared.image ?? null,
    },
    update: {
      name: prepared.name,
      role: prepared.role,
      isActive: true,
      image: prepared.image ?? null,
    },
  });

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    cpf: prepared.cpf,
    role: user.role,
    isActive: user.isActive,
    perfisSistemaAtual: prepared.perfisSistemaAtual,
    semPerfilThisSistema: false,
    image: user.image,
  };
}
