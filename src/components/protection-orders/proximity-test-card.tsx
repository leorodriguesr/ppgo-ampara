"use client";

import { useState } from "react";
import { Loader2, Radar } from "lucide-react";

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

/** Centro de Goiânia — referência padrão da vítima. */
const DEFAULT_VICTIM_LAT = -16.6869;
const DEFAULT_VICTIM_LNG = -49.2648;

type ProximityResult = {
  geofenceState: string;
  alert: {
    publicId: string;
    status: string;
    openedAt: string;
    distanceMeters: number;
  } | null;
  inmateLocation: {
    latitude: number;
    longitude: number;
    timestamp: string;
  } | null;
  distanceMeters: number | null;
  nextCheckSuggestedSeconds: number;
  serverTime: string;
  degraded: boolean;
};

type ProximityTestCardProps = {
  orderId: string;
  orderStatus: string;
};

export function ProximityTestCard({
  orderId,
  orderStatus,
}: ProximityTestCardProps) {
  const [victimLat, setVictimLat] = useState(String(DEFAULT_VICTIM_LAT));
  const [victimLng, setVictimLng] = useState(String(DEFAULT_VICTIM_LNG));
  const [acting, setActing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ProximityResult | null>(null);

  if (orderStatus !== "ACTIVE") {
    return null;
  }

  async function runTest() {
    setActing(true);
    setError(null);

    const latitude = Number(victimLat);
    const longitude = Number(victimLng);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      setError("Informe latitude e longitude válidas da vítima");
      setActing(false);
      return;
    }

    try {
      const res = await fetch(
        `/api/v1/protection-orders/${orderId}/proximity-test`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ latitude, longitude }),
        },
      );
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(
          typeof data.message === "string"
            ? data.message
            : "Não foi possível executar o teste de proximidade",
        );
        setResult(null);
        return;
      }

      setResult(data as ProximityResult);
    } catch {
      setError("Falha de comunicação com o servidor");
      setResult(null);
    } finally {
      setActing(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Radar className="size-4" />
          Teste de proximidade
        </CardTitle>
        <CardDescription>
          Executa o motor de geofence com as coordenadas da vítima (pode abrir
          ou resolver alertas). Use o simulador para posicionar o preso perto ou
          longe antes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="prox-victim-lat">Latitude da vítima</Label>
            <Input
              id="prox-victim-lat"
              value={victimLat}
              onChange={(e) => setVictimLat(e.target.value)}
              inputMode="decimal"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="prox-victim-lng">Longitude da vítima</Label>
            <Input
              id="prox-victim-lng"
              value={victimLng}
              onChange={(e) => setVictimLng(e.target.value)}
              inputMode="decimal"
            />
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Dica: no simulador, use Longe (fora do raio) ou No raio / Perto
          (dentro). Duas verificações seguidas no raio ou mais perto abrem o
          alerta.
        </p>

        <Button type="button" disabled={acting} onClick={() => void runTest()}>
          {acting ? (
            <Loader2 className="animate-spin" data-icon="inline-start" />
          ) : (
            <Radar data-icon="inline-start" />
          )}
          Executar verificação
        </Button>

        {error ? (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        {result ? (
          <div className="space-y-2 rounded-lg border px-3 py-3 text-sm">
            <p>
              <span className="text-muted-foreground">Estado: </span>
              <span className="font-medium">{result.geofenceState}</span>
              {result.degraded ? (
                <span className="ml-2 text-amber-700">(degradado)</span>
              ) : null}
            </p>
            <p>
              <span className="text-muted-foreground">Distância: </span>
              <span className="font-medium">
                {result.distanceMeters != null
                  ? `${Math.round(result.distanceMeters)} m`
                  : "—"}
              </span>
            </p>
            <p>
              <span className="text-muted-foreground">Próximo check: </span>
              {result.nextCheckSuggestedSeconds}s
            </p>
            {result.alert ? (
              <p>
                <span className="text-muted-foreground">Alerta: </span>
                <span className="font-medium">
                  {result.alert.status} · {result.alert.publicId.slice(0, 8)}…
                  {" · "}
                  {Math.round(result.alert.distanceMeters)} m
                </span>
              </p>
            ) : (
              <p className="text-muted-foreground">Nenhum alerta aberto</p>
            )}
            {result.inmateLocation ? (
              <p className="font-mono text-xs text-muted-foreground">
                Preso: {result.inmateLocation.latitude.toFixed(6)},{" "}
                {result.inmateLocation.longitude.toFixed(6)}
              </p>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
