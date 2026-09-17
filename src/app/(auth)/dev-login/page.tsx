"use client";

import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
    <div className="flex min-h-svh items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <ShieldCheck className="size-6" />
          </div>
          <CardTitle>Login de desenvolvimento</CardTitle>
          <CardDescription>
            Simula o retorno do SSO para testar o painel sem o IdP real.
            Disponível só em desenvolvimento.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <Button onClick={() => enterAs("dev-mock-admin")}>
            Entrar como ADMIN
          </Button>
          <Button variant="outline" onClick={() => enterAs("dev-mock-police")}>
            Entrar como POLICE
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
