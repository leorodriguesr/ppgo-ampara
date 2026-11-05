import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFImage,
  type PDFPage,
} from "pdf-lib";

import { haversineDistanceMeters } from "@/lib/geo";

type Zone = "WATCH" | "VIOLATION" | "OUTSIDE";

type LatLng = { latitude: number; longitude: number };

type NarrativeItem = {
  kind: "point" | "still";
  zone: Zone | null;
  text: string;
  victim: LatLng | null;
  inmate: LatLng | null;
};

export type TrackingReportInput = {
  from: string;
  to: string;
  order: {
    judicialRef: string | null;
    victimName: string;
    inmateName: string;
    radiusMeters: number;
    watchRadiusMeters: number;
  };
  narrative: NarrativeItem[];
};

type ReportStop = {
  number: number;
  zone: Zone;
  text: string;
  notes: string[];
  inmate: LatLng;
  victim: LatLng;
  pinInmate: boolean;
  pinVictim: boolean;
};

const MOVED_METERS = 15;
const SAME_SPOT_METERS = 20;
const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 40;
const LETTERHEAD_TOP = 16;
const LETTERHEAD_LOGO = 64;
const LETTERHEAD_RULE = 8;

const ZONE_COLOR: Record<Zone, string> = {
  VIOLATION: "#C62828",
  WATCH: "#C47E00",
  OUTSIDE: "#6B7280",
};
const VICTIM_COLOR = "#2563EB";

function project(latitude: number, longitude: number, zoom: number) {
  const scale = 256 * 2 ** zoom;
  const x = ((longitude + 180) / 360) * scale;
  const clamped = Math.max(-85, Math.min(85, latitude));
  const sin = Math.sin((clamped * Math.PI) / 180);
  const y =
    (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale;
  return { x, y };
}

function zoneFill(zone: Zone) {
  return ZONE_COLOR[zone];
}

export function reportStops(narrative: NarrativeItem[]): ReportStop[] {
  const stops: ReportStop[] = [];

  for (const item of narrative) {
    if (item.kind === "still") {
      const last = stops.at(-1);
      if (last) last.notes.push(item.text);
      continue;
    }
    if (!item.inmate || !item.victim || !item.zone) continue;

    const previous = stops.at(-1);
    const inmateMoved =
      !previous ||
      haversineDistanceMeters(
        previous.inmate.latitude,
        previous.inmate.longitude,
        item.inmate.latitude,
        item.inmate.longitude,
      ) >= MOVED_METERS;
    const victimMoved =
      !previous ||
      haversineDistanceMeters(
        previous.victim.latitude,
        previous.victim.longitude,
        item.victim.latitude,
        item.victim.longitude,
      ) >= MOVED_METERS;
    const apart =
      haversineDistanceMeters(
        item.inmate.latitude,
        item.inmate.longitude,
        item.victim.latitude,
        item.victim.longitude,
      ) >= SAME_SPOT_METERS;

    stops.push({
      number: stops.length + 1,
      zone: item.zone,
      text: item.text,
      notes: [],
      inmate: item.inmate,
      victim: item.victim,
      pinInmate: inmateMoved || !victimMoved,
      pinVictim: victimMoved && apart,
    });
  }

  return stops;
}

function violationNarratives(narrative: NarrativeItem[]): NarrativeItem[][] {
  const episodes: NarrativeItem[][] = [];

  for (let index = 0; index < narrative.length; index += 1) {
    const item = narrative[index];
    if (item.kind !== "point" || item.zone !== "VIOLATION") continue;

    let violationEnd = index;
    while (violationEnd + 1 < narrative.length) {
      const next = narrative[violationEnd + 1];
      if (next.kind === "point" && next.zone === "VIOLATION") {
        violationEnd += 1;
        continue;
      }
      const after = narrative[violationEnd + 2];
      if (
        next.kind === "still" &&
        after?.kind === "point" &&
        after.zone === "VIOLATION"
      ) {
        violationEnd += 1;
        continue;
      }
      break;
    }

    let start = index;
    while (start > 0 && narrative[start - 1].zone === "WATCH") start -= 1;
    while (narrative[start]?.kind === "still") start += 1;

    let end = violationEnd;
    while (end + 1 < narrative.length) {
      const next = narrative[end + 1];
      if (next.kind !== "still" && next.zone !== "WATCH") break;
      end += 1;
    }
    if (
      end + 1 < narrative.length &&
      narrative[end + 1].kind === "point" &&
      narrative[end + 1].zone === "OUTSIDE"
    ) {
      end += 1;
    }

    episodes.push(narrative.slice(start, end + 1));
    index = violationEnd;
  }

  return episodes;
}

function expandBounds(stops: ReportStop[]) {
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;
  for (const stop of stops) {
    for (const point of [stop.inmate, stop.victim]) {
      minLat = Math.min(minLat, point.latitude);
      maxLat = Math.max(maxLat, point.latitude);
      minLng = Math.min(minLng, point.longitude);
      maxLng = Math.max(maxLng, point.longitude);
    }
  }
  const latSpan = Math.max(maxLat - minLat, 0.004);
  const lngSpan = Math.max(maxLng - minLng, 0.004);
  const lat = (minLat + maxLat) / 2;
  const lng = (minLng + maxLng) / 2;
  return {
    minLat: lat - latSpan / 2 - latSpan * 0.18,
    maxLat: lat + latSpan / 2 + latSpan * 0.18,
    minLng: lng - lngSpan / 2 - lngSpan * 0.18,
    maxLng: lng + lngSpan / 2 + lngSpan * 0.18,
  };
}

async function loadTile(zoom: number, x: number, y: number) {
  const response = await fetch(`/api/v1/map-tiles/${zoom}/${x}/${y}`, {
    credentials: "include",
  });
  if (!response.ok) return null;
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    return image;
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function mapPool<T>(
  items: T[],
  limit: number,
  task: (item: T) => Promise<void>,
) {
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      await task(items[index]);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => worker()),
  );
}

function drawBadge(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  label: string,
  fill: string,
) {
  const radius = label.length > 1 ? 14 : 12;
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.fillStyle = fill;
  context.fill();
  context.lineWidth = 2;
  context.strokeStyle = "#ffffff";
  context.stroke();
  context.fillStyle = "#ffffff";
  context.font = "700 12px sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(label, x, y + 0.5);
}

async function renderMap(stops: ReportStop[]) {
  const width = 1030;
  const height = 620;
  const bounds = expandBounds(stops);
  let zoom = 17;
  for (; zoom >= 13; zoom -= 1) {
    const northWest = project(bounds.maxLat, bounds.minLng, zoom);
    const southEast = project(bounds.minLat, bounds.maxLng, zoom);
    if (southEast.x - northWest.x <= width - 80 && southEast.y - northWest.y <= height - 80) {
      break;
    }
  }

  const northWest = project(bounds.maxLat, bounds.minLng, zoom);
  const southEast = project(bounds.minLat, bounds.maxLng, zoom);
  const originX = (northWest.x + southEast.x) / 2 - width / 2;
  const originY = (northWest.y + southEast.y) / 2 - height / 2;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Não foi possível desenhar o mapa");

  context.fillStyle = "#E8EAED";
  context.fillRect(0, 0, width, height);

  const x0 = Math.floor(originX / 256);
  const y0 = Math.floor(originY / 256);
  const x1 = Math.floor((originX + width) / 256);
  const y1 = Math.floor((originY + height) / 256);
  const tiles: Array<{ x: number; y: number }> = [];
  for (let x = x0; x <= x1; x += 1) {
    for (let y = y0; y <= y1; y += 1) tiles.push({ x, y });
  }

  await mapPool(tiles, 6, async (tile) => {
    const image = await loadTile(zoom, tile.x, tile.y);
    if (!image) return;
    context.drawImage(image, tile.x * 256 - originX, tile.y * 256 - originY);
  });

  const pixel = (point: LatLng) => {
    const projected = project(point.latitude, point.longitude, zoom);
    return { x: projected.x - originX, y: projected.y - originY };
  };

  context.lineCap = "round";
  context.lineJoin = "round";
  context.strokeStyle = VICTIM_COLOR;
  context.globalAlpha = 0.85;
  context.lineWidth = 4;
  context.beginPath();
  stops.forEach((stop, index) => {
    const point = pixel(stop.victim);
    if (index === 0) context.moveTo(point.x, point.y);
    else context.lineTo(point.x, point.y);
  });
  context.stroke();

  for (let index = 1; index < stops.length; index += 1) {
    const from = pixel(stops[index - 1].inmate);
    const to = pixel(stops[index].inmate);
    context.globalAlpha = 0.95;
    context.strokeStyle = zoneFill(stops[index].zone);
    context.lineWidth = 5;
    context.beginPath();
    context.moveTo(from.x, from.y);
    context.lineTo(to.x, to.y);
    context.stroke();
  }
  context.globalAlpha = 1;

  const occupied: Array<{ x: number; y: number }> = [];
  const place = (point: LatLng) => {
    const raw = pixel(point);
    let x = raw.x;
    let y = raw.y;
    for (let ring = 1; ring <= 8; ring += 1) {
      const crowded = occupied.some(
        (item) => Math.hypot(item.x - x, item.y - y) < 26,
      );
      if (!crowded) break;
      const angle = ring * 1.15;
      x = raw.x + Math.cos(angle) * ring * 10;
      y = raw.y + Math.sin(angle) * ring * 10;
    }
    if (Math.hypot(x - raw.x, y - raw.y) > 8) {
      context.strokeStyle = "#1A1A1A";
      context.globalAlpha = 0.45;
      context.lineWidth = 1;
      context.beginPath();
      context.moveTo(raw.x, raw.y);
      context.lineTo(x, y);
      context.stroke();
      context.globalAlpha = 1;
      context.fillStyle = "#1A1A1A";
      context.beginPath();
      context.arc(raw.x, raw.y, 2.5, 0, Math.PI * 2);
      context.fill();
    }
    occupied.push({ x, y });
    return { x, y };
  };

  for (const stop of stops) {
    const label = String(stop.number);
    if (stop.pinInmate) {
      const at = place(stop.inmate);
      drawBadge(context, at.x, at.y, label, zoneFill(stop.zone));
    }
    if (stop.pinVictim) {
      const at = place(stop.victim);
      drawBadge(context, at.x, at.y, label, VICTIM_COLOR);
    }
  }

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((value) => {
      if (value) resolve(value);
      else reject(new Error("Não foi possível exportar o mapa"));
    }, "image/png");
  });
  return new Uint8Array(await blob.arrayBuffer());
}

function pdfColor(hex: string) {
  const value = hex.replace("#", "");
  return rgb(
    Number.parseInt(value.slice(0, 2), 16) / 255,
    Number.parseInt(value.slice(2, 4), 16) / 255,
    Number.parseInt(value.slice(4, 6), 16) / 255,
  );
}

function winAnsi(text: string) {
  return text
    .replaceAll("—", "-")
    .replaceAll("–", "-")
    .replaceAll("“", '"')
    .replaceAll("”", '"')
    .replaceAll("’", "'")
    .replace(/[^\u0000-\u00FF]/g, "");
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number) {
  const words = winAnsi(text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines.length > 0 ? lines : [""];
}

function formatDay(value: string) {
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

function periodLabel(from: string, to: string) {
  if (!from && !to) return "Período não informado";
  if (from === to || !to) return formatDay(from);
  return `${formatDay(from)} a ${formatDay(to)}`;
}

function fileSlug(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

export function trackingReportFilename(input: TrackingReportInput) {
  const who = fileSlug(input.order.judicialRef || input.order.inmateName || "percurso");
  const day = input.from || input.to || "periodo";
  return `relatorio-${who}-${day}.pdf`;
}

type Cursor = { page: PDFPage; y: number };

function drawFooter(
  page: PDFPage,
  font: PDFFont,
  pageNumber: number,
  pageCount: number,
  emitted: string,
) {
  const color = rgb(0.42, 0.45, 0.5);
  page.drawText(winAnsi(`AMPARA · ${emitted}`), {
    x: MARGIN,
    y: 24,
    size: 8,
    font,
    color,
  });
  const pages = winAnsi(`Página ${pageNumber} de ${pageCount}`);
  page.drawText(pages, {
    x: PAGE_WIDTH - MARGIN - font.widthOfTextAtSize(pages, 8),
    y: 24,
    size: 8,
    font,
    color,
  });
}

async function loadAsset(path: string) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error("Não foi possível carregar o cabeçalho do relatório");
  }
  return new Uint8Array(await response.arrayBuffer());
}

function drawCentered(
  page: PDFPage,
  text: string,
  y: number,
  size: number,
  font: PDFFont,
  maxWidth: number,
) {
  let nextSize = size;
  const safe = winAnsi(text);
  while (nextSize > 6 && font.widthOfTextAtSize(safe, nextSize) > maxWidth) {
    nextSize -= 0.25;
  }
  const width = font.widthOfTextAtSize(safe, nextSize);
  page.drawText(safe, {
    x: (PAGE_WIDTH - width) / 2,
    y,
    size: nextSize,
    font,
    color: pdfColor("#1B2A41"),
  });
}

function drawLetterhead(
  page: PDFPage,
  bold: PDFFont,
  ppImage: PDFImage,
  goImage: PDFImage,
) {
  const top = PAGE_HEIGHT - LETTERHEAD_TOP;
  const y = top - LETTERHEAD_LOGO;
  const ppWidth = (ppImage.width / ppImage.height) * LETTERHEAD_LOGO;
  const goWidth = (goImage.width / goImage.height) * LETTERHEAD_LOGO;

  page.drawImage(ppImage, {
    x: MARGIN,
    y,
    width: ppWidth,
    height: LETTERHEAD_LOGO,
  });
  page.drawImage(goImage, {
    x: PAGE_WIDTH - MARGIN - goWidth,
    y,
    width: goWidth,
    height: LETTERHEAD_LOGO,
  });

  const maxWidth = PAGE_WIDTH - MARGIN * 2 - ppWidth - goWidth - 20;
  const firstBaseline = y + 45;
  drawCentered(page, "Governo de Goiás", firstBaseline, 12, bold, maxWidth);
  drawCentered(
    page,
    "Diretoria Geral de Polícia Penal",
    firstBaseline - 15,
    10,
    bold,
    maxWidth,
  );
  drawCentered(
    page,
    "SEÇÃO INTEGRADA DE MONITORAÇÃO ELETRÔNICA",
    firstBaseline - 34,
    8,
    bold,
    maxWidth,
  );

  const ruleY = y - LETTERHEAD_RULE;
  page.drawLine({
    start: { x: MARGIN, y: ruleY },
    end: { x: PAGE_WIDTH - MARGIN, y: ruleY },
    thickness: 1.25,
    color: pdfColor("#009739"),
  });
}

function emissionLabel(date: Date) {
  const parts = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const pick = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `Emitido em ${pick("day")} de ${pick("month")} de ${pick("year")}, às ${pick("hour")}h${pick("minute")}.`;
}

export async function buildTrackingReportPdf(input: TrackingReportInput) {
  const episodes = violationNarratives(input.narrative);
  const sections = (episodes.length > 0 ? episodes : [input.narrative])
    .map((narrative) => reportStops(narrative))
    .filter((stops) => stops.length > 0);
  if (sections.length === 0) {
    throw new Error("Não há registros para o relatório");
  }

  const mapPngs: Uint8Array[] = [];
  for (const stops of sections) {
    mapPngs.push(await renderMap(stops));
  }
  const [ppBytes, goBytes] = await Promise.all([
    loadAsset("/logopp.png"),
    loadAsset("/logoGoias.jpeg"),
  ]);
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const mapImages = await Promise.all(mapPngs.map((png) => pdf.embedPng(png)));
  const ppImage = await pdf.embedPng(ppBytes);
  const goImage = await pdf.embedJpg(goBytes);
  const emitted = emissionLabel(new Date());

  const contentWidth = PAGE_WIDTH - MARGIN * 2;
  const contentTop =
    PAGE_HEIGHT - LETTERHEAD_TOP - LETTERHEAD_LOGO - LETTERHEAD_RULE - 18;
  const pages: PDFPage[] = [];

  const addPage = () => {
    const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    drawLetterhead(page, bold, ppImage, goImage);
    pages.push(page);
    return { page, y: contentTop };
  };

  const ensure = (cursor: Cursor, needed: number) => {
    if (cursor.y - needed >= 48) return cursor;
    return addPage();
  };

  let cursor = addPage();
  const title = "Relatório de Violação";
  const titleSize = 16;
  const titleWidth = bold.widthOfTextAtSize(winAnsi(title), titleSize);
  cursor.page.drawText(winAnsi(title), {
    x: (PAGE_WIDTH - titleWidth) / 2,
    y: cursor.y - 16,
    size: titleSize,
    font: bold,
    color: pdfColor("#1B2A41"),
  });
  cursor.y -= 34;

  const headerFields = [
    { label: "Preso", value: input.order.inmateName },
    { label: "Vítima", value: input.order.victimName },
    { label: "Processo", value: input.order.judicialRef || "não informado" },
    { label: "Período", value: periodLabel(input.from, input.to) },
    { label: "Raio da medida", value: `${input.order.radiusMeters} m` },
    { label: "Área de atenção", value: `${input.order.watchRadiusMeters} m` },
  ];
  const valueX =
    MARGIN +
    18 +
    Math.max(
      ...headerFields.map((field) =>
        bold.widthOfTextAtSize(winAnsi(`${field.label}:`), 10),
      ),
    );
  for (const field of headerFields) {
    const lines = wrapText(field.value, regular, 10, PAGE_WIDTH - MARGIN - valueX);
    cursor.page.drawText(winAnsi(`${field.label}:`), {
      x: MARGIN,
      y: cursor.y - 11,
      size: 10,
      font: bold,
      color: rgb(0.15, 0.17, 0.22),
    });
    lines.forEach((line, index) => {
      cursor.page.drawText(line, {
        x: valueX,
        y: cursor.y - 11 - index * 13,
        size: 10,
        font: regular,
        color: rgb(0.15, 0.17, 0.22),
      });
    });
    cursor.y -= Math.max(1, lines.length) * 14;
  }

  cursor.y -= 18;

  for (let index = 0; index < sections.length; index += 1) {
    const stops = sections[index];
    const mapImage = mapImages[index];
    const mapWidth = contentWidth;
    const mapHeight = (mapImage.height / mapImage.width) * mapWidth;
    const heading = episodes.length > 0 ? `Violação ${index + 1}` : null;
    const headingHeight = heading ? 22 : 0;
    cursor = ensure(cursor, headingHeight + mapHeight + 28);
    if (heading) {
      cursor.page.drawText(heading, {
        x: MARGIN,
        y: cursor.y - 12,
        size: 12,
        font: bold,
        color: pdfColor("#1B2A41"),
      });
      cursor.y -= headingHeight;
    }
    cursor.page.drawImage(mapImage, {
      x: MARGIN,
      y: cursor.y - mapHeight,
      width: mapWidth,
      height: mapHeight,
    });
    cursor.y -= mapHeight + 14;

    const legend = [
      { label: "Atenção", color: ZONE_COLOR.WATCH },
      { label: "Violação", color: ZONE_COLOR.VIOLATION },
      { label: "Fora da área", color: ZONE_COLOR.OUTSIDE },
      { label: "Vítima", color: VICTIM_COLOR },
    ];
    let legendX = MARGIN;
    for (const item of legend) {
      cursor.page.drawRectangle({
        x: legendX,
        y: cursor.y - 8,
        width: 8,
        height: 8,
        color: pdfColor(item.color),
      });
      cursor.page.drawText(item.label, {
        x: legendX + 12,
        y: cursor.y - 8,
        size: 8,
        font: regular,
        color: rgb(0.2, 0.22, 0.27),
      });
      legendX += 12 + regular.widthOfTextAtSize(item.label, 8) + 16;
    }
    cursor.y -= 22;
    const caption =
      "Cada número é um registro. O número fica no preso quando ele se desloca e na vítima quando ela se desloca. A descrição correspondente está abaixo, na mesma ordem.";
    for (const line of wrapText(caption, regular, 8, contentWidth)) {
      cursor.page.drawText(line, {
        x: MARGIN,
        y: cursor.y - 9,
        size: 8,
        font: regular,
        color: rgb(0.4, 0.43, 0.48),
      });
      cursor.y -= 11;
    }
    cursor.y -= 8;

    for (const stop of stops) {
      const numberLabel = `${stop.number}.`;
      const numberWidth = bold.widthOfTextAtSize(numberLabel, 10);
      const textX = MARGIN + 18 + numberWidth;
      const lines = wrapText(stop.text, regular, 10, PAGE_WIDTH - MARGIN - textX);
      const noteLines = stop.notes.flatMap((note) =>
        wrapText(note, regular, 9, contentWidth - 22),
      );
      const block = 4 + lines.length * 13 + noteLines.length * 12 + 8;
      cursor = ensure(cursor, block);
      cursor.page.drawRectangle({
        x: MARGIN,
        y: cursor.y - 11,
        width: 8,
        height: 8,
        color: pdfColor(zoneFill(stop.zone)),
      });
      cursor.page.drawText(numberLabel, {
        x: MARGIN + 14,
        y: cursor.y - 12,
        size: 10,
        font: bold,
        color: pdfColor("#1B2A41"),
      });
      lines.forEach((line, lineIndex) => {
        cursor.page.drawText(line, {
          x: lineIndex === 0 ? textX : MARGIN + 14,
          y: cursor.y - 12,
          size: 10,
          font: regular,
          color: rgb(0.1, 0.12, 0.16),
        });
        cursor.y -= 13;
      });
      for (const line of noteLines) {
        cursor.page.drawText(line, {
          x: MARGIN + 14,
          y: cursor.y - 10,
          size: 9,
          font: regular,
          color: rgb(0.42, 0.45, 0.5),
        });
        cursor.y -= 12;
      }
      cursor.y -= 6;
    }
    cursor.y -= 10;
  }

  pages.forEach((page, index) => {
    drawFooter(page, regular, index + 1, pages.length, emitted);
  });

  return pdf.save();
}

export async function downloadTrackingReport(input: TrackingReportInput) {
  const bytes = await buildTrackingReportPdf(input);
  const copy = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
  const blob = new Blob([copy], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = trackingReportFilename(input);
  link.click();
  URL.revokeObjectURL(url);
}
