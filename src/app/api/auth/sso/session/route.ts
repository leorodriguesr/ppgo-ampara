import { NextRequest, NextResponse } from "next/server";

import {
  createSessionToken,
  setSessionCookie,
} from "@/lib/sso/session-cookie";
import { validateSsoTokenAndSyncUser } from "@/lib/sso/validate-server";

function publicFailureDetail(error: unknown): string | undefined {
  if (!(error instanceof Error)) return undefined;
  const message = error.message;

  if (message === "DATABASE_URL is not set") return message;
  if (/^SSO validate falhou \(\d+\)$/.test(message)) return message;
  if (message.startsWith("Invalid environment variables:")) return message;

  return undefined;
}

function isDatabaseUnavailable(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;

  const candidate = error as { code?: string; message?: string };
  if (
    candidate.code === "ECONNREFUSED" ||
    candidate.code === "P1001" ||
    candidate.code === "P1017"
  ) {
    return true;
  }

  return (
    typeof candidate.message === "string" &&
    /ECONNREFUSED|Can't reach database|Connection refused|DATABASE_URL is not set/i.test(
      candidate.message,
    )
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { token?: string };
    const token = body.token?.trim();

    if (!token) {
      return NextResponse.json(
        { code: "TOKEN_REQUIRED", message: "Token SSO obrigatório" },
        { status: 400 },
      );
    }

    const hostname = request.headers.get("host");
    const user = await validateSsoTokenAndSyncUser({ token, hostname });

    const sessionToken = createSessionToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      cpf: user.cpf,
      isActive: user.isActive,
    });

    await setSessionCookie(sessionToken);

    return NextResponse.json({ user });
  } catch (error) {
    if (error instanceof Error && error.name === "NoProfileError") {
      return NextResponse.json(
        {
          code: "NO_PROFILE",
          message:
            "Você não tem perfil de acesso para o sistema AMPARA.",
        },
        { status: 403 },
      );
    }

    console.error("[sso/session]", error);

    if (isDatabaseUnavailable(error)) {
      return NextResponse.json(
        {
          code: "DATABASE_UNAVAILABLE",
          message:
            "PostgreSQL indisponível. Não foi possível gravar a sessão após o SSO.",
        },
        { status: 503 },
      );
    }

    return NextResponse.json(
      {
        code: "SSO_VALIDATE_FAILED",
        message: "Não foi possível validar o token SSO.",
        detail: publicFailureDetail(error),
      },
      { status: 401 },
    );
  }
}
