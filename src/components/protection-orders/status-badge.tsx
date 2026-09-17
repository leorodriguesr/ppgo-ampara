import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STATUS_LABELS: Record<
  string,
  { label: string; className: string }
> = {
  DRAFT: {
    label: "Rascunho",
    className: "border-[#E5E7EB] bg-white text-[#4B5563]",
  },
  AWAITING_PAIRING: {
    label: "Aguardando pareamento",
    className: "border-transparent bg-[#EEF2FF] text-[#3730A3]",
  },
  ACTIVE: {
    label: "Ativa",
    className: "border-transparent bg-[#DCFCE7] text-[#166534]",
  },
  SUSPENDED: {
    label: "Suspensa",
    className: "border-transparent bg-[#FEF3C7] text-[#92400E]",
  },
  CLOSED: {
    label: "Encerrada",
    className: "border-transparent bg-[#FEE2E2] text-[#991B1B]",
  },
};

export function ProtectionOrderStatusBadge({ status }: { status: string }) {
  const mapped = STATUS_LABELS[status] ?? {
    label: status,
    className: "border-[#E5E7EB] bg-white text-[#4B5563]",
  };

  return (
    <Badge
      variant="outline"
      className={cn("font-medium", mapped.className)}
    >
      {mapped.label}
    </Badge>
  );
}

export function ProtectionOrderSourceBadge({
  isSimulation,
}: {
  isSimulation: boolean;
}) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "font-medium",
        isSimulation
          ? "border-transparent bg-[#EEF2FF] text-[#3730A3]"
          : "border-transparent bg-[#E0F2FE] text-[#075985]",
      )}
    >
      {isSimulation ? "Simulação" : "Tornozeleira real"}
    </Badge>
  );
}
