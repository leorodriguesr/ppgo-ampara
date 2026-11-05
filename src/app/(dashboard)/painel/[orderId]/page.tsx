import { redirect } from "next/navigation";

export default async function PainelCasoPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  redirect(`/acompanhamento/${orderId}`);
}
