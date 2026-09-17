"use client";

import { useEffect } from "react";
import { Loader2, ShieldCheck } from "lucide-react";

import { APP_NAME } from "@/config/sistema";
import { getUrlLogin } from "@/lib/sso/auth-api";

export function RedirectSSO() {
  useEffect(() => {
    window.location.href = getUrlLogin();
  }, []);

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 bg-background px-4">
      <div className="flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
        <ShieldCheck className="size-6" />
      </div>
      <div className="text-center">
        <p className="text-lg font-semibold tracking-tight">{APP_NAME}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Redirecionando para o SSO...
        </p>
      </div>
      <Loader2 className="size-5 animate-spin text-muted-foreground" />
    </div>
  );
}
