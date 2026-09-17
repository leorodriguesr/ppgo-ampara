import { NextRequest, NextResponse } from "next/server";

const DEVICE_API_PREFIX = "/api/v1";

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
export function middleware(request: NextRequest) {
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
