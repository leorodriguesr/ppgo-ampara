"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type InmateFormValues = {
  fullName: string;
  externalInmateId: string;
  document?: string | null;
  notes?: string | null;
};

type InmateFormProps = {
  mode: "create" | "edit";
  initialValues?: InmateFormValues;
  inmateId?: string;
  onSuccess?: (id: string) => void;
  onCancel?: () => void;
};

function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

function formatCpf(value: string) {
  const digits = digitsOnly(value).slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  }
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

const fieldClass =
  "h-10 rounded-md border-[#D8DEE6] bg-white px-3 text-sm text-[#1B2A41] placeholder:text-[#9CA3AF] focus-visible:border-[#C5CDD6] focus-visible:ring-1 focus-visible:ring-[#C5CDD6]";

export function InmateForm({
  mode,
  initialValues,
  inmateId,
  onSuccess,
  onCancel,
}: InmateFormProps) {
  const router = useRouter();
  const [fullName, setFullName] = useState(initialValues?.fullName ?? "");
  const [externalInmateId, setExternalInmateId] = useState(
    initialValues?.externalInmateId ?? "",
  );
  const [document, setDocument] = useState(
    formatCpf(initialValues?.document ?? ""),
  );
  const [notes, setNotes] = useState(initialValues?.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const canSubmit =
    fullName.trim().length >= 3 && externalInmateId.trim().length >= 1;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSaving(true);

    const payload = {
      fullName: fullName.trim(),
      externalInmateId: externalInmateId.trim(),
      document: document.trim(),
      notes: notes.trim(),
    };

    try {
      const res =
        mode === "create"
          ? await fetch("/api/v1/inmates", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify(payload),
            })
          : await fetch(`/api/v1/inmates/${inmateId}`, {
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
            : "Não foi possível salvar o preso",
        );
        return;
      }

      const id = mode === "create" ? (data.id as string) : inmateId!;
      if (onSuccess) {
        onSuccess(id);
      } else if (mode === "create") {
        router.push(`/inmates/${id}`);
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
    router.push("/inmates");
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-5">
        <fieldset className="space-y-3">
          <legend className="text-[11px] font-semibold tracking-wide text-[#6B7280] uppercase">
            Identificação
          </legend>
          <div className="space-y-1.5">
            <Label htmlFor="fullName" className="text-[#1B2A41]">
              Nome completo
              <span className="ml-0.5 text-[#C62828]">*</span>
            </Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              minLength={3}
              maxLength={200}
              autoComplete="name"
              placeholder="Como consta no documento"
              className={fieldClass}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="externalInmateId" className="text-[#1B2A41]">
              ID da tornozeleira
              <span className="ml-0.5 text-[#C62828]">*</span>
            </Label>
            <Input
              id="externalInmateId"
              value={externalInmateId}
              onChange={(e) => setExternalInmateId(e.target.value)}
              required
              maxLength={100}
              placeholder="Identificador externo do equipamento"
              className={fieldClass}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="document" className="text-[#1B2A41]">
              CPF
            </Label>
            <Input
              id="document"
              value={document}
              onChange={(e) => setDocument(formatCpf(e.target.value))}
              inputMode="numeric"
              maxLength={14}
              placeholder="000.000.000-00"
              className={fieldClass}
            />
          </div>
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="text-[11px] font-semibold tracking-wide text-[#6B7280] uppercase">
            Observações
          </legend>
          <div className="space-y-1.5">
            <Label htmlFor="notes" className="text-[#1B2A41]">
              Informações do monitoramento
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={2000}
              rows={4}
              placeholder="Unidade, regime ou outras informações úteis à equipe."
              className="min-h-[96px] rounded-md border-[#D8DEE6] bg-white px-3 py-2 text-sm text-[#1B2A41] placeholder:text-[#9CA3AF] focus-visible:border-[#C5CDD6] focus-visible:ring-1 focus-visible:ring-[#C5CDD6]"
            />
          </div>
        </fieldset>
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
          disabled={saving || !canSubmit}
          className="bg-[#1B2A41] text-white hover:bg-[#24364f]"
        >
          {saving ? <Loader2 className="animate-spin" /> : null}
          {mode === "create" ? "Cadastrar" : "Salvar"}
        </Button>
      </div>
    </form>
  );
}
