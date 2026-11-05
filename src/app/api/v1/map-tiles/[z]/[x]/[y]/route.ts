import { requireApiSession } from "@/lib/api";

type RouteContext = {
  params: Promise<{ z: string; x: string; y: string }>;
};

function tileIndex(value: string, zoom: number) {
  if (!/^\d+$/.test(value)) return null;
  const index = Number(value);
  const limit = 2 ** zoom;
  if (!Number.isInteger(index) || index < 0 || index >= limit) return null;
  return index;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    await requireApiSession();
  } catch {
    return new Response(null, { status: 401 });
  }

  const { z: zRaw, x: xRaw, y: yRaw } = await context.params;
  if (!/^\d+$/.test(zRaw)) return new Response(null, { status: 400 });
  const zoom = Number(zRaw);
  if (!Number.isInteger(zoom) || zoom < 0 || zoom > 19) {
    return new Response(null, { status: 400 });
  }
  const x = tileIndex(xRaw, zoom);
  const y = tileIndex(yRaw, zoom);
  if (x == null || y == null) return new Response(null, { status: 400 });

  const upstream = await fetch(`https://tile.openstreetmap.org/${zoom}/${x}/${y}.png`, {
    headers: {
      "User-Agent": "AMPARA/1.0 (Policia Penal de Goias; relatorio de percurso)",
    },
    next: { revalidate: 60 * 60 * 24 },
  });
  if (!upstream.ok) return new Response(null, { status: 502 });

  return new Response(await upstream.arrayBuffer(), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "private, max-age=86400",
    },
  });
}
