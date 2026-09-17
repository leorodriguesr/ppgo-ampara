"use client";

import { useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";

import { apiLogoutUsuarioLogado } from "@/lib/sso/auth-api";
import { SSO_TOKEN_STORAGE_KEY } from "@/lib/sso/constants";
import { useAuth } from "@/providers/auth-provider";

export function Logoff() {
  const { setAuthData } = useAuth();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    async function logout() {
      try {
        await apiLogoutUsuarioLogado();
      } catch {
        // ignore — limpeza local continua
      }

      try {
        await fetch("/api/auth/sso/logout", { method: "POST" });
      } catch {
        // ignore
      }

      window.localStorage.removeItem(SSO_TOKEN_STORAGE_KEY);

      setAuthData({
        user: null,
        isAuthenticated: false,
        verificandoToken: false,
        deslogar: false,
        redirectLogin: true,
        error: null,
      });
    }

    void logout();
  }, [setAuthData]);

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-3">
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
      <p className="text-sm text-muted-foreground">Encerrando sessão...</p>
    </div>
  );
}
