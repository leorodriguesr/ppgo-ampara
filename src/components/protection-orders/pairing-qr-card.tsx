"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, Copy, Loader2, QrCode, Smartphone } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format";

type PairingGenerateResponse = {
  expiresAt: string;
  qrPayload: string;
  token: string;
  ttlSeconds: number;
  webRedeemUrl: string;
};

type DeviceRow = {
  publicId: string;
  platform: string;
  deviceBrand?: string | null;
  deviceModel?: string | null;
  status: string;
  pairedAt: string;
  lastSeenAt: string | null;
  hasPushToken?: boolean;
};

type PairingQrCardProps = {
  orderId: string;
  status: string;
  onOrderActivated?: () => void;
};

function platformLabel(platform: string) {
  if (platform === "ios") return "iOS";
  if (platform === "android") return "Android";
  if (platform === "web") return "Web";
  return platform;
}

function deviceStatusLabel(status: string) {
  if (status === "ACTIVE") return "Ativo";
  if (status === "REVOKED") return "Cancelado";
  if (status === "LOST") return "Perdido";
  return status;
}

function deviceTitle(device: DeviceRow) {
  const brand = device.deviceBrand?.trim();
  const model = device.deviceModel?.trim();
  const hardware = [brand, model].filter(Boolean).join(" ");
  if (hardware) return hardware;
  return platformLabel(device.platform);
}

function formatLastSeen(date: string | null) {
  if (!date) return "Aguardando o primeiro sinal do app";
  const then = new Date(date).getTime();
  if (Number.isNaN(then)) return "—";

  const delta = Date.now() - then;
  const minutes = Math.floor(delta / 60_000);
  if (minutes < 1) return "Agora mesmo";
  if (minutes < 60) return `Há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Há ${hours} h`;
  return formatDateTime(date);
}

function useCountdown(expiresAt: string | null) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!expiresAt) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [expiresAt]);

  return useMemo(() => {
    if (!expiresAt) return null;
    const remainingMs = new Date(expiresAt).getTime() - now;
    if (remainingMs <= 0) return "expirado";
    const totalSec = Math.floor(remainingMs / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}:${String(sec).padStart(2, "0")}`;
  }, [expiresAt, now]);
}

export function PairingQrCard({
  orderId,
  status,
  onOrderActivated,
}: PairingQrCardProps) {
  const [generated, setGenerated] = useState<PairingGenerateResponse | null>(
    null,
  );
  const [devices, setDevices] = useState<DeviceRow[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(true);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<"token" | "url" | null>(null);
  const [pairedNotice, setPairedNotice] = useState(false);
  const generatedAtRef = useRef<number | null>(null);

  const countdown = useCountdown(generated?.expiresAt ?? null);
  const canGenerate = status === "AWAITING_PAIRING" || status === "ACTIVE";
  const isClosed = status === "CLOSED";
  const activeDevices = devices.filter((d) => d.status === "ACTIVE");
  const previousDevices = devices.filter((d) => d.status !== "ACTIVE");
  const linkedDevice = activeDevices[0] ?? null;

  const loadDevices = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoadingDevices(true);
    try {
      const res = await fetch(`/api/v1/protection-orders/${orderId}/devices`, {
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && Array.isArray(data.data)) {
        setDevices(data.data as DeviceRow[]);
      }
    } catch {
      // lista é auxiliar
    } finally {
      if (!opts?.silent) setLoadingDevices(false);
    }
  }, [orderId]);

  useEffect(() => {
    void loadDevices();
  }, [loadDevices]);

  // Enquanto o QR estiver ativo, observa se o app já resgatou o token.
  useEffect(() => {
    if (!generated) return;

    const id = window.setInterval(() => {
      void loadDevices({ silent: true });
    }, 2000);

    return () => window.clearInterval(id);
  }, [generated, loadDevices]);

  useEffect(() => {
    if (!generated || generatedAtRef.current == null) return;

    const pairedAfterGenerate = devices.some((device) => {
      if (device.status !== "ACTIVE") return false;
      const pairedAt = new Date(device.pairedAt).getTime();
      return (
        Number.isFinite(pairedAt) &&
        pairedAt >= generatedAtRef.current! - 5_000
      );
    });

    if (!pairedAfterGenerate) return;

    setGenerated(null);
    generatedAtRef.current = null;
    setPairedNotice(true);
    onOrderActivated?.();
  }, [devices, generated, onOrderActivated]);

  useEffect(() => {
    if (countdown === "expirado") {
      setGenerated(null);
      generatedAtRef.current = null;
    }
  }, [countdown]);

  if (isClosed) {
    const lastDevice = linkedDevice ?? previousDevices[0] ?? null;

    return (
      <div className="overflow-hidden rounded-2xl bg-white">
        <div className="flex min-h-[220px] flex-col items-center justify-center px-6 py-12 text-center">
          <div className="mb-5 flex size-16 items-center justify-center rounded-2xl bg-[#F3F4F6] text-[#1B2A41]">
            <Smartphone className="size-8" />
          </div>
          <h2 className="text-lg font-semibold tracking-tight text-[#1B2A41]">
            Pareamento pausado
          </h2>
          <p className="mt-2 max-w-md text-sm leading-6 text-[#6B7280]">
            A medida está encerrada. O app não gera QR nem recebe localização
            até a reabertura. Use o prazo acima para reativar.
          </p>
          {lastDevice ? (
            <p className="mt-4 text-sm text-[#4B5563]">
              Último aparelho: {deviceTitle(lastDevice)}
              <span className="text-[#9CA3AF]">
                {" "}
                · {platformLabel(lastDevice.platform)} ·{" "}
                {deviceStatusLabel(lastDevice.status)}
              </span>
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  if (!canGenerate) {
    return null;
  }

  async function generate() {
    setActing(true);
    setError(null);
    setPairedNotice(false);

    try {
      const res = await fetch(`/api/v1/protection-orders/${orderId}/pairing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({}),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(
          typeof data.message === "string"
            ? data.message
            : "Não foi possível gerar o QR",
        );
        return;
      }

      generatedAtRef.current = Date.now();
      setGenerated(data as PairingGenerateResponse);
      void loadDevices({ silent: true });
    } catch {
      setError("Falha de comunicação com o servidor");
    } finally {
      setActing(false);
    }
  }

  async function revokePendingTokens() {
    setActing(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/v1/protection-orders/${orderId}/pairing/revoke`,
        {
          method: "POST",
          credentials: "include",
        },
      );
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(
          typeof data.message === "string"
            ? data.message
            : "Não foi possível revogar os tokens",
        );
        return;
      }

      setGenerated(null);
    } catch {
      setError("Falha de comunicação com o servidor");
    } finally {
      setActing(false);
    }
  }

  async function revokeDeviceAccess() {
    const confirmed = window.confirm(
      "Cancelar o acesso do app nesta medida? O dispositivo atual deixa de funcionar imediatamente. A medida protetiva permanece ativa.",
    );
    if (!confirmed) return;

    setActing(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/v1/protection-orders/${orderId}/devices/revoke`,
        {
          method: "POST",
          credentials: "include",
        },
      );
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(
          typeof data.message === "string"
            ? data.message
            : "Não foi possível cancelar o acesso",
        );
        return;
      }

      setGenerated(null);
      await loadDevices();
      onOrderActivated?.();
    } catch {
      setError("Falha de comunicação com o servidor");
    } finally {
      setActing(false);
    }
  }

  async function copyText(value: string, kind: "token" | "url") {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      window.setTimeout(() => setCopied(null), 1500);
    } catch {
      setError("Não foi possível copiar");
    }
  }

  return (
    <div className="w-full space-y-4">
      {error ? (
        <p className="rounded-xl bg-[#FEF2F2] px-4 py-3 text-sm text-[#B42318]">
          {error}
        </p>
      ) : null}

      {pairedNotice && !generated ? (
        <p className="rounded-xl bg-[#ECFDF3] px-4 py-3 text-sm text-[#166534]">
          Celular vinculado. A vítima já pode usar o mapa.
        </p>
      ) : null}

      {loadingDevices ? (
        <div className="flex h-72 items-center justify-center rounded-2xl bg-white">
          <Loader2 className="size-5 animate-spin text-[#6B7280]" />
        </div>
      ) : generated ? (
        <div className="overflow-hidden rounded-2xl bg-white">
          <div className="flex items-center justify-between gap-3 border-b border-[#F0F2F5] px-6 py-4">
            <div>
              <p className="text-sm font-semibold text-[#1B2A41]">
                Aguardando a vítima escanear
              </p>
              <p className="mt-0.5 text-xs text-[#6B7280]">
                Abra o app AMPARA e aponte a câmera para o código.
              </p>
            </div>
            <div className="rounded-full bg-[#FFF7ED] px-3 py-1 text-xs font-semibold tabular-nums text-[#9A3412]">
              {countdown === "expirado" ? "Expirado" : countdown}
            </div>
          </div>

          <div className="grid gap-8 px-6 py-8 lg:grid-cols-[220px_1fr] lg:items-center">
            <div className="mx-auto w-fit rounded-2xl bg-[#F8FAFC] p-4">
              <QRCodeSVG value={generated.qrPayload} size={188} level="M" />
            </div>

            <ol className="space-y-4">
              {[
                "Peça para a vítima abrir o aplicativo.",
                "Toque em Ler QR Code e aponte a câmera.",
                "Esta tela fecha sozinha quando o vínculo for feito.",
              ].map((step, index) => (
                <li key={step} className="flex gap-3">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#1B2A41] text-[11px] font-semibold text-white">
                    {index + 1}
                  </span>
                  <p className="pt-0.5 text-sm leading-5 text-[#374151]">
                    {step}
                  </p>
                </li>
              ))}

              <li className="flex items-center gap-2 pt-2">
                <code className="min-w-0 flex-1 truncate rounded-lg bg-[#F3F4F6] px-3 py-2 text-[11px] text-[#4B5563]">
                  {generated.token}
                </code>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="outline"
                  className="shrink-0 bg-white"
                  onClick={() => void copyText(generated.token, "token")}
                >
                  {copied === "token" ? <Check /> : <Copy />}
                </Button>
              </li>
            </ol>
          </div>

          <div className="border-t border-[#F0F2F5] px-6 py-3">
            <button
              type="button"
              disabled={acting}
              className="cursor-pointer text-sm text-[#6B7280] hover:text-[#1B2A41]"
              onClick={() => void revokePendingTokens()}
            >
              Cancelar este QR Code
            </button>
          </div>
        </div>
      ) : linkedDevice ? (
        <div className="overflow-hidden rounded-2xl bg-white">
          <div className="flex flex-wrap items-start justify-between gap-4 px-6 py-6">
            <div className="flex min-w-0 items-start gap-4">
              <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-[#ECFDF3] text-[#166534]">
                <Smartphone className="size-7" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate text-lg font-semibold tracking-tight text-[#1B2A41]">
                    {deviceTitle(linkedDevice)}
                  </h2>
                  <span className="rounded-full bg-[#DCFCE7] px-2.5 py-0.5 text-[11px] font-semibold text-[#166534]">
                    Conectado
                  </span>
                </div>
                <p className="mt-1 text-sm text-[#6B7280]">
                  {platformLabel(linkedDevice.platform)} · a vítima já recebe o
                  mapa desta medida neste aparelho.
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              disabled={acting}
              className="border-[#FECACA] bg-white text-[#B42318] hover:bg-[#FEF2F2]"
              onClick={() => void revokeDeviceAccess()}
            >
              Desconectar aparelho
            </Button>
          </div>

          <div className="grid grid-cols-1 divide-y divide-[#F0F2F5] border-t border-[#F0F2F5] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            <div className="px-6 py-4">
              <p className="text-[11px] font-medium tracking-wide text-[#9CA3AF] uppercase">
                Sistema
              </p>
              <p className="mt-1 text-sm font-medium text-[#1B2A41]">
                {platformLabel(linkedDevice.platform)}
              </p>
            </div>
            <div className="px-6 py-4">
              <p className="text-[11px] font-medium tracking-wide text-[#9CA3AF] uppercase">
                Vinculado em
              </p>
              <p className="mt-1 text-sm font-medium text-[#1B2A41]">
                {formatDateTime(linkedDevice.pairedAt)}
              </p>
            </div>
            <div className="px-6 py-4">
              <p className="text-[11px] font-medium tracking-wide text-[#9CA3AF] uppercase">
                Último sinal
              </p>
              <p className="mt-1 text-sm font-medium text-[#1B2A41]">
                {formatLastSeen(linkedDevice.lastSeenAt)}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl bg-white px-6 py-16 text-center">
          <div className="mb-5 flex size-16 items-center justify-center rounded-2xl bg-[#F3F4F6] text-[#1B2A41]">
            <Smartphone className="size-8" />
          </div>
          <h2 className="text-lg font-semibold tracking-tight text-[#1B2A41]">
            Vincular o celular da vítima
          </h2>
          <p className="mt-2 max-w-sm text-sm leading-6 text-[#6B7280]">
            Gere um QR Code, peça para a vítima escanear no aplicativo e o
            monitoramento começa na hora.
          </p>
          <Button
            type="button"
            disabled={acting}
            className="mt-6 cursor-pointer bg-[#1B2A41] px-5 text-white hover:bg-[#24364f]"
            onClick={() => void generate()}
          >
            {acting ? (
              <Loader2 className="animate-spin" data-icon="inline-start" />
            ) : (
              <QrCode data-icon="inline-start" />
            )}
            Gerar QR Code
          </Button>
        </div>
      )}

      {previousDevices.length > 0 && !generated ? (
        <div>
          <p className="mb-2 px-1 text-[11px] font-medium tracking-wide text-[#9CA3AF] uppercase">
            Acessos anteriores
          </p>
          <div className="space-y-2">
            {previousDevices.map((device) => (
              <div
                key={device.publicId}
                className="flex items-center justify-between gap-3 rounded-xl bg-white px-4 py-3"
              >
                <p className="truncate text-sm text-[#4B5563]">
                  {deviceTitle(device)}
                  <span className="text-[#9CA3AF]">
                    {" "}
                    · {platformLabel(device.platform)}
                  </span>
                </p>
                <span className="shrink-0 text-xs text-[#9CA3AF]">
                  {deviceStatusLabel(device.status)}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
