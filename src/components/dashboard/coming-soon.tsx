import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type ComingSoonProps = {
  title: string;
  description: string;
  stage: string;
};

export function ComingSoon({ title, description, stage }: ComingSoonProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle>{title}</CardTitle>
          <Badge variant="secondary">{stage}</Badge>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Esta funcionalidade será implementada na próxima etapa do MVP. A
          fundação (auth, RBAC, schema e layout) já está pronta.
        </p>
      </CardContent>
    </Card>
  );
}
