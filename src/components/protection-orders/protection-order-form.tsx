"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Option = {
  id: string;
  fullName: string;
  externalInmateId?: string;
};

export type ProtectionOrderFormValues = {
  victimId?: string;
  inmateId?: string;
  radiusMeters: number;
  isSimulation?: boolean;
  judicialRef?: string | null;
  startsAt?: string | Date | null;
  endsAt?: string | Date | null;
  victim?: Option | null;
  inmate?: Option | null;
};

type ProtectionOrderFormProps = {
  mode: "create" | "edit";
  initialValues?: ProtectionOrderFormValues;
  orderId?: string;
  onSuccess?: (id: string) => void;
  onCancel?: () => void;
};

function toDatetimeLocalValue(value?: string | Date | null) {
  if (!value) return "";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";

  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

const fieldClass =
  "h-10 rounded-md border-[#D8DEE6] bg-white px-3 text-sm text-[#1B2A41] placeholder:text-[#9CA3AF] focus-visible:border-[#C5CDD6] focus-visible:ring-1 focus-visible:ring-[#C5CDD6]";

import { NativeSelect } from "@/components/ui/native-select";

export function ProtectionOrderForm({
  mode,
  initialValues,
  orderId,
  onSuccess,
  onCancel,
}: ProtectionOrderFormProps) {
  const router = useRouter();
  const [victimId, setVictimId] = useState(initialValues?.victimId ?? "");
  const [inmateId, setInmateId] = useState(initialValues?.inmateId ?? "");
  const [radiusMeters, setRadiusMeters] = useState(
    String(initialValues?.radiusMeters ?? 300),
  );
  const [isSimulation, setIsSimulation] = useState(
    initialValues?.isSimulation ?? true,
  );
  const [judicialRef, setJudicialRef] = useState(
    initialValues?.judicialRef ?? "",
  );
  const [startsAt, setStartsAt] = useState(
    toDatetimeLocalValue(initialValues?.startsAt),
  );
  const [endsAt, setEndsAt] = useState(
    toDatetimeLocalValue(initialValues?.endsAt),
  );
  const [victims, setVictims] = useState<Option[]>([]);
  const [inmates, setInmates] = useState<Option[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(mode === "create");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (mode !== "create") return;

    let cancelled = false;

    async function loadOptions() {
      setLoadingOptions(true);
      try {
        const [victimsRes, inmatesRes] = await Promise.all([
          fetch("/api/v1/victims?pageSize=100", { credentials: "include" }),
          fetch("/api/v1/inmates?pageSize=100", { credentials: "include" }),
        ]);

        const victimsData = await victimsRes.json().catch(() => ({}));
        const inmatesData = await inmatesRes.json().catch(() => ({}));

        if (cancelled) return;

        if (!victimsRes.ok || !inmatesRes.ok) {
          setError("Não foi possível carregar vítimas e presos");
          return;
        }

        setVictims((victimsData.data ?? []) as Option[]);
        setInmates((inmatesData.data ?? []) as Option[]);
      } catch {
        if (!cancelled) {
          setError("Falha ao carregar opções de vínculo");
        }
      } finally {
        if (!cancelled) setLoadingOptions(false);
      }
    }

    void loadOptions();
    return () => {
      cancelled = true;
    };
  }, [mode]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSaving(true);

    const radius = Number.parseInt(radiusMeters, 10);
    if (!Number.isFinite(radius)) {
      setError("Informe um raio válido em metros");
      setSaving(false);
      return;
    }

    if (!endsAt.trim()) {
      setError("Informe o prazo de término da medida");
      setSaving(false);
      return;
    }

    const payload =
      mode === "create"
        ? {
            victimId,
            inmateId,
            radiusMeters: radius,
            isSimulation,
            judicialRef: judicialRef.trim(),
            startsAt: startsAt || undefined,
            endsAt,
          }
        : {
            radiusMeters: radius,
            isSimulation,
            judicialRef: judicialRef.trim(),
            startsAt: startsAt || undefined,
            endsAt,
          };

    try {
      const res =
        mode === "create"
          ? await fetch("/api/v1/protection-orders", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify(payload),
            })
          : await fetch(`/api/v1/protection-orders/${orderId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify(payload),
            });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(
          typeof data.message === "string"
            ? data.message
            : "Não foi possível salvar a medida protetiva",
        );
        return;
      }

      const id = mode === "create" ? (data.id as string) : orderId!;
      if (onSuccess) {
        onSuccess(id);
      } else if (mode === "create") {
        router.push(`/protection-orders/${id}`);
      } else {
        router.refresh();
      }
    } catch {
      setError("Falha de comunicação com o servidor");
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    if (onCancel) {
      onCancel();
      return;
    }
    router.push("/protection-orders");
  }

  const createReady =
    victimId.length > 0 &&
    inmateId.length > 0 &&
    radiusMeters.trim().length > 0 &&
    judicialRef.trim().length > 0 &&
    endsAt.trim().length > 0;

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-5">
        <div className="space-y-3">
          {mode === "create" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="victimId" className="text-[#1B2A41]">
                  Vítima
                  <span className="ml-0.5 text-[#C62828]">*</span>
                </Label>
                <NativeSelect
                  id="victimId"
                  value={victimId}
                  onChange={(e) => setVictimId(e.target.value)}
                  required
                  disabled={loadingOptions || saving}
                  className="h-10"
                >
                  <option value="">
                    {loadingOptions ? "Carregando..." : "Selecione a vítima"}
                  </option>
                  {victims.map((victim) => (
                    <option key={victim.id} value={victim.id}>
                      {victim.fullName}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="inmateId" className="text-[#1B2A41]">
                  Preso
                  <span className="ml-0.5 text-[#C62828]">*</span>
                </Label>
                <NativeSelect
                  id="inmateId"
                  value={inmateId}
                  onChange={(e) => setInmateId(e.target.value)}
                  required
                  disabled={loadingOptions || saving}
                  className="h-10"
                >
                  <option value="">
                    {loadingOptions ? "Carregando..." : "Selecione o preso"}
                  </option>
                  {inmates.map((inmate) => (
                    <option key={inmate.id} value={inmate.id}>
                      {inmate.fullName}
                      {inmate.externalInmateId
                        ? ` (${inmate.externalInmateId})`
                        : ""}
                    </option>
                  ))}
                </NativeSelect>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[#6B7280]">
                  Vítima
                </p>
                <p className="text-sm text-[#1B2A41]">
                  {initialValues?.victim?.fullName ?? "—"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[#6B7280]">
                  Preso
                </p>
                <p className="text-sm text-[#1B2A41]">
                  {initialValues?.inmate?.fullName ?? "—"}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="judicialRef" className="text-[#1B2A41]">
              Referência judicial
              <span className="ml-0.5 text-[#C62828]">*</span>
            </Label>
            <Input
              id="judicialRef"
              value={judicialRef}
              onChange={(e) => setJudicialRef(e.target.value)}
              maxLength={200}
              required
              placeholder="Nº do processo"
              className={fieldClass}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="radiusMeters" className="text-[#1B2A41]">
              Raio (metros)
              <span className="ml-0.5 text-[#C62828]">*</span>
            </Label>
            <Input
              id="radiusMeters"
              type="number"
              inputMode="numeric"
              min={50}
              max={50000}
              step={1}
              value={radiusMeters}
              onChange={(e) => setRadiusMeters(e.target.value)}
              required
              className={fieldClass}
            />
          </div>
        </div>

        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-[#E5E7EB] bg-[#F8F9FB] px-3 py-3">
          <input
            id="isSimulation"
            type="checkbox"
            checked={isSimulation}
            onChange={(e) => setIsSimulation(e.target.checked)}
            disabled={saving}
            className="mt-0.5 size-4 accent-[#1B2A41]"
          />
          <span className="space-y-0.5">
            <span className="block text-sm font-medium text-[#1B2A41]">
              Medida de simulação
            </span>
            <span className="block text-xs leading-5 text-[#6B7280]">
              Marcado: usa o simulador do painel. Desmarcado: busca a posição
              real no Guardião pelo ID da tornozeleira do preso.
            </span>
          </span>
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="startsAt" className="text-[#1B2A41]">
              Início
            </Label>
            <Input
              id="startsAt"
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              className={fieldClass}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="endsAt" className="text-[#1B2A41]">
              Término
              <span className="ml-0.5 text-[#C62828]">*</span>
            </Label>
            <Input
              id="endsAt"
              type="datetime-local"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              required
              className={fieldClass}
            />
          </div>
        </div>
      </div>

      {error ? (
        <p className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="-mx-5 mt-6 flex justify-end gap-2 border-t border-[#E5E7EB] bg-[#F8F9FB] px-5 py-3">
        <Button
          type="button"
          variant="outline"
          onClick={handleCancel}
          disabled={saving}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={
            saving || (mode === "create" && (!createReady || loadingOptions))
          }
          className="bg-[#1B2A41] text-white hover:bg-[#24364f]"
        >
          {saving ? <Loader2 className="animate-spin" /> : null}
          {mode === "create" ? "Cadastrar" : "Salvar"}
        </Button>
      </div>
    </form>
  );
}
