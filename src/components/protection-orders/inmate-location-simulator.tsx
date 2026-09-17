"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, MapPin, Radar } from "lucide-react";

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

/** Centro de Goiânia — referência padrão da vítima no simulador. */
const DEFAULT_VICTIM_LAT = -16.6869;
const DEFAULT_VICTIM_LNG = -49.2648;

const METERS_PER_DEG_LAT = 111_320;

type LocalizarResult = {
  distanciaMetros: number;
  latitudePreso: number;
  longitudePreso: number;
  timestamp: string;
};

type InmateLocationSimulatorProps = {
  orderId: string;
  radiusMeters: number;
};

const HYSTERESIS_METERS = 20;

type TrajectoryStep =
  | "FAR"
  | "APPROACHING"
  | "EDGE"
  | "AT_RADIUS"
  | "M270"
  | "PENDING_VIOLATION"
  | "M180"
  | "M120"
  | "M90"
  | "NEAR"
  | "M30"
  | "ARRIVED"
  | "PENDING_SAFE";

const FIXED_METERS: Partial<Record<TrajectoryStep, number>> = {
  M270: 270,
  M180: 180,
  M120: 120,
  M90: 90,
  M30: 30,
};

type SimulatorDistances = ReturnType<typeof simulatorDistances>;

function simulatorDistances(radiusMeters: number) {
  const enter = radiusMeters;
  const exit = radiusMeters + HYSTERESIS_METERS;
  return {
    far: Math.max(exit + 250, Math.round(radiusMeters * 2.2)),
    approaching: Math.round(exit + Math.max(90, radiusMeters * 0.45)),
    edge: radiusMeters + 40,
    atRadius: radiusMeters,
    entered: Math.max(25, Math.round(enter * 0.85)),
    near: Math.max(35, Math.round(enter * 0.28)),
    arrived: 8,
    enter,
    exit,
  };
}

function stepDistance(id: TrajectoryStep, distances: SimulatorDistances) {
  const fixed = FIXED_METERS[id];
  if (fixed != null) return fixed;

  switch (id) {
    case "FAR":
    case "PENDING_SAFE":
      return distances.far;
    case "APPROACHING":
      return distances.approaching;
    case "EDGE":
      return distances.edge;
    case "AT_RADIUS":
      return distances.atRadius;
    case "PENDING_VIOLATION":
      return distances.entered;
    case "NEAR":
      return distances.near;
    case "ARRIVED":
      return distances.arrived;
  }
}

const TRAJECTORY_STEPS: {
  id: TrajectoryStep;
  step: number | null;
  title: string;
  hint: string;
}[] = [
  {
    id: "FAR",
    step: 1,
    title: "Longe",
    hint: "Bem fora do raio — estado seguro",
  },
  {
    id: "APPROACHING",
    step: 2,
    title: "Aproximando",
    hint: "Caminhando em direção à vítima, ainda fora da borda",
  },
  {
    id: "EDGE",
    step: 3,
    title: "Fora do raio",
    hint: "Ainda fora do raio da medida",
  },
  {
    id: "AT_RADIUS",
    step: 4,
    title: "No raio",
    hint: "Sobre o raio da medida — abre o alerta",
  },
  {
    id: "M270",
    step: 5,
    title: "270 m",
    hint: "270 m da vítima",
  },
  {
    id: "PENDING_VIOLATION",
    step: 6,
    title: "Entrou",
    hint: "1ª leitura dentro do limite de entrada — confirmando proximidade",
  },
  {
    id: "M180",
    step: 7,
    title: "180 m",
    hint: "180 m da vítima",
  },
  {
    id: "M120",
    step: 8,
    title: "120 m",
    hint: "120 m da vítima",
  },
  {
    id: "M90",
    step: 9,
    title: "90 m",
    hint: "90 m da vítima",
  },
  {
    id: "NEAR",
    step: 10,
    title: "Perto da vítima",
    hint: "2 leituras dentro — violação, ainda a dezenas de metros",
  },
  {
    id: "M30",
    step: 11,
    title: "30 m",
    hint: "30 m da vítima",
  },
  {
    id: "ARRIVED",
    step: 12,
    title: "Chegou",
    hint: "Preso junto da vítima (~8 m)",
  },
  {
    id: "PENDING_SAFE",
    step: null,
    title: "Afastando",
    hint: "Em violação + 1 leitura longe — saindo da zona",
  },
];

function offsetFromVictim(
  victimLat: number,
  victimLng: number,
  northMeters: number,
) {
  const dLat = northMeters / METERS_PER_DEG_LAT;
  return {
    latitude: victimLat + dLat,
    longitude: victimLng,
  };
}

export function InmateLocationSimulator({
  orderId,
  radiusMeters,
}: InmateLocationSimulatorProps) {
  const [victimLat, setVictimLat] = useState(String(DEFAULT_VICTIM_LAT));
  const [victimLng, setVictimLng] = useState(String(DEFAULT_VICTIM_LNG));
  const [inmateLat, setInmateLat] = useState("");
  const [inmateLng, setInmateLng] = useState("");
  const [acting, setActing] = useState<"simulate" | "localizar" | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<TrajectoryStep | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [localizarResult, setLocalizarResult] =
    useState<LocalizarResult | null>(null);

  const parseVictim = useCallback(() => {
    const latitude = Number(victimLat);
    const longitude = Number(victimLng);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      throw new Error("Coordenadas de referência da vítima inválidas");
    }
    return { latitude, longitude };
  }, [victimLat, victimLng]);

  function applyPreset(
    northMeters: number,
    victim: { latitude: number; longitude: number },
  ) {
    const offset = offsetFromVictim(
      victim.latitude,
      victim.longitude,
      northMeters,
    );
    setInmateLat(offset.latitude.toFixed(6));
    setInmateLng(offset.longitude.toFixed(6));
    return offset;
  }

  async function runProximityTick(victim: {
    latitude: number;
    longitude: number;
  }) {
    const res = await fetch(
      `/api/v1/protection-orders/${orderId}/proximity-test`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(victim),
      },
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(
        typeof data.message === "string"
          ? data.message
          : "Falha ao avaliar geofence",
      );
    }
    return data as {
      geofenceState: string;
      distanceMeters: number | null;
      alert: { publicId: string } | null;
    };
  }

  async function placeInmateAt(
    northMeters: number,
    ticks: number,
    victim = parseVictim(),
  ) {
    const offset = applyPreset(northMeters, victim);

    const simRes = await fetch(
      `/api/v1/protection-orders/${orderId}/simulate-location`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(offset),
      },
    );
    const simData = await simRes.json().catch(() => ({}));
    if (!simRes.ok) {
      throw new Error(
        typeof simData.message === "string"
          ? simData.message
          : "Não foi possível gravar a posição do preso",
      );
    }

    const locRes = await fetch(
      `/api/v1/protection-orders/${orderId}/localizar`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(victim),
      },
    );
    const locData = await locRes.json().catch(() => ({}));
    if (locRes.ok) {
      setLocalizarResult(locData as LocalizarResult);
    }

    let geofence: Awaited<ReturnType<typeof runProximityTick>> | null = null;
    for (let i = 0; i < ticks; i += 1) {
      geofence = await runProximityTick(victim);
    }

    const dist =
      geofence?.distanceMeters ??
      (locRes.ok ? (locData as LocalizarResult).distanciaMetros : null);

    return { geofence, dist, northMeters };
  }

  /** Preset + grava no mock + avalia geofence até o ponto do trajeto. */
  async function playScenario(scenario: TrajectoryStep) {
    setActing("simulate");
    setSelectedPreset(scenario);
    setError(null);
    setMessage(null);
    setLocalizarResult(null);

    const d = simulatorDistances(radiusMeters);

    try {
      const victim = (await fetchLastVictimFromApp()) ?? parseVictim();
      let result: Awaited<ReturnType<typeof placeInmateAt>>;

      switch (scenario) {
        case "FAR":
          result = await placeInmateAt(d.far, 2, victim);
          break;
        case "APPROACHING":
          result = await placeInmateAt(d.approaching, 2, victim);
          break;
        case "EDGE":
          result = await placeInmateAt(d.edge, 2, victim);
          break;
        case "AT_RADIUS":
          result = await placeInmateAt(d.atRadius, 2, victim);
          break;
        case "M270":
        case "M180":
        case "M120":
        case "M90":
        case "M30":
          result = await placeInmateAt(FIXED_METERS[scenario]!, 1, victim);
          break;
        case "PENDING_VIOLATION":
          result = await placeInmateAt(d.entered, 1, victim);
          break;
        case "NEAR":
          result = await placeInmateAt(d.near, 2, victim);
          break;
        case "ARRIVED":
          result = await placeInmateAt(d.arrived, 2, victim);
          break;
        case "PENDING_SAFE":
          await placeInmateAt(d.near, 2, victim);
          result = await placeInmateAt(d.far, 1, victim);
          break;
      }

      const label =
        TRAJECTORY_STEPS.find((item) => item.id === scenario)?.title ??
        scenario;
      const state = result.geofence?.geofenceState ?? "—";
      setMessage(
        `${label} — preso a ~${result.northMeters} m (distância ${result.dist} m). Estado no servidor: ${state}. Veja o app.`,
      );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Falha ao colocar o preso na posição",
      );
    } finally {
      setActing(null);
    }
  }

  async function fetchLastVictimFromApp(): Promise<{
    latitude: number;
    longitude: number;
  } | null> {
    const res = await fetch(
      `/api/v1/protection-orders/${orderId}/last-victim-location`,
      { credentials: "include" },
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.location) return null;
    setVictimLat(String(data.location.latitude));
    setVictimLng(String(data.location.longitude));
    return {
      latitude: Number(data.location.latitude),
      longitude: Number(data.location.longitude),
    };
  }

  async function loadLastVictimFromApp() {
    setError(null);
    setMessage(null);
    try {
      const location = await fetchLastVictimFromApp();
      if (!location) {
        setError(
          "Ainda não há localização do app. Abra o mapa no celular e aguarde um ciclo.",
        );
        return;
      }
      setMessage(
        `Referência atualizada pela última posição do app (${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)})`,
      );
    } catch {
      setError("Falha de comunicação ao buscar posição do app");
    }
  }

  useEffect(() => {
    void fetchLastVictimFromApp();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- uma vez ao abrir o simulador
  }, [orderId]);

  async function defineInmatePosition() {
    setActing("simulate");
    setError(null);
    setMessage(null);

    try {
      const latitude = Number(inmateLat);
      const longitude = Number(inmateLng);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        setError("Informe latitude e longitude válidas do preso");
        return;
      }

      const res = await fetch(
        `/api/v1/protection-orders/${orderId}/simulate-location`,
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
            : "Não foi possível definir a posição",
        );
        return;
      }

      setMessage(
        `Posição definida: ${data.latitude?.toFixed?.(5) ?? latitude}, ${data.longitude?.toFixed?.(5) ?? longitude}`,
      );
    } catch {
      setError("Falha de comunicação com o servidor");
    } finally {
      setActing(null);
    }
  }

  async function testLocalizar() {
    setActing("localizar");
    setError(null);
    setMessage(null);
    setLocalizarResult(null);

    try {
      const victim = parseVictim();
      const res = await fetch(
        `/api/v1/protection-orders/${orderId}/localizar`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(victim),
        },
      );
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(
          typeof data.message === "string"
            ? data.message
            : "Falha ao testar localizar",
        );
        return;
      }

      setLocalizarResult(data as LocalizarResult);
      setMessage("Localizar executado com sucesso");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Falha de comunicação com o servidor",
      );
    } finally {
      setActing(null);
    }
  }

  const distances = simulatorDistances(radiusMeters);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <MapPin className="size-4" />
          Simulador de posição (mock)
        </CardTitle>
        <CardDescription>
          O raio desta medida é {radiusMeters} m (alerta em até{" "}
          {radiusMeters} m, sai em {radiusMeters + HYSTERESIS_METERS} m). Use o
          trajeto em ordem para aproximar o preso da vítima. Sem posição
          gravada, o mock fica ~800 m ao norte.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-medium">Referência da vítima</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="victim-lat">Latitude</Label>
              <Input
                id="victim-lat"
                inputMode="decimal"
                value={victimLat}
                onChange={(e) => setVictimLat(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="victim-lng">Longitude</Label>
              <Input
                id="victim-lng"
                inputMode="decimal"
                value={victimLng}
                onChange={(e) => setVictimLng(e.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={acting !== null}
              onClick={() => void loadLastVictimFromApp()}
            >
              Usar última posição do app
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Importante: cole a posição real do celular (botão acima). O padrão
            Goiânia ({DEFAULT_VICTIM_LAT}, {DEFAULT_VICTIM_LNG}) só serve se você
            estiver testando com essas coords.
          </p>
        </div>

        <div className="space-y-3">
          <div className="space-y-2">
            <p className="text-sm font-medium">Trajeto até a vítima</p>
            <div className="flex flex-wrap gap-2">
              {TRAJECTORY_STEPS.filter((item) => item.step !== null)
                .slice()
                .sort(
                  (a, b) =>
                    stepDistance(b.id, distances) -
                    stepDistance(a.id, distances),
                )
                .map((item, index) => (
                  <Button
                    key={item.id}
                    type="button"
                    variant={selectedPreset === item.id ? "default" : "outline"}
                    size="sm"
                    disabled={acting !== null}
                    title={`${item.hint} (~${stepDistance(item.id, distances)} m)`}
                    onClick={() => void playScenario(item.id)}
                  >
                    {acting === "simulate" && selectedPreset === item.id ? (
                      <Loader2
                        className="animate-spin"
                        data-icon="inline-start"
                      />
                    ) : null}
                    {index + 1}.{" "}
                    {item.id === "EDGE"
                      ? `${stepDistance(item.id, distances)} m`
                      : item.title}
                    <span className="text-xs opacity-70">
                      ~{stepDistance(item.id, distances)} m
                    </span>
                  </Button>
                ))}
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Afastamento</p>
            {TRAJECTORY_STEPS.filter((item) => item.step === null).map(
              (item) => (
                <Button
                  key={item.id}
                  type="button"
                  variant={selectedPreset === item.id ? "default" : "outline"}
                  size="sm"
                  disabled={acting !== null}
                  title={item.hint}
                  onClick={() => void playScenario(item.id)}
                >
                  {acting === "simulate" && selectedPreset === item.id ? (
                    <Loader2
                      className="animate-spin"
                      data-icon="inline-start"
                    />
                  ) : null}
                  {item.title}
                </Button>
              ),
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Clique na ordem para aproximar o preso. Longe e Na borda ficam
            seguros. No raio (e mais perto) dispara a violação após 2
            leituras. 270, 180, 120, 90 e 30 m testam o mapa.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="inmate-lat">Latitude</Label>
              <Input
                id="inmate-lat"
                inputMode="decimal"
                value={inmateLat}
                onChange={(e) => setInmateLat(e.target.value)}
                placeholder="Use um preset ou digite"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inmate-lng">Longitude</Label>
              <Input
                id="inmate-lng"
                inputMode="decimal"
                value={inmateLng}
                onChange={(e) => setInmateLng(e.target.value)}
                placeholder="Use um preset ou digite"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            disabled={acting !== null}
            onClick={() => void defineInmatePosition()}
          >
            {acting === "simulate" ? (
              <Loader2 className="animate-spin" data-icon="inline-start" />
            ) : (
              <MapPin data-icon="inline-start" />
            )}
            Definir posição do preso
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={acting !== null}
            onClick={() => void testLocalizar()}
          >
            {acting === "localizar" ? (
              <Loader2 className="animate-spin" data-icon="inline-start" />
            ) : (
              <Radar data-icon="inline-start" />
            )}
            Testar localizar
          </Button>
        </div>

        {message ? (
          <p className="rounded-lg border bg-muted/40 px-3 py-2 text-sm">
            {message}
          </p>
        ) : null}

        {localizarResult ? (
          <div className="rounded-lg border px-3 py-2 text-sm">
            <p className="font-medium">Resultado do localizar</p>
            <ul className="mt-1 space-y-0.5 text-muted-foreground">
              <li>
                Distância:{" "}
                <span className="font-medium text-foreground">
                  {localizarResult.distanciaMetros.toFixed(1)} m
                </span>
              </li>
              <li>
                Preso: {localizarResult.latitudePreso.toFixed(6)},{" "}
                {localizarResult.longitudePreso.toFixed(6)}
              </li>
              <li>Timestamp: {localizarResult.timestamp}</li>
            </ul>
          </div>
        ) : null}

        {error ? (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
