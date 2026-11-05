import { trackingConfig } from "@/config/tracking";
import { shouldStoreTrackingPoint } from "@/services/tracking-plan";
import type { TrackingZone, ViolationRuling } from "@/generated/prisma/client";
import { haversineDistanceMeters } from "@/lib/geo";
import {
  APPROACH_METERS,
  classifyMovement,
  describePositions,
  placePhrase,
  timedDescription,
} from "@/lib/position-description";
import { enqueueGeocode } from "@/lib/geocode-queue";
import { reverseGeocode } from "@/lib/reverse-geocode";
import { ConflictError } from "@/lib/errors";
import {
  episodeOverlapsRange,
  workDayRange,
} from "@/lib/work-day";
import {
  createTrackingPoint,
  findFirstTrackingPoint,
  findLastTrackingPoint,
  findTrackingPoint,
  findTrackingPointAfter,
  findTrackingPointBefore,
  deleteTrackingPointsInRange,
  listLatestPointsBefore,
  listTrackingPointsInRange,
  updateTrackingPointPlaces,
} from "@/repositories/tracking-point.repository";
import {
  listViolationReviews,
  saveViolationReview,
} from "@/repositories/violation-review.repository";

const SAO_PAULO = "America/Sao_Paulo";

export type TrackingSummary = {
  orderId: string;
  judicialRef: string | null;
  victimName: string;
  inmateName: string;
  radiusMeters: number;
  watchRadiusMeters: number;
  pointCount: number;
  firstAt: string;
  lastAt: string;
  minDistanceMeters: number;
  closestAt: string;
  hadViolation: boolean;
  violationCount: number;
  pendingViolations: number;
};

export type TrackingNarrative = {
  id: string;
  kind: "point" | "still";
  recordedAt: string;
  zone: TrackingZone | null;
  distanceMeters: number | null;
  text: string;
  victim: { latitude: number; longitude: number } | null;
  inmate: { latitude: number; longitude: number } | null;
};

type RecordInput = {
  protectionOrderId: string;
  recordedAt: Date;
  distanceMeters: number;
  radiusMeters: number;
  watchRadiusMeters: number;
  geofenceViolating: boolean;
  previousDistanceMeters: number | null;
  victimLatitude: number;
  victimLongitude: number;
  inmateLatitude: number;
  inmateLongitude: number;
};

function resolveZone(input: RecordInput): TrackingZone {
  if (input.distanceMeters > input.watchRadiusMeters) return "OUTSIDE";
  if (input.geofenceViolating || input.distanceMeters <= input.radiusMeters) {
    return "VIOLATION";
  }
  return "WATCH";
}

function movedMeters(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
) {
  return haversineDistanceMeters(fromLat, fromLng, toLat, toLng);
}

export async function recordTrackingPoint(input: RecordInput) {
  const zone = resolveZone(input);
  const last = await findLastTrackingPoint(input.protectionOrderId);
  const inmateMoved =
    !last ||
    movedMeters(
      last.inmateLatitude,
      last.inmateLongitude,
      input.inmateLatitude,
      input.inmateLongitude,
    ) >= trackingConfig.movementMeters;
  const victimMoved =
    !last ||
    movedMeters(
      last.victimLatitude,
      last.victimLongitude,
      input.victimLatitude,
      input.victimLongitude,
    ) >= trackingConfig.movementMeters;

  if (
    !shouldStoreTrackingPoint({
      zone,
      lastZone: last?.zone ?? null,
      lastRecordedAt: last?.recordedAt ?? null,
      recordedAt: input.recordedAt,
      previousDistanceMeters: input.previousDistanceMeters,
      watchRadiusMeters: input.watchRadiusMeters,
      inmateMoved,
      victimMoved,
    })
  ) {
    return null;
  }

  const point = await createTrackingPoint({
    protectionOrderId: input.protectionOrderId,
    recordedAt: input.recordedAt,
    zone,
    distanceMeters: input.distanceMeters,
    victimLatitude: input.victimLatitude,
    victimLongitude: input.victimLongitude,
    inmateLatitude: input.inmateLatitude,
    inmateLongitude: input.inmateLongitude,
    radiusMeters: input.radiusMeters,
    watchRadiusMeters: input.watchRadiusMeters,
  });

  void fillPlaces(point.id, input).catch((error) => {
    console.error("[tracking] falha ao identificar a rua", error);
  });

  return point;
}

async function fillPlaces(id: string, input: RecordInput) {
  const inmatePlace = await enqueueGeocode(() =>
    reverseGeocode(input.inmateLatitude, input.inmateLongitude),
  );
  const victimPlace = await enqueueGeocode(() =>
    reverseGeocode(input.victimLatitude, input.victimLongitude),
  );
  if (!inmatePlace && !victimPlace) return;
  await updateTrackingPointPlaces(id, { inmatePlace, victimPlace });
}

function saoPauloDay(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: SAO_PAULO,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function rangeFromDates(from?: string, to?: string) {
  const today = saoPauloDay(new Date());
  const startDay = from || today;
  const endDay = to || startDay;
  return {
    from: new Date(`${startDay}T00:00:00.000-03:00`),
    to: new Date(`${endDay}T23:59:59.999-03:00`),
    fromDay: startDay,
    toDay: endDay,
  };
}

function clock(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: SAO_PAULO,
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

type PointRow = Awaited<ReturnType<typeof listTrackingPointsInRange>>[number];

function describePoint(point: PointRow, previous: PointRow | null) {
  const current = {
    victim: {
      latitude: point.victimLatitude,
      longitude: point.victimLongitude,
    },
    inmate: {
      latitude: point.inmateLatitude,
      longitude: point.inmateLongitude,
    },
  };
  const before = previous
    ? {
        victim: {
          latitude: previous.victimLatitude,
          longitude: previous.victimLongitude,
        },
        inmate: {
          latitude: previous.inmateLatitude,
          longitude: previous.inmateLongitude,
        },
      }
    : null;

  const victimStill =
    before != null &&
    haversineDistanceMeters(
      before.victim.latitude,
      before.victim.longitude,
      current.victim.latitude,
      current.victim.longitude,
    ) < APPROACH_METERS;
  const inmateStill =
    before != null &&
    haversineDistanceMeters(
      before.inmate.latitude,
      before.inmate.longitude,
      current.inmate.latitude,
      current.inmate.longitude,
    ) < APPROACH_METERS;

  return timedDescription(
    clock(point.recordedAt),
    describePositions({
      inmateWhere: placePhrase(
        point.inmatePlace,
        point.inmateLatitude,
        point.inmateLongitude,
      ),
      victimWhere: placePhrase(
        point.victimPlace,
        point.victimLatitude,
        point.victimLongitude,
      ),
      distanceMeters: point.distanceMeters,
      tense: "past",
      movement: classifyMovement(before, current),
      zone: point.zone,
      previousZone: previous?.zone ?? null,
      victimStill,
      inmateStill,
    }),
  );
}

export type EpisodeCause = "inmate" | "victim" | "both" | "unclear";

export type ViolationEpisode = {
  entryPointId: string;
  orderId: string;
  judicialRef: string | null;
  victimName: string;
  inmateName: string;
  startedAt: string;
  endedAt: string;
  ongoing: boolean;
  minDistanceMeters: number;
  cause: EpisodeCause;
  bothMoved: boolean;
  text: string;
};

function episodeReading(previous: PointRow | null, entry: PointRow) {
  if (!previous) return { cause: "unclear" as const, bothMoved: false };
  const movement = classifyMovement(
    {
      victim: {
        latitude: previous.victimLatitude,
        longitude: previous.victimLongitude,
      },
      inmate: {
        latitude: previous.inmateLatitude,
        longitude: previous.inmateLongitude,
      },
    },
    {
      victim: {
        latitude: entry.victimLatitude,
        longitude: entry.victimLongitude,
      },
      inmate: {
        latitude: entry.inmateLatitude,
        longitude: entry.inmateLongitude,
      },
    },
  );
  const bothMoved = movement.inmateMoved && movement.victimMoved;
  if (movement.approaching === "both") return { cause: "both" as const, bothMoved };
  if (movement.approaching === "inmate") return { cause: "inmate" as const, bothMoved };
  if (movement.approaching === "victim") return { cause: "victim" as const, bothMoved };
  return { cause: "unclear" as const, bothMoved };
}

/**
 * Ponto imediatamente anterior ao período, só para a medida que já abre em violação.
 * Sem ele, a primeira entrada do dia fica sem autor.
 */
async function openingPriors(points: PointRow[]) {
  const firstByOrder = new Map<string, PointRow>();
  for (const point of points) {
    if (!firstByOrder.has(point.protectionOrderId)) {
      firstByOrder.set(point.protectionOrderId, point);
    }
  }

  const priors = new Map<string, PointRow>();
  await Promise.all(
    [...firstByOrder.entries()].map(async ([orderId, point]) => {
      if (point.zone !== "VIOLATION") return;
      const prior = await findTrackingPointBefore(orderId, point.recordedAt);
      if (prior && prior.zone !== "VIOLATION") priors.set(orderId, prior);
    }),
  );
  return priors;
}

/** Um episódio por sequência contínua dentro do raio de violação, no período carregado. */
export function buildEpisodes(
  points: PointRow[],
  priors: Map<string, PointRow> = new Map(),
): ViolationEpisode[] {
  const byOrder = new Map<string, PointRow[]>();
  for (const point of points) {
    const list = byOrder.get(point.protectionOrderId) ?? [];
    list.push(point);
    byOrder.set(point.protectionOrderId, list);
  }

  const episodes: ViolationEpisode[] = [];
  for (const orderPoints of byOrder.values()) {
    let start = -1;
    const close = (end: number) => {
      const entry = orderPoints[start];
      if (!entry) return;
      const previous =
        start > 0
          ? (orderPoints[start - 1] ?? null)
          : (priors.get(entry.protectionOrderId) ?? null);
      const slice = orderPoints.slice(start, end + 1);
      const minDistanceMeters = Math.min(
        ...slice.map((point) => point.distanceMeters),
      );
      episodes.push({
        entryPointId: entry.id,
        orderId: entry.protectionOrderId,
        judicialRef: entry.protectionOrder.judicialRef,
        victimName: entry.protectionOrder.victim.fullName,
        inmateName: entry.protectionOrder.inmate.fullName,
        startedAt: entry.recordedAt.toISOString(),
        endedAt: orderPoints[end]?.recordedAt.toISOString() ?? entry.recordedAt.toISOString(),
        ongoing: end === orderPoints.length - 1,
        minDistanceMeters,
        ...episodeReading(previous, entry),
        text: describePoint(entry, previous),
      });
      start = -1;
    };

    orderPoints.forEach((point, index) => {
      const inside = point.zone === "VIOLATION";
      if (inside && start < 0) start = index;
      if (!inside && start >= 0) close(index - 1);
    });
    if (start >= 0) close(orderPoints.length - 1);
  }

  return episodes.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}

function buildNarrative(points: PointRow[]): TrackingNarrative[] {
  const events: TrackingNarrative[] = [];

  for (let index = 0; index < points.length; index += 1) {
    const point = points[index];
    const previous = index > 0 ? points[index - 1] : null;

    if (
      previous &&
      point.recordedAt.getTime() - previous.recordedAt.getTime() >=
        trackingConfig.stillGapMs
    ) {
      events.push({
        id: `still-${previous.id}`,
        kind: "still",
        recordedAt: point.recordedAt.toISOString(),
        zone: previous.zone,
        distanceMeters: null,
        text: `Sem deslocamento relevante entre ${clock(previous.recordedAt)} e ${clock(point.recordedAt)}.`,
        victim: null,
        inmate: null,
      });
    }

    events.push({
      id: point.id,
      kind: "point",
      recordedAt: point.recordedAt.toISOString(),
      zone: point.zone,
      distanceMeters: point.distanceMeters,
      text: describePoint(point, previous),
      victim: {
        latitude: point.victimLatitude,
        longitude: point.victimLongitude,
      },
      inmate: {
        latitude: point.inmateLatitude,
        longitude: point.inmateLongitude,
      },
    });
  }

  return events;
}

export async function listTrackingReports(params: {
  q?: string;
  from?: string;
  to?: string;
}) {
  const range = rangeFromDates(params.from, params.to);
  const points = await listTrackingPointsInRange({
    from: range.from,
    to: range.to,
    q: params.q,
  });

  const grouped = new Map<string, TrackingSummary>();

  for (const point of points) {
    const current = grouped.get(point.protectionOrderId);
    if (!current) {
      grouped.set(point.protectionOrderId, {
        orderId: point.protectionOrderId,
        judicialRef: point.protectionOrder.judicialRef,
        victimName: point.protectionOrder.victim.fullName,
        inmateName: point.protectionOrder.inmate.fullName,
        radiusMeters: point.protectionOrder.radiusMeters,
        watchRadiusMeters: point.protectionOrder.watchRadiusMeters,
        pointCount: 1,
        firstAt: point.recordedAt.toISOString(),
        lastAt: point.recordedAt.toISOString(),
        minDistanceMeters: point.distanceMeters,
        closestAt: point.recordedAt.toISOString(),
        hadViolation: point.zone === "VIOLATION",
        violationCount: 0,
        pendingViolations: 0,
      });
      continue;
    }

    current.pointCount += 1;
    current.lastAt = point.recordedAt.toISOString();
    if (point.distanceMeters < current.minDistanceMeters) {
      current.minDistanceMeters = point.distanceMeters;
      current.closestAt = point.recordedAt.toISOString();
    }
    if (point.zone === "VIOLATION") current.hadViolation = true;
  }

  const episodes = buildEpisodes(points, await openingPriors(points));
  const reviews = await listViolationReviews(
    episodes.map((episode) => episode.entryPointId),
  );
  const reviewByEntry = new Map(
    reviews.map((review) => [review.entryPointId, review]),
  );
  for (const episode of episodes) {
    const summary = grouped.get(episode.orderId);
    if (!summary) continue;
    summary.violationCount += 1;
    if (!reviewByEntry.get(episode.entryPointId)?.finalizedAt) {
      summary.pendingViolations += 1;
    }
  }

  const reports = [...grouped.values()].sort((a, b) =>
    b.lastAt.localeCompare(a.lastAt),
  );

  return {
    from: range.fromDay,
    to: range.toDay,
    movementMeters: trackingConfig.movementMeters,
    reports,
  };
}

export async function deleteTrackingReport(params: {
  orderId: string;
  from?: string;
  to?: string;
}) {
  const range = rangeFromDates(params.from, params.to);
  const result = await deleteTrackingPointsInRange({
    protectionOrderId: params.orderId,
    from: range.from,
    to: range.to,
  });
  return { deleted: result.count };
}

export async function getTrackingReport(params: {
  orderId: string;
  from?: string;
  to?: string;
}) {
  const range = rangeFromDates(params.from, params.to);
  const points = await listTrackingPointsInRange({
    from: range.from,
    to: range.to,
    protectionOrderId: params.orderId,
  });

  const first = points[0];
  const header = first?.protectionOrder;
  if (!first || !header?.victim || !header.inmate) {
    return {
      from: range.fromDay,
      to: range.toDay,
      order: null,
      points: [],
      narrative: [],
    };
  }

  return {
    from: range.fromDay,
    to: range.toDay,
    order: {
      id: header.id,
      judicialRef: header.judicialRef,
      victimName: header.victim.fullName,
      inmateName: header.inmate.fullName,
      radiusMeters: header.radiusMeters,
      watchRadiusMeters: header.watchRadiusMeters,
    },
    points: points.map((point) => ({
      id: point.id,
      recordedAt: point.recordedAt.toISOString(),
      zone: point.zone,
      distanceMeters: point.distanceMeters,
      inmatePlace: point.inmatePlace,
      victimPlace: point.victimPlace,
      victim: {
        latitude: point.victimLatitude,
        longitude: point.victimLongitude,
      },
      inmate: {
        latitude: point.inmateLatitude,
        longitude: point.inmateLongitude,
      },
    })),
    narrative: buildNarrative(points),
  };
}

export type DiaryEntry = ViolationEpisode & {
  ruling: ViolationRuling | null;
  actions: string | null;
  finalized: boolean;
  finalizedAt: string | null;
  counts: boolean;
  pending: boolean;
};

type ResolvedEpisode = ViolationEpisode & { effectiveEnd: Date };

async function resolveEpisodeFromHint(
  orderId: string,
  hintAt: Date,
): Promise<ResolvedEpisode | null> {
  const lastOutsideBefore = await findTrackingPointBefore(orderId, hintAt, {
    not: "VIOLATION",
  });
  const entry = lastOutsideBefore
    ? await findTrackingPointAfter(
        orderId,
        lastOutsideBefore.recordedAt,
        "VIOLATION",
      )
    : await findFirstTrackingPoint(orderId, "VIOLATION");
  if (!entry) return null;

  const firstOutsideAfter = await findTrackingPointAfter(orderId, entry.recordedAt, {
    not: "VIOLATION",
  });
  const lastInside = firstOutsideAfter
    ? await findTrackingPointBefore(
        orderId,
        firstOutsideAfter.recordedAt,
        "VIOLATION",
      )
    : await findLastTrackingPoint(orderId);
  if (!lastInside || lastInside.zone !== "VIOLATION") return null;

  const ongoing = !firstOutsideAfter;
  const slice = await listTrackingPointsInRange({
    from: entry.recordedAt,
    to: lastInside.recordedAt,
    protectionOrderId: orderId,
  });
  const violationDistances = slice
    .filter((point) => point.zone === "VIOLATION")
    .map((point) => point.distanceMeters);

  return {
    entryPointId: entry.id,
    orderId: entry.protectionOrderId,
    judicialRef: entry.protectionOrder.judicialRef,
    victimName: entry.protectionOrder.victim.fullName,
    inmateName: entry.protectionOrder.inmate.fullName,
    startedAt: entry.recordedAt.toISOString(),
    endedAt: lastInside.recordedAt.toISOString(),
    ongoing,
    minDistanceMeters: Math.min(...violationDistances, entry.distanceMeters),
    ...episodeReading(lastOutsideBefore, entry),
    text: describePoint(entry, lastOutsideBefore),
    effectiveEnd: firstOutsideAfter?.recordedAt ?? new Date(),
  };
}

async function listWorkDayEpisodes(params: { q?: string; day?: string }) {
  const range = workDayRange(params.day);
  const points = await listTrackingPointsInRange({
    from: range.from,
    to: range.to,
    q: params.q,
    endExclusive: true,
  });
  const inWindow = buildEpisodes(points, await openingPriors(points));
  const openAtStart = await listLatestPointsBefore({
    before: range.from,
    q: params.q,
  });

  const hints = [
    ...inWindow.map((episode) => ({
      orderId: episode.orderId,
      hintAt: new Date(episode.startedAt),
    })),
    ...openAtStart
      .filter((point) => point.zone === "VIOLATION")
      .map((point) => ({
        orderId: point.protectionOrderId,
        hintAt: point.recordedAt,
      })),
  ];

  const resolved = await Promise.all(
    hints.map((hint) => resolveEpisodeFromHint(hint.orderId, hint.hintAt)),
  );

  const unique = new Map<string, ResolvedEpisode>();
  for (const episode of resolved) {
    if (!episode) continue;
    if (
      !episodeOverlapsRange(
        new Date(episode.startedAt),
        episode.effectiveEnd,
        range.from,
        range.to,
      )
    ) {
      continue;
    }
    unique.set(episode.entryPointId, episode);
  }

  return [...unique.values()].sort((a, b) =>
    b.startedAt.localeCompare(a.startedAt),
  );
}

export async function listDiary(params: {
  q?: string;
  day?: string;
}): Promise<DiaryEntry[]> {
  const episodes = await listWorkDayEpisodes(params);
  const reviews = await listViolationReviews(
    episodes.map((episode) => episode.entryPointId),
  );
  const reviewByEntry = new Map(
    reviews.map((review) => [review.entryPointId, review]),
  );

  return episodes.map((episode) => {
    const review = reviewByEntry.get(episode.entryPointId);
    const actions = review?.actions ?? null;
    const finalizedAt = review?.finalizedAt?.toISOString() ?? null;
    return {
      ...episode,
      ruling: review?.ruling ?? null,
      actions,
      finalized: Boolean(finalizedAt),
      finalizedAt,
      counts: true,
      pending: !finalizedAt,
    };
  });
}

export async function recordDiaryDecision(input: {
  entryPointId: string;
  actions: string | null;
  reviewedById: string;
  finalize?: boolean;
}) {
  const point = await findTrackingPoint(input.entryPointId);
  if (!point || point.zone !== "VIOLATION") return null;

  const episode = await resolveEpisodeFromHint(
    point.protectionOrderId,
    point.recordedAt,
  );
  if (!episode) return null;

  if (input.finalize && episode.ongoing) {
    throw new ConflictError(
      "A ocorrência ainda está em violação. Você pode anotar o andamento, mas só pode concluí-la quando ela terminar.",
    );
  }
  if (input.finalize && !input.actions?.trim()) {
    throw new ConflictError(
      "Preencha as ações tomadas para concluir a ocorrência.",
    );
  }

  return saveViolationReview({
    protectionOrderId: point.protectionOrderId,
    entryPointId: point.id,
    ruling: "COUNTS",
    actions: input.actions,
    reviewedById: input.reviewedById,
    ...(input.finalize ? { finalizedAt: new Date() } : {}),
  });
}
