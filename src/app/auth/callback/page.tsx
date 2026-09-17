"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { SSO_TOKEN_STORAGE_KEY } from "@/lib/sso/constants";
import { getQueryParam, removeQueryParam } from "@/lib/sso/url-utils";

/**
 * Callback do SSO: recebe access_token, valida no backend e abre sessão.
 */
export default function AuthCallbackPage() {
  const router = useRouter();
  const [message, setMessage] = useState("Finalizando autenticação SSO...");

  useEffect(() => {
    async function completeLogin() {
      const token = getQueryParam("access_token");

      if (token) {
        window.localStorage.setItem(SSO_TOKEN_STORAGE_KEY, token);
        removeQueryParam("access_token");
      }

      const stored = window.localStorage.getItem(SSO_TOKEN_STORAGE_KEY);

      if (!stored) {
        setMessage("Token SSO não encontrado. Redirecionando...");
        router.replace("/login");
        return;
      }

      try {
        const response = await fetch("/api/auth/sso/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: stored }),
        });

        if (!response.ok) {
          const data = (await response.json()) as { code?: string };
          if (data.code === "NO_PROFILE") {
            router.replace("/login?error=no_profile");
            return;
          }
          if (data.code === "DATABASE_UNAVAILABLE") {
            router.replace("/login?error=db");
            return;
          }
          throw new Error("validate failed");
        }

        router.replace("/");
        router.refresh();
      } catch {
        window.localStorage.removeItem(SSO_TOKEN_STORAGE_KEY);
        setMessage("Falha na validação. Redirecionando ao login...");
        router.replace("/login?error=sso");
      }
    }

    void completeLogin();
  }, [router]);

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-3">
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
