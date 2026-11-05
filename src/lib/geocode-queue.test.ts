import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { enqueueGeocode } from "./geocode-queue";

describe("fila de geocódigo", () => {
  it("não deixa duas consultas ao mesmo tempo", async () => {
    let running = 0;
    let max = 0;
    const task = () =>
      new Promise<void>((resolve) => {
        running += 1;
        max = Math.max(max, running);
        setTimeout(() => {
          running -= 1;
          resolve();
        }, 20);
      });

    await Promise.all([enqueueGeocode(task), enqueueGeocode(task)]);
    assert.equal(max, 1);
  });
});
