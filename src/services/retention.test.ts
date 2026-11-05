import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { victimLocationCutoff } from "./retention-window";

describe("retenção", () => {
  it("corta localizações com mais de 48 horas", () => {
    const now = new Date("2026-11-04T18:00:00.000Z");
    const cutoff = victimLocationCutoff(now, 48);
    assert.equal(cutoff.toISOString(), "2026-11-02T18:00:00.000Z");
  });
});
