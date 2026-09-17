"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { SSO_TOKEN_STORAGE_KEY } from "@/lib/sso/constants";
import { useAuth } from "@/providers/auth-provider";
import type { AuthUser } from "@/lib/sso/types";

export function ValidateToken() {
  const router = useRouter();
  const { setAuthData, setUser } = useAuth();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    async function validate() {
      const token = window.localStorage.getItem(SSO_TOKEN_STORAGE_KEY);

      if (!token) {
        setAuthData((prev) => ({
          ...prev,
          verificandoToken: false,
          redirectLogin: true,
          isAuthenticated: false,
        }));
        return;
      }

      try {
        const response = await fetch("/api/auth/sso/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        const data = (await response.json()) as {
          user?: AuthUser;
          code?: string;
          message?: string;
        };

        if (!response.ok || !data.user) {
          if (data.code === "NO_PROFILE") {
            setAuthData((prev) => ({
              ...prev,
              verificandoToken: false,
              isAuthenticated: false,
              user: {
                id: "no-profile",
                name: "Sem permissão",
                email: "",
                cpf: null,
                role: "POLICE",
                isActive: false,
                perfisSistemaAtual: [],
                semPerfilThisSistema: true,
              },
              error: data.message ?? "Sem perfil neste sistema",
            }));
            return;
          }

          throw new Error(data.message ?? "Falha ao validar token SSO");
        }

        setUser(data.user);
        router.refresh();
      } catch {
        window.localStorage.removeItem(SSO_TOKEN_STORAGE_KEY);
        setAuthData({
          user: null,
          isAuthenticated: false,
          verificandoToken: false,
          deslogar: false,
          redirectLogin: true,
          error: "Sessão SSO inválida. Faça login novamente.",
        });
      }
    }

    void validate();
  }, [router, setAuthData, setUser]);

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-3">
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
      <p className="text-sm text-muted-foreground">Validando sessão SSO...</p>
    </div>
  );
}
