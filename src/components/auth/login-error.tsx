"use client";

import { PoliciaPenalMark } from "@/components/brand/policia-penal-mark";
import { Button } from "@/components/ui/button";
import { getUrlLogin } from "@/lib/sso/auth-api";

type LoginErrorProps = {
  variant: "sso" | "db";
};

const copy: Record<
  LoginErrorProps["variant"],
  { title: string; description: string }
> = {
  db: {
    title: "Banco de dados indisponível",
    description:
      "O SSO autenticou, mas a sessão não foi gravada. Confira o PostgreSQL e tente de novo.",
  },
  sso: {
    title: "Não foi possível concluir o login",
    description:
      "A sessão local falhou depois do SSO. Tente novamente sem recarregar a página do login.",
  },
};

export function LoginError({ variant }: LoginErrorProps) {
  const { title, description } = copy[variant];

  function retry() {
    if (variant === "db") {
      window.location.replace("/auth/callback");
      return;
    }

    window.location.href = getUrlLogin();
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-[#F3F4F6] px-4">
      <div className="w-full max-w-md border border-[#D8DEE6] bg-white px-5 py-6 text-center">
        <PoliciaPenalMark size={56} className="mx-auto" />
        <h1 className="mt-4 text-lg font-semibold text-[#1B2A41]">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-[#4B5563]">{description}</p>
        <Button className="mt-5" onClick={retry}>
          Tentar de novo
        </Button>
      </div>
    </div>
  );
}
