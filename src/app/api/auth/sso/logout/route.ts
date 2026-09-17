import { NextResponse } from "next/server";

import { clearSessionCookie } from "@/lib/sso/session-cookie";

export async function POST() {
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}
