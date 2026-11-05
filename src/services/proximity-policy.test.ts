import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  assessDeviceSignal,
  decideFoundGeofence,
  intervalAfterAbsence,
  isVictimFixStale,
  shouldPersistVictimFix,
  stateAfterAbsence,
  zoneFromLookup,
} from "./proximity-policy";

const now = new Date("2026-11-04T18:00:00.000Z");

describe("fix da vítima", () => {
  it("recusa precisão ruim", () => {
    assert.equal(
      isVictimFixStale({ accuracyMeters: 800, recordedAt: now, now }),
      true,
    );
  });

  it("aceita coordenada recente", () => {
    assert.equal(
      isVictimFixStale({
        accuracyMeters: 20,
        recordedAt: new Date(now.getTime() - 30_000),
        now,
      }),
      false,
    );
  });
});

describe("ausência no Guardião", () => {
  it("não encerra violação", () => {
    assert.equal(stateAfterAbsence("VIOLATING"), "VIOLATING");
    assert.equal(intervalAfterAbsence("VIOLATING"), 10);
  });

  it("trata medida segura como fora da janela", () => {
    assert.equal(stateAfterAbsence("SAFE"), "SAFE");
    assert.equal(intervalAfterAbsence("SAFE"), 30);
    assert.equal(
      zoneFromLookup({
        lookupStatus: "OUT_OF_WINDOW",
        geofenceState: "SAFE",
        distanceMeters: 40,
        radiusMeters: 300,
        watchRadiusMeters: 1000,
      }),
      "clear",
    );
  });
});

describe("gravação e intervalo com o preso na lista", () => {
  it("não grava coordenada fora da área de atenção", () => {
    assert.equal(shouldPersistVictimFix(1500, 1000, false), false);
  });

  it("grava dentro da área e aperta o intervalo na violação", () => {
    const decision = decideFoundGeofence({
      radiusMeters: 300,
      watchRadiusMeters: 1000,
      distanceMeters: 120,
      currentState: "SAFE",
      pendingCount: 0,
    });
    assert.equal(decision.nextState, "VIOLATING");
    assert.equal(decision.persistFix, true);
    assert.equal(decision.nextCheckSeconds, 5);
    assert.equal(decision.shouldOpenAlert, true);
  });

  it("pede 10 segundos quando o preso está na lista e fora do raio", () => {
    const decision = decideFoundGeofence({
      radiusMeters: 300,
      watchRadiusMeters: 1000,
      distanceMeters: 1400,
      currentState: "SAFE",
      pendingCount: 0,
    });
    assert.equal(decision.nextState, "SAFE");
    assert.equal(decision.persistFix, false);
    assert.equal(decision.nextCheckSeconds, 10);
  });
});

describe("sinal do aparelho", () => {
  it("separa silêncio, GPS parado e permissão negada", () => {
    assert.equal(
      assessDeviceSignal({
        now,
        lastContactAt: new Date(now.getTime() - 10 * 60_000),
        lastGpsAt: now,
        expectedSeconds: 30,
        backgroundEnabled: true,
      }),
      "no_signal",
    );
    assert.equal(
      assessDeviceSignal({
        now,
        lastContactAt: now,
        lastGpsAt: new Date(now.getTime() - 10 * 60_000),
        expectedSeconds: 30,
        backgroundEnabled: true,
      }),
      "stale_gps",
    );
    assert.equal(
      assessDeviceSignal({
        now,
        lastContactAt: now,
        lastGpsAt: now,
        expectedSeconds: 30,
        backgroundEnabled: false,
      }),
      "no_background",
    );
  });
});
