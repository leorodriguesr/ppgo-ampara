"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { DayField } from "@/components/layout/list-search";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { formatPersonName } from "@/lib/format";
import { toDateInputValue } from "@/lib/vigencia-day";

type Option = {
  id: string;
  fullName: string;
  externalInmateId?: string;
};

export type ProtectionOrderFormValues = {
  victimId?: string;
  inmateId?: string;
  radiusMeters: number;
  watchRadiusMeters?: number;
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
  pinnedFooter?: boolean;
};

const fieldClass =
  "h-10 rounded-md border-[#D8DEE6] bg-white px-3 text-sm text-[#1B2A41] placeholder:text-[#9CA3AF] focus-visible:border-[#C5CDD6] focus-visible:ring-1 focus-visible:ring-[#C5CDD6]";

export function ProtectionOrderForm({
  mode,
  initialValues,
  orderId,
  onSuccess,
  onCancel,
  pinnedFooter = false,
}: ProtectionOrderFormProps) {
  const router = useRouter();
  const [victimId, setVictimId] = useState(initialValues?.victimId ?? "");
  const [inmateId, setInmateId] = useState(initialValues?.inmateId ?? "");
  const [radiusMeters, setRadiusMeters] = useState(
    String(initialValues?.radiusMeters ?? 300),
  );
  const [watchRadiusMeters, setWatchRadiusMeters] = useState(
    String(initialValues?.watchRadiusMeters ?? 1000),
  );
  const [isSimulation, setIsSimulation] = useState(
    initialValues?.isSimulation ?? true,
  );
  const [judicialRef, setJudicialRef] = useState(
    initialValues?.judicialRef ?? "",
  );
  const [startsAt, setStartsAt] = useState(
    toDateInputValue(initialValues?.startsAt),
  );
  const [endsAt, setEndsAt] = useState(
    toDateInputValue(initialValues?.endsAt),
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
    const watchRadius = Number.parseInt(watchRadiusMeters, 10);
    if (!Number.isFinite(radius) || !Number.isFinite(watchRadius)) {
      setError("Informe os raios em metros");
      setSaving(false);
      return;
    }
    if (watchRadius <= radius) {
      setError(
        "O raio de visualização do policial deve ser maior que o raio da vítima",
      );
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
            watchRadiusMeters: watchRadius,
            isSimulation,
            judicialRef: judicialRef.trim(),
            startsAt: startsAt || undefined,
            endsAt,
          }
        : {
            radiusMeters: radius,
            watchRadiusMeters: watchRadius,
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
        router.push(`/medidas-protetivas/${id}`);
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
    router.push("/medidas-protetivas");
  }

  const createReady =
    victimId.length > 0 &&
    inmateId.length > 0 &&
    radiusMeters.trim().length > 0 &&
    watchRadiusMeters.trim().length > 0 &&
    judicialRef.trim().length > 0 &&
    endsAt.trim().length > 0;

  return (
    <form
      onSubmit={handleSubmit}
      className={pinnedFooter ? "flex min-h-0 flex-1 flex-col" : undefined}
    >
      <div
        className={
          pinnedFooter
            ? "min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4"
            : "space-y-5"
        }
      >
        <div className="space-y-3">
          {mode === "create" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="victimId" className="text-[#1B2A41]">
                  Vítima
                  <span className="ml-0.5 text-[#C62828]">*</span>
                </Label>
                <SearchableSelect
                  id="victimId"
                  value={victimId}
                  onChange={setVictimId}
                  disabled={loadingOptions || saving}
                  placeholder={loadingOptions ? "Carregando..." : "Selecione a vítima"}
                  options={victims.map((victim) => ({
                    value: victim.id,
                    label: formatPersonName(victim.fullName),
                  }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="inmateId" className="text-[#1B2A41]">
                  Preso
                  <span className="ml-0.5 text-[#C62828]">*</span>
                </Label>
                <SearchableSelect
                  id="inmateId"
                  value={inmateId}
                  onChange={setInmateId}
                  disabled={loadingOptions || saving}
                  placeholder={loadingOptions ? "Carregando..." : "Selecione o preso"}
                  options={inmates.map((inmate) => ({
                    value: inmate.id,
                    label: `${formatPersonName(inmate.fullName)}${
                      inmate.externalInmateId ? ` (${inmate.externalInmateId})` : ""
                    }`,
                  }))}
                />
              </div>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <p className="ampara-kicker text-[11px] font-semibold uppercase tracking-wide">
                  Vítima
                </p>
                <p className="text-sm text-[#1B2A41]">
                  {initialValues?.victim?.fullName
                    ? formatPersonName(initialValues.victim.fullName)
                    : "—"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="ampara-kicker text-[11px] font-semibold uppercase tracking-wide">
                  Preso
                </p>
                <p className="text-sm text-[#1B2A41]">
                  {initialValues?.inmate?.fullName
                    ? formatPersonName(initialValues.inmate.fullName)
                    : "—"}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
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
              Raio da vítima (metros)
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
            <p className="text-xs text-[#6B7280]">
              Distância em que o app da vítima mostra o agressor e abre a
              violação.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="watchRadiusMeters" className="text-[#1B2A41]">
              Raio de visualização do policial (metros)
              <span className="ml-0.5 text-[#C62828]">*</span>
            </Label>
            <Input
              id="watchRadiusMeters"
              type="number"
              inputMode="numeric"
              min={50}
              max={50000}
              step={1}
              value={watchRadiusMeters}
              onChange={(e) => setWatchRadiusMeters(e.target.value)}
              required
              className={fieldClass}
            />
            <p className="text-xs text-[#6B7280]">
              A partir desta distância o Acompanhamento mostra o agressor para a
              equipe. Precisa ser maior que o raio da vítima. Sugestão: 1000 m.
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="startsAt" className="text-[#1B2A41]">
              Início
            </Label>
            <DayField
              id="startsAt"
              value={startsAt}
              onChange={setStartsAt}
              label="Início"
              disabled={saving}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="endsAt" className="text-[#1B2A41]">
              Término
              <span className="ml-0.5 text-[#C62828]">*</span>
            </Label>
            <DayField
              id="endsAt"
              value={endsAt}
              onChange={setEndsAt}
              label="Término"
              disabled={saving}
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

        {error ? (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}
      </div>

      <div
        className={
          pinnedFooter
            ? "flex shrink-0 justify-end gap-2 border-t border-[#E5E7EB] bg-[#F8F9FB] px-5 py-3"
            : "-mx-5 mt-6 flex justify-end gap-2 border-t border-[#E5E7EB] bg-[#F8F9FB] px-5 py-3"
        }
      >
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
          className="ampara-create"
        >
          {saving ? <Loader2 className="animate-spin" /> : null}
          {mode === "create" ? "Cadastrar" : "Salvar"}
        </Button>
      </div>
    </form>
  );
}
