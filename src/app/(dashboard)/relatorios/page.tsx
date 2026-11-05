import { Suspense } from "react";

import { PageLoading } from "@/components/layout/page-loading";
import { TrackingList } from "@/components/tracking/tracking-list";

export default function RelatoriosPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <TrackingList />
    </Suspense>
  );
}
