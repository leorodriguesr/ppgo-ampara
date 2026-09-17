import { PoliciaPenalCorner } from "@/components/brand/policia-penal-mark";

export default function AuthFlowLayout({
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
