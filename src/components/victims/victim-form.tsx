"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import {
  AddressFields,
  addressFromInitial,
  type AddressValues,
} from "@/components/people/address-fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type VictimFormValues = {
  fullName: string;
  phone?: string | null;
  document?: string | null;
} & Partial<{ [K in keyof AddressValues]: string | null }>;

type VictimFormProps = {
  mode: "create" | "edit";
  initialValues?: VictimFormValues;
  victimId?: string;
  onSuccess?: (id: string) => void;
  onCancel?: () => void;
};

function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

function formatPhone(value: string) {
  const digits = digitsOnly(value).slice(0, 11);
  if (digits.length === 0) return "";
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
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

export function VictimForm({
  mode,
  initialValues,
  victimId,
  onSuccess,
  onCancel,
}: VictimFormProps) {
  const router = useRouter();
  const [fullName, setFullName] = useState(initialValues?.fullName ?? "");
  const [phone, setPhone] = useState(
    formatPhone(initialValues?.phone ?? ""),
  );
  const [document, setDocument] = useState(
    formatCpf(initialValues?.document ?? ""),
  );
  const [address, setAddress] = useState<AddressValues>(
    addressFromInitial(initialValues),
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSaving(true);

    const payload = {
      fullName: fullName.trim(),
      phone: phone.trim(),
      document: document.trim(),
      ...address,
    };

    try {
      const res =
        mode === "create"
          ? await fetch("/api/v1/victims", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify(payload),
            })
          : await fetch(`/api/v1/victims/${victimId}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify(payload),
            });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(
          typeof data.message === "string"
            ? data.message
            : "Não foi possível salvar a vítima",
        );
        return;
      }

      const id = mode === "create" ? (data.id as string) : victimId!;
      if (onSuccess) {
        onSuccess(id);
      } else {
        router.push("/vitimas");
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
    router.push("/vitimas");
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-5">
        <fieldset className="space-y-3">
          <legend className="ampara-kicker text-[11px] font-semibold tracking-wide uppercase">
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
          <div className="space-y-1.5">
            <Label htmlFor="phone" className="text-[#1B2A41]">
              Telefone
            </Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(formatPhone(e.target.value))}
              inputMode="tel"
              autoComplete="tel"
              placeholder="(00) 00000-0000"
              className={fieldClass}
            />
          </div>
        </fieldset>

        <AddressFields
          idPrefix="victim-address"
          values={address}
          onChange={setAddress}
        />
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
          className="cursor-pointer"
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={saving || fullName.trim().length < 3} className="ampara-create cursor-pointer">
          {saving ? <Loader2 className="animate-spin" /> : null}
          {mode === "create" ? "Cadastrar" : "Salvar"}
        </Button>
      </div>
    </form>
  );
}
