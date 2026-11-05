"use client";

import { PoliciaPenalMark } from "@/components/brand/policia-penal-mark";
import { Button } from "@/components/ui/button";
import { apiLogoutUsuarioLogado } from "@/lib/sso/auth-api";
import { SSO_TOKEN_STORAGE_KEY } from "@/lib/sso/constants";
import { useAuth } from "@/providers/auth-provider";

export function NoPermission() {
  const { setAuthData } = useAuth();

  async function handleLogout() {
    try {
      await apiLogoutUsuarioLogado();
    } catch {
      // ignore
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
    window.location.href = "/login";
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-[#F3F4F6] px-4">
      <div className="w-full max-w-md border border-[#D8DEE6] bg-white px-5 py-6 text-center">
        <PoliciaPenalMark size={56} className="mx-auto" />
        <h1 className="mt-4 text-lg font-semibold text-[#1B2A41]">
          Sem permissão
        </h1>
        <p className="mt-2 text-sm leading-6 text-[#4B5563]">
          Seu usuário não tem perfil no AMPARA. Peça a liberação à
          administração ou saia e entre com outra conta.
        </p>
        <Button className="mt-5" onClick={handleLogout}>
          Sair
        </Button>
      </div>
    </div>
  );
}
