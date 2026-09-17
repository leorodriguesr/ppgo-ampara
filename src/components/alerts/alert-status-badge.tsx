import { Badge } from "@/components/ui/badge";

const LABELS: Record<string, string> = {
  OPEN: "Aberto",
  RESOLVED: "Resolvido",
  FALSE_POSITIVE: "Falso positivo",
};

export function AlertStatusBadge({ status }: { status: string }) {
  const variant =
    status === "OPEN"
      ? "destructive"
      : status === "RESOLVED"
        ? "secondary"
        : "outline";

  return <Badge variant={variant}>{LABELS[status] ?? status}</Badge>;
}
