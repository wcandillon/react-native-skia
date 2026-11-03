import { itRunsE2eOnly } from "../../../__tests__/setup";
import { countColors, surface } from "../setup";

// The canvas resizes a few points per frame while it presents (see the Resize
// screens of the example app): the frame shown once it settles must be one
// recorded for the final size, not an earlier one stretched to it. The green
// square is 20 points a side whatever the size, so its share of the canvas
// tells the two apart.
describe("Canvas resize on a device", () => {
  itRunsE2eOnly("shows a frame recorded for the size it grew to", async () => {
    const counts = await countColors(await surface.screen("ResizeGrow"));
    const canvas = counts.red + counts.green;
    expect(canvas).toBeGreaterThan(0);
    // The canvas grew to cover its box.
    expect(counts.cyan).toBe(0);
    // 20 of 120 points a side: 1/36 of the canvas; a 60 point frame
    // stretched to it would show 1/9.
    expect(counts.green / canvas).toBeGreaterThan(1 / 36 - 0.01);
    expect(counts.green / canvas).toBeLessThan(1 / 36 + 0.02);
  });

  itRunsE2eOnly(
    "shows a frame recorded for the size it shrank to",
    async () => {
      const counts = await countColors(await surface.screen("ResizeShrink"));
      const canvas = counts.red + counts.green;
      expect(canvas).toBeGreaterThan(0);
      // The canvas shrank to a quarter of its box.
      expect(canvas / (canvas + counts.cyan)).toBeCloseTo(0.25, 1);
      // 20 of 60 points a side: 1/9 of the canvas; a 120 point frame
      // squeezed into it would show 1/36.
      expect(counts.green / canvas).toBeGreaterThan(1 / 9 - 0.02);
      expect(counts.green / canvas).toBeLessThan(1 / 9 + 0.03);
    }
  );
});
