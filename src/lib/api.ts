import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { ZodError } from "zod";

import { AppError } from "@/lib/errors";
import { requireSession, type Session } from "@/lib/auth-session";

export { requireDeviceAuth } from "@/lib/device-auth";

export function jsonOk<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function jsonError(error: unknown) {
  if (error instanceof AppError) {
    return NextResponse.json(
      {
        code: error.code,
        message: error.message,
        details: error.details,
      },
      { status: error.status },
    );
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        code: "VALIDATION_ERROR",
        message: "Dados inválidos",
        details: error.flatten(),
      },
      { status: 400 },
    );
  }

  console.error("[api]", error);
  return NextResponse.json(
    {
      code: "INTERNAL_ERROR",
      message: "Erro interno do servidor",
    },
    { status: 500 },
  );
}

export async function requireApiSession(): Promise<Session> {
  return requireSession();
}

export async function getRequestMeta() {
  const headerList = await headers();
  return {
    ip:
      headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      headerList.get("x-real-ip") ??
      null,
    userAgent: headerList.get("user-agent"),
  };
}
