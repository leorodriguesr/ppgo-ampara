"use client";

import { ComingSoon } from "@/components/dashboard/coming-soon";
import { NoPermission } from "@/components/auth/no-permission";
import { useAuth } from "@/providers/auth-provider";

export default function AuditPage() {
  const { authData } = useAuth();

  if (authData.user && authData.user.role !== "ADMIN") {
    return <NoPermission />;
  }

  return (
    <ComingSoon
      title="Auditoria"
      description="Trilha de auditoria de ações sensíveis do sistema (somente ADMIN)."
      stage="ETAPA 2+"
    />
  );
}
