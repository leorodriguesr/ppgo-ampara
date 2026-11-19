import { NextRequest, NextResponse } from "next/server";

const DEVICE_API_PREFIX = "/api/v1";
const HOMO_ORIGIN = "https://ampara-h.ssp.go.gov.br";

async function proxyApiToHomolog(request: NextRequest) {
  const url = new URL(request.nextUrl.pathname + request.nextUrl.search, HOMO_ORIGIN);
  const headers = new Headers();
  for (const name of ["accept", "authorization", "content-type", "cookie"]) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  const upstream = await fetch(url, {
    method: request.method,
    headers,
    body:
      request.method === "GET" || request.method === "HEAD"
        ? undefined
        : await request.arrayBuffer(),
    redirect: "manual",
  });

  const responseHeaders = new Headers(upstream.headers);
  responseHeaders.delete("content-encoding");
  responseHeaders.delete("content-length");

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}

function applyDeviceApiCors(response: NextResponse, request: NextRequest) {
  const origin = request.headers.get("origin") ?? "*";
  response.headers.set("Access-Control-Allow-Origin", origin);
  response.headers.set("Vary", "Origin");
  response.headers.set(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  );
  response.headers.set(
    "Access-Control-Allow-Headers",
    "Authorization, Content-Type, Accept",
  );
  response.headers.set("Access-Control-Max-Age", "86400");
  return response;
}

/**
 * Middleware leve: propaga pathname e libera CORS das APIs do app (Bearer).
 * A autenticação SSO é feita no client (RequireAuth), como no ppgo-agendaac4.
 */
export async function middleware(request: NextRequest) {
  if (
    process.env.NODE_ENV !== "production" &&
    request.nextUrl.pathname.startsWith("/api/")
  ) {
    return proxyApiToHomolog(request);
  }

  const isDeviceApi = request.nextUrl.pathname.startsWith(DEVICE_API_PREFIX);

  if (isDeviceApi && request.method === "OPTIONS") {
    return applyDeviceApiCors(new NextResponse(null, { status: 204 }), request);
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", request.nextUrl.pathname);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  if (isDeviceApi) {
    return applyDeviceApiCors(response, request);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
