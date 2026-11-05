"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";

export type AddressValues = {
  addressZip: string;
  addressStreet: string;
  addressNumber: string;
  addressComplement: string;
  addressDistrict: string;
  addressCity: string;
  addressState: string;
};

export const emptyAddress: AddressValues = {
  addressZip: "",
  addressStreet: "",
  addressNumber: "",
  addressComplement: "",
  addressDistrict: "",
  addressCity: "",
  addressState: "",
};

const STATES = [
  "AC",
  "AL",
  "AM",
  "AP",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MG",
  "MS",
  "MT",
  "PA",
  "PB",
  "PE",
  "PI",
  "PR",
  "RJ",
  "RN",
  "RO",
  "RR",
  "RS",
  "SC",
  "SE",
  "SP",
  "TO",
] as const;

const fieldClass =
  "h-10 rounded-md border-[#D8DEE6] bg-white px-3 text-sm text-[#1B2A41] placeholder:text-[#9CA3AF] focus-visible:border-[#C5CDD6] focus-visible:ring-1 focus-visible:ring-[#C5CDD6]";

function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

function formatCep(value: string) {
  const digits = digitsOnly(value).slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

export function addressFromInitial(
  values?: Partial<{ [K in keyof AddressValues]: string | null }> | null,
): AddressValues {
  return {
    addressZip: formatCep(values?.addressZip ?? ""),
    addressStreet: values?.addressStreet ?? "",
    addressNumber: values?.addressNumber ?? "",
    addressComplement: values?.addressComplement ?? "",
    addressDistrict: values?.addressDistrict ?? "",
    addressCity: values?.addressCity ?? "",
    addressState: values?.addressState ?? "",
  };
}

type AddressFieldsProps = {
  idPrefix: string;
  values: AddressValues;
  onChange: (values: AddressValues) => void;
};

export function AddressFields({ idPrefix, values, onChange }: AddressFieldsProps) {
  function set<K extends keyof AddressValues>(key: K, value: AddressValues[K]) {
    onChange({ ...values, [key]: value });
  }

  return (
    <fieldset className="space-y-3">
      <legend className="ampara-kicker text-[11px] font-semibold tracking-wide uppercase">
        Endereço
      </legend>
      <div className="grid grid-cols-[1fr_7rem] gap-3">
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-zip`} className="text-[#1B2A41]">
            CEP
          </Label>
          <Input
            id={`${idPrefix}-zip`}
            value={values.addressZip}
            onChange={(event) => set("addressZip", formatCep(event.target.value))}
            inputMode="numeric"
            autoComplete="postal-code"
            placeholder="00000-000"
            className={fieldClass}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-state`} className="text-[#1B2A41]">
            UF
          </Label>
          <NativeSelect
            id={`${idPrefix}-state`}
            value={values.addressState}
            onChange={(event) => set("addressState", event.target.value)}
            className="h-10"
          >
            <option value="">UF</option>
            {STATES.map((state) => (
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </NativeSelect>
        </div>
      </div>
      <div className="grid grid-cols-[1fr_7rem] gap-3">
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-street`} className="text-[#1B2A41]">
            Logradouro
          </Label>
          <Input
            id={`${idPrefix}-street`}
            value={values.addressStreet}
            onChange={(event) => set("addressStreet", event.target.value)}
            maxLength={200}
            autoComplete="address-line1"
            placeholder="Rua, avenida, travessa"
            className={fieldClass}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-number`} className="text-[#1B2A41]">
            Número
          </Label>
          <Input
            id={`${idPrefix}-number`}
            value={values.addressNumber}
            onChange={(event) => set("addressNumber", event.target.value)}
            maxLength={20}
            placeholder="123"
            className={fieldClass}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-complement`} className="text-[#1B2A41]">
          Complemento
        </Label>
        <Input
          id={`${idPrefix}-complement`}
          value={values.addressComplement}
          onChange={(event) => set("addressComplement", event.target.value)}
          maxLength={100}
          autoComplete="address-line2"
          placeholder="Apto, bloco, casa"
          className={fieldClass}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-district`} className="text-[#1B2A41]">
            Bairro
          </Label>
          <Input
            id={`${idPrefix}-district`}
            value={values.addressDistrict}
            onChange={(event) => set("addressDistrict", event.target.value)}
            maxLength={100}
            placeholder="Bairro"
            className={fieldClass}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-city`} className="text-[#1B2A41]">
            Cidade
          </Label>
          <Input
            id={`${idPrefix}-city`}
            value={values.addressCity}
            onChange={(event) => set("addressCity", event.target.value)}
            maxLength={100}
            autoComplete="address-level2"
            placeholder="Cidade"
            className={fieldClass}
          />
        </div>
      </div>
    </fieldset>
  );
}
