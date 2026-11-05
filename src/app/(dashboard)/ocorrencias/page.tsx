import { Suspense } from "react";

import { PageLoading } from "@/components/layout/page-loading";
import { LivroDeOcorrencias } from "@/components/tracking/livro-de-ocorrencias";

export default function OcorrenciasPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <LivroDeOcorrencias />
    </Suspense>
  );
}
