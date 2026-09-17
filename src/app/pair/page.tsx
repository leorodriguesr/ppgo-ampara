"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, Smartphone } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type RedeemSuccess = {
  deviceToken: string;
  protectionOrderPublicId: string;
  radiusMeters: number;
  devicePublicId: string;
};

function PairForm() {
  const searchParams = useSearchParams();
  const initialToken = searchParams.get("token") ?? "";

  const [token, setToken] = useState(initialToken);
  const [platform, setPlatform] = useState<"ios" | "android" | "web">("web");
  const [pushToken, setPushToken] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RedeemSuccess | null>(null);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/v1/pairing/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: token.trim(),
          platform,
          ...(pushToken.trim() ? { pushToken: pushToken.trim() } : {}),
          appVersion: "web-test/1.0",
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(
          typeof data.message === "string"
            ? data.message
            : `Falha no pareamento (${data.code ?? res.status})`,
        );
        return;
      }

      setResult(data as RedeemSuccess);
    } catch {
      setError("Falha de comunicação com o servidor");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <Smartphone className="size-6" />
        </div>
        <CardTitle>Pareamento (teste web)</CardTitle>
        <CardDescription>
          Simula o redeem do app da vítima. Use o token gerado no painel.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {result ? (
          <div className="space-y-3 text-sm">
            <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-emerald-800 dark:text-emerald-200">
              Pareamento concluído. A medida deve estar ACTIVE.
            </p>
            <div>
              <p className="text-xs text-muted-foreground">
                Device token (exibido uma vez)
              </p>
              <code className="mt-1 block break-all rounded-md border bg-muted/40 px-2 py-2 text-xs">
                {result.deviceToken}
              </code>
            </div>
            <p>
              <span className="text-muted-foreground">Medida:</span>{" "}
              {result.protectionOrderPublicId}
            </p>
            <p>
              <span className="text-muted-foreground">Dispositivo:</span>{" "}
              {result.devicePublicId}
            </p>
            <p>
              <span className="text-muted-foreground">Raio:</span>{" "}
              {result.radiusMeters} m
            </p>
          </div>
        ) : (
          <form className="space-y-3" onSubmit={(e) => void onSubmit(e)}>
            <div className="space-y-1.5">
              <Label htmlFor="token">Token</Label>
              <Input
                id="token"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Cole o token de pareamento"
                required
                autoComplete="off"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="platform">Plataforma</Label>
              <select
                id="platform"
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                value={platform}
                onChange={(e) =>
                  setPlatform(e.target.value as "ios" | "android" | "web")
                }
              >
                <option value="web">web</option>
                <option value="ios">ios</option>
                <option value="android">android</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pushToken">Push token (opcional)</Label>
              <Input
                id="pushToken"
                value={pushToken}
                onChange={(e) => setPushToken(e.target.value)}
                placeholder="Expo / FCM token"
                autoComplete="off"
              />
            </div>

            {error ? (
              <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            ) : null}

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? (
                <Loader2 className="animate-spin" data-icon="inline-start" />
              ) : null}
              Parear dispositivo
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

export default function PairPage() {
  return (
    <div className="flex min-h-svh items-center justify-center px-4 py-8">
      <Suspense
        fallback={
          <p className="text-sm text-muted-foreground">Carregando...</p>
        }
      >
        <PairForm />
      </Suspense>
    </div>
  );
}
