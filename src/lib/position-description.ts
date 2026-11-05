import { haversineDistanceMeters } from "@/lib/geo";

/** Deslocamento mínimo para dizer que alguém se aproximou ou se afastou. */
export const APPROACH_METERS = 15;

export type Actor = "inmate" | "victim" | "both" | "none";

export type Movement = {
  approaching: Actor;
  receding: Actor;
  inmateMoved: boolean;
  victimMoved: boolean;
};

export type LatLng = {
  latitude: number;
  longitude: number;
};

export type ProximityZone = "VIOLATION" | "WATCH" | "OUTSIDE";

type Pair = {
  victim: LatLng;
  inmate: LatLng;
};

function actor(inmate: boolean, victim: boolean): Actor {
  if (inmate && victim) return "both";
  if (inmate) return "inmate";
  if (victim) return "victim";
  return "none";
}

/**
 * Compara cada um com o lugar onde o outro estava.
 * Quem não se moveu não entra na frase, mesmo se a distância cair.
 */
export function classifyMovement(previous: Pair | null, current: Pair): Movement {
  if (!previous) {
    return {
      approaching: "none",
      receding: "none",
      inmateMoved: false,
      victimMoved: false,
    };
  }

  const before = haversineDistanceMeters(
    previous.victim.latitude,
    previous.victim.longitude,
    previous.inmate.latitude,
    previous.inmate.longitude,
  );
  const inmateShift = haversineDistanceMeters(
    previous.inmate.latitude,
    previous.inmate.longitude,
    current.inmate.latitude,
    current.inmate.longitude,
  );
  const victimShift = haversineDistanceMeters(
    previous.victim.latitude,
    previous.victim.longitude,
    current.victim.latitude,
    current.victim.longitude,
  );
  const inmateTowardVictim = haversineDistanceMeters(
    current.inmate.latitude,
    current.inmate.longitude,
    previous.victim.latitude,
    previous.victim.longitude,
  );
  const victimTowardInmate = haversineDistanceMeters(
    current.victim.latitude,
    current.victim.longitude,
    previous.inmate.latitude,
    previous.inmate.longitude,
  );

  const inmateMoved = inmateShift >= APPROACH_METERS;
  const victimMoved = victimShift >= APPROACH_METERS;

  return {
    approaching: actor(
      inmateMoved && inmateTowardVictim <= before - APPROACH_METERS,
      victimMoved && victimTowardInmate <= before - APPROACH_METERS,
    ),
    receding: actor(
      inmateMoved && inmateTowardVictim >= before + APPROACH_METERS,
      victimMoved && victimTowardInmate >= before + APPROACH_METERS,
    ),
    inmateMoved,
    victimMoved,
  };
}

export function movementLead(movement: Movement) {
  const { approaching, receding } = movement;
  if (approaching === "both") return "O preso e a vítima se aproximaram";
  if (approaching === "inmate" && receding === "victim") {
    return "O preso se aproximou e a vítima se afastou";
  }
  if (approaching === "victim" && receding === "inmate") {
    return "A vítima se aproximou e o preso se afastou";
  }
  if (approaching === "inmate") return "O preso se aproximou da vítima";
  if (approaching === "victim") return "A vítima se aproximou do preso";
  if (receding === "both") return "O preso e a vítima se afastaram";
  if (receding === "inmate") return "O preso se afastou da vítima";
  if (receding === "victim") return "A vítima se afastou do preso";
  return null;
}

export function placePhrase(
  place: string | null | undefined,
  latitude: number,
  longitude: number,
) {
  if (!place) {
    return `em ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
  }
  if (
    /^(rua|avenida|av\.|travessa|alameda|rodovia|praça|praca|estrada|via)\b/i.test(
      place,
    )
  ) {
    return `na ${place}`;
  }
  return `em ${place}`;
}

export function zoneTransitionNote(
  previous: ProximityZone | null,
  current: ProximityZone,
) {
  if (!previous || previous === current) return null;
  if (current === "VIOLATION") return "A distância entrou no raio da violação";
  if (previous === "VIOLATION" && current === "WATCH") {
    return "A distância saiu da violação e ficou na área de atenção";
  }
  if (previous === "VIOLATION" && current === "OUTSIDE") {
    return "A distância saiu da violação e da área de atenção";
  }
  if (current === "WATCH" && previous === "OUTSIDE") {
    return "A distância entrou na área de atenção";
  }
  if (current === "OUTSIDE") return "A distância saiu da área de atenção";
  return null;
}

export function zoneSteadyNote(zone: ProximityZone) {
  if (zone === "VIOLATION") return "dentro do raio da medida protetiva";
  if (zone === "OUTSIDE") return "fora da área de atenção";
  return "na área de atenção";
}

export function describePositions(input: {
  inmateWhere: string;
  victimWhere: string | null;
  distanceMeters: number;
  tense: "present" | "past";
  movement: Movement;
  zone: ProximityZone;
  previousZone: ProximityZone | null;
  victimStill?: boolean;
  inmateStill?: boolean;
}) {
  const distance = Math.round(input.distanceMeters);
  const was = input.tense === "past" ? "estava" : "está";
  const transition = zoneTransitionNote(input.previousZone, input.zone);
  const steady = transition ? "" : `, ${zoneSteadyNote(input.zone)}`;
  const inmateSentence = input.inmateStill
    ? `Não houve movimentação do preso. A distância ficou em ${distance} m${steady}`
    : `O preso ${was} ${input.inmateWhere}, a ${distance} m da vítima${steady}`;
  const victimSentence = input.victimStill
    ? "Não houve movimentação da vítima"
    : input.victimWhere
      ? `A vítima ${was} ${input.victimWhere}`
      : null;
  const sentences = [
    movementLead(input.movement),
    transition,
    inmateSentence,
    victimSentence,
  ].filter((sentence): sentence is string => Boolean(sentence));

  return `${sentences.join(". ")}.`;
}

export function timedDescription(time: string | null, text: string) {
  if (!time) return text;
  return `${time} — ${text.charAt(0).toLowerCase()}${text.slice(1)}`;
}
