"use client";

import { useEffect } from "react";
import { Loader2 } from "lucide-react";

import { PoliciaPenalMark } from "@/components/brand/policia-penal-mark";
import { APP_NAME } from "@/config/sistema";
import { getUrlLogin } from "@/lib/sso/auth-api";

export function RedirectSSO() {
  useEffect(() => {
    window.location.href = getUrlLogin();
  }, []);

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 bg-[#F3F4F6] px-4">
      <PoliciaPenalMark size={72} />
      <div className="text-center">
        <p className="text-lg font-semibold text-[#1B2A41]">{APP_NAME}</p>
        <p className="mt-1 text-sm text-[#4B5563]">Redirecionando para o SSO…</p>
      </div>
      <Loader2 className="size-5 animate-spin text-[#1B2A41]" />
    </div>
  );
}
