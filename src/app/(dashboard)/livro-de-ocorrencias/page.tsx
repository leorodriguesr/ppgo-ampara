import { redirect } from "next/navigation";

type Search = Record<string, string | string[] | undefined>;

export default async function LivroDeOcorrenciasRedirect({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const params = await searchParams;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") query.set(key, value);
    else if (value) {
      for (const item of value) query.append(key, item);
    }
  }
  const qs = query.toString();
  redirect(qs ? `/ocorrencias?${qs}` : "/ocorrencias");
}
