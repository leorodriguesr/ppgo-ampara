import { cn } from "@/lib/utils";

type PoliciaPenalMarkProps = {
  className?: string;
  size?: number;
};

export function PoliciaPenalMark({
  className,
  size = 72,
}: PoliciaPenalMarkProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logopp.png"
      alt="Polícia Penal de Goiás"
      width={size}
      height={size}
      className={cn("object-contain", className)}
    />
  );
}

export function PoliciaPenalCorner() {
  return (
    <div className="pointer-events-none fixed left-3 top-3 z-50">
      <PoliciaPenalMark size={72} />
    </div>
  );
}
