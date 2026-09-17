"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { Logoff } from "@/components/auth/logoff";
import { NoPermission } from "@/components/auth/no-permission";
import { RedirectSSO } from "@/components/auth/redirect-sso";
import { ValidateToken } from "@/components/auth/validate-token";
import { SSO_TOKEN_STORAGE_KEY } from "@/lib/sso/constants";
import { getQueryParam, removeQueryParam } from "@/lib/sso/url-utils";
import { useAuth } from "@/providers/auth-provider";
import type { AuthUser } from "@/lib/sso/types";

type RequireAuthProps = {
  children: React.ReactNode;
};

/**
 * Gate de autenticação SSO (padrão ppgo-agendaac4 RequireAuth).
 */
export function RequireAuth({ children }: RequireAuthProps) {
  const { authData, setAuthData, setUser } = useAuth();
  const [bootstrapped, setBootstrapped] = useState(false);
  const [needsValidation, setNeedsValidation] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const tokenParam = getQueryParam("access_token");
      if (tokenParam) {
        window.localStorage.setItem(SSO_TOKEN_STORAGE_KEY, tokenParam);
        removeQueryParam("access_token");
      }

      // 1) Sessão já existente via cookie httpOnly
      try {
        const meResponse = await fetch("/api/auth/sso/me");
        if (meResponse.ok) {
          const data = (await meResponse.json()) as { user: AuthUser };
          if (!cancelled && data.user) {
            setUser(data.user);
            setNeedsValidation(false);
            setBootstrapped(true);
            return;
          }
        }
      } catch {
        // segue para token local
      }

      if (cancelled) return;

      const tokenSSO = window.localStorage.getItem(SSO_TOKEN_STORAGE_KEY);

      if (!tokenSSO) {
        setAuthData((prev) => ({
          ...prev,
          redirectLogin: true,
          isAuthenticated: false,
          verificandoToken: false,
        }));
        setNeedsValidation(false);
        setBootstrapped(true);
        return;
      }

      setNeedsValidation(true);
      setAuthData((prev) => ({
        ...prev,
        redirectLogin: false,
        verificandoToken: true,
      }));
      setBootstrapped(true);
    }

    void bootstrap();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- bootstrap once
  }, []);

  if (!bootstrapped) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (authData.user?.semPerfilThisSistema) {
    return <NoPermission />;
  }

  if (authData.deslogar) {
    return <Logoff />;
  }

  if (authData.redirectLogin) {
    return <RedirectSSO />;
  }

  if (authData.isAuthenticated) {
    return <>{children}</>;
  }

  if (authData.verificandoToken || needsValidation) {
    return <ValidateToken />;
  }

  return <RedirectSSO />;
}
