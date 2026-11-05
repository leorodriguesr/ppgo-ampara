const NAME_PARTICLES = new Set([
  "de",
  "da",
  "do",
  "das",
  "dos",
  "e",
  "di",
  "du",
  "del",
  "van",
  "von",
  "y",
]);

function capitalizeNamePart(part: string) {
  return part
    .split("'")
    .map((piece) => {
      if (!piece) return piece;
      return (
        piece.charAt(0).toLocaleUpperCase("pt-BR") +
        piece.slice(1).toLocaleLowerCase("pt-BR")
      );
    })
    .join("'");
}

export function formatPersonName(name: string) {
  const words = name.trim().replace(/\s+/g, " ").split(" ").filter(Boolean);
  return words
    .map((word, index) => {
      const lower = word.toLocaleLowerCase("pt-BR");
      if (index > 0 && NAME_PARTICLES.has(lower)) return lower;
      return lower.split("-").map(capitalizeNamePart).join("-");
    })
    .join(" ");
}

export function formatAddress(address: {
  addressStreet?: string | null;
  addressNumber?: string | null;
  addressComplement?: string | null;
  addressDistrict?: string | null;
  addressCity?: string | null;
  addressState?: string | null;
  addressZip?: string | null;
}) {
  const street = [address.addressStreet, address.addressNumber]
    .filter(Boolean)
    .join(", ");
  const place = [address.addressDistrict, address.addressCity, address.addressState]
    .filter(Boolean)
    .join(" · ");
  const parts = [
    street,
    address.addressComplement,
    place,
    address.addressZip ? `CEP ${address.addressZip}` : null,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : "Endereço não informado";
}

export function formatDay(date: string | Date) {
  const value = typeof date === "string" ? new Date(date) : date;

  if (Number.isNaN(value.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(value);
}

export function formatDate(date: string | Date) {
  const value = typeof date === "string" ? new Date(date) : date;

  if (Number.isNaN(value.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(value);
}

export function formatDateTime(date: string | Date) {
  const value = typeof date === "string" ? new Date(date) : date;

  if (Number.isNaN(value.getTime())) {
    return "—";
  }

  const day = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(value);
  const time = new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);

  return `${day} ${time}`;
}
