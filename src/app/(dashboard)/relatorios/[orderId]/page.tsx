import { Suspense } from "react";

import { TrackingDetail } from "@/components/tracking/tracking-detail";

export default async function RelatorioDetailPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  return (
    <Suspense fallback={<p className="text-sm text-[#6B7280]">Carregando…</p>}>
      <TrackingDetail orderId={orderId} />
    </Suspense>
  );
}
