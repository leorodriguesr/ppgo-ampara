"use client";

import { useRouter } from "next/navigation";

import { PoliciaPenalMark } from "@/components/brand/policia-penal-mark";
import { Button } from "@/components/ui/button";
import { SSO_TOKEN_STORAGE_KEY } from "@/lib/sso/constants";

/**
 * Atalho local (desligado automaticamente em NODE_ENV=production).
 * Não usar em homologação/produção.
 */
export default function DevLoginPage() {
  const router = useRouter();

  async function enterAs(token: "dev-mock-admin" | "dev-mock-police") {
    window.localStorage.setItem(SSO_TOKEN_STORAGE_KEY, token);
    router.replace("/auth/callback");
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-[#F3F4F6] px-4">
      <div className="w-full max-w-sm border border-[#D8DEE6] bg-white px-5 py-6">
        <PoliciaPenalMark size={56} />
        <h1 className="mt-4 text-lg font-semibold text-[#1B2A41]">
          Acesso local
        </h1>
        <p className="mt-1 text-sm text-[#4B5563]">
          Entra no painel sem o SSO. Só existe em desenvolvimento.
        </p>
        <div className="mt-5 flex flex-col gap-2">
          <Button onClick={() => enterAs("dev-mock-admin")}>
            Entrar como administrador
          </Button>
          <Button variant="outline" onClick={() => enterAs("dev-mock-police")}>
            Entrar como policial
          </Button>
        </div>
      </div>
    </div>
  );
}
