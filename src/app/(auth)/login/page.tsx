"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

import { LoginError } from "@/components/auth/login-error";
import { NoPermission } from "@/components/auth/no-permission";
import { RedirectSSO } from "@/components/auth/redirect-sso";
import { SSO_TOKEN_STORAGE_KEY } from "@/lib/sso/constants";

function LoginContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  useEffect(() => {
    const token = window.localStorage.getItem(SSO_TOKEN_STORAGE_KEY);
    if (
      token &&
      error !== "no_profile" &&
      error !== "sso" &&
      error !== "db"
    ) {
      window.location.replace("/auth/callback");
    }
  }, [error]);

  if (error === "no_profile") {
    return <NoPermission />;
  }

  if (error === "db") {
    return <LoginError variant="db" />;
  }

  if (error === "sso") {
    return <LoginError variant="sso" />;
  }

  return <RedirectSSO />;
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-svh items-center justify-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
