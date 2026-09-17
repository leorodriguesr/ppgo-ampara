"use client";

import { Database, ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getUrlLogin } from "@/lib/sso/auth-api";

type LoginErrorProps = {
  variant: "sso" | "db";
};

const copy: Record<
  LoginErrorProps["variant"],
  { title: string; description: string; icon: typeof ShieldAlert }
> = {
  db: {
    title: "Banco de dados indisponível",
    description:
      "O login no SSO funcionou, mas o painel não conseguiu gravar a sessão porque o PostgreSQL recusou a conexão. Suba o banco (por exemplo npx prisma dev) e tente de novo.",
    icon: Database,
  },
  sso: {
    title: "Não foi possível concluir o login",
    description:
      "O token SSO chegou, mas a sessão local falhou. Confira se o banco está no ar e tente novamente. Evite recarregar o SSO em loop — a política de segurança da SSP bloqueia a segunda tentativa.",
    icon: ShieldAlert,
  },
};

export function LoginError({ variant }: LoginErrorProps) {
  const { title, description, icon: Icon } = copy[variant];

  function retry() {
    if (variant === "db") {
      window.location.replace("/auth/callback");
      return;
    }

    window.location.href = getUrlLogin();
  }

  return (
    <div className="flex min-h-svh items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <Icon className="size-6" />
          </div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Button onClick={retry}>Tentar login novamente</Button>
        </CardContent>
      </Card>
    </div>
  );
}
