import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STATUS_LABELS: Record<
  string,
  { label: string; className: string; plainClassName: string }
> = {
  DRAFT: {
    label: "Rascunho",
    className: "border-[#E5E7EB] bg-white text-[#4B5563]",
    plainClassName: "text-[#4B5563]",
  },
  AWAITING_PAIRING: {
    label: "Aguardando pareamento",
    className: "border-transparent bg-[#EEF2FF] text-[#3730A3]",
    plainClassName: "text-[#3730A3] dark:text-[#A5B4FC]",
  },
  ACTIVE: {
    label: "Ativa",
    className: "border-transparent bg-[#DCFCE7] text-[#166534]",
    plainClassName: "text-[#166534] dark:text-[#86EFAC]",
  },
  SUSPENDED: {
    label: "Suspensa",
    className: "border-transparent bg-[#FEF3C7] text-[#92400E]",
    plainClassName: "text-[#92400E] dark:text-[#FCD34D]",
  },
  CLOSED: {
    label: "Encerrada",
    className: "border-transparent bg-[#FEE2E2] text-[#991B1B]",
    plainClassName: "text-[#991B1B] dark:text-[#FCA5A5]",
  },
};

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
          ? "border-transparent bg-[#FEF3C7] text-[#92400E]"
          : "border-transparent bg-[#E8EEF7] text-[#1B2A41]",
      )}
    >
      {isSimulation ? "Simulação" : "Guardião"}
    </Badge>
  );
}

export function ProtectionOrderStatusBadge({
  status,
  plain = false,
}: {
  status: string;
  plain?: boolean;
}) {
  const mapped = STATUS_LABELS[status] ?? {
    label: status,
    className: "border-[#E5E7EB] bg-white text-[#4B5563]",
    plainClassName: "text-[#4B5563]",
  };

  return (
    <Badge
      variant="outline"
      className={cn(
        "font-medium",
        plain ? mapped.plainClassName : mapped.className,
        plain && "h-auto rounded-none border-0 bg-transparent px-0 py-0",
      )}
    >
      {mapped.label}
    </Badge>
  );
}
