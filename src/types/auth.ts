import type { AppRole } from "@/lib/rbac";

export type AuthUserView = {
  id: string;
  name: string;
  email: string;
  role: AppRole;
  isActive: boolean;
  cpf?: string | null;
  image?: string | null;
};
