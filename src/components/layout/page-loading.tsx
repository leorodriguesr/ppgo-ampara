import { Loader2 } from "lucide-react";

export function PageLoading() {
  return (
    <div
      role="status"
      aria-label="Carregando"
      className="flex min-h-[60vh] items-center justify-center"
    >
      <Loader2 className="size-6 animate-spin text-[#1B2A41] dark:text-white" />
    </div>
  );
}
