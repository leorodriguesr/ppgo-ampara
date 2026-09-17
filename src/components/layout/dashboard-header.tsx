import type { AppRole } from "@/lib/rbac";
import { UserMenu } from "@/components/layout/user-menu";

type DashboardHeaderProps = {
  title: string;
  description?: string;
  user: {
    name: string;
    email: string;
    role: AppRole;
  };
};

export function DashboardHeader({
  title,
  description,
  user,
}: DashboardHeaderProps) {
  return (
    <header className="flex items-start justify-between gap-4 border-b px-4 py-4 md:px-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        {description ? (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <UserMenu name={user.name} email={user.email} role={user.role} />
    </header>
  );
}
