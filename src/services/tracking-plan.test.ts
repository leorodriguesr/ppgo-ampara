import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { shouldStoreTrackingPoint } from "./tracking-plan";

const now = new Date("2026-11-04T18:00:00.000Z");

describe("percurso", () => {
  it("grava a saída da área de atenção e ignora o restante fora dela", () => {
    assert.equal(
      shouldStoreTrackingPoint({
        zone: "OUTSIDE",
        lastZone: "WATCH",
        lastRecordedAt: new Date(now.getTime() - 60_000),
        recordedAt: now,
        previousDistanceMeters: 800,
        watchRadiusMeters: 1000,
        inmateMoved: false,
        victimMoved: false,
      }),
      true,
    );
    assert.equal(
      shouldStoreTrackingPoint({
        zone: "OUTSIDE",
        lastZone: "OUTSIDE",
        lastRecordedAt: new Date(now.getTime() - 60_000),
        recordedAt: now,
        previousDistanceMeters: 2000,
        watchRadiusMeters: 1000,
        inmateMoved: true,
        victimMoved: true,
      }),
      false,
    );
  });

  it("grava deslocamento dentro da violação", () => {
    assert.equal(
      shouldStoreTrackingPoint({
        zone: "VIOLATION",
        lastZone: "VIOLATION",
        lastRecordedAt: new Date(now.getTime() - 60_000),
        recordedAt: now,
        previousDistanceMeters: 100,
        watchRadiusMeters: 1000,
        inmateMoved: true,
        victimMoved: false,
      }),
      true,
    );
  });
});
