"use client";

import { ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
    <div className="flex min-h-svh items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <ShieldAlert className="size-6" />
          </div>
          <CardTitle>Sem permissão</CardTitle>
          <CardDescription>
            Você não tem perfil de acesso para o sistema AMPARA. Verifique
            seus perfis no SSO ou solicite liberação à administração.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Button onClick={handleLogout}>Fazer logoff</Button>
        </CardContent>
      </Card>
    </div>
  );
}
