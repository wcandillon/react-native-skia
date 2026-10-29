import { itRunsE2eOnly } from "../../../__tests__/setup";
import { countColors, surface } from "../setup";

describe("Canvas onLayout on a device", () => {
  itRunsE2eOnly("receives the layout the canvas is laid out at", async () => {
    const counts = countColors(await surface.screen("OnLayout"));
    expect(counts.red).toBeGreaterThan(0);
    expect(counts.cyan).toBe(0);
  });
});
