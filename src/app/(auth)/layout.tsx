import { PoliciaPenalCorner } from "@/components/brand/policia-penal-mark";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-svh overflow-hidden bg-[radial-gradient(circle_at_top_left,_oklch(0.96_0.02_250),_transparent_40%),radial-gradient(circle_at_bottom_right,_oklch(0.95_0.03_20),_transparent_45%),oklch(0.985_0.005_100)]">
      <PoliciaPenalCorner />
      <div className="mx-auto flex min-h-svh w-full max-w-6xl flex-col items-center justify-center px-4 py-10">
        {children}
      </div>
    </div>
  );
}
