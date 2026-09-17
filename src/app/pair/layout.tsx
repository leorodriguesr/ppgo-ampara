import { PoliciaPenalCorner } from "@/components/brand/policia-penal-mark";

export default function PairLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <PoliciaPenalCorner />
      {children}
    </>
  );
}
