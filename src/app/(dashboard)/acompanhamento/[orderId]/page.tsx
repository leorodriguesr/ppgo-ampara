import { CaseMonitor } from "@/components/operations/case-monitor";

export default async function AcompanhamentoCasoPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  return <CaseMonitor orderId={orderId} />;
}
