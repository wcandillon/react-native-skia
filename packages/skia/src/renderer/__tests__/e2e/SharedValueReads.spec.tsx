import { itRunsE2eOnly } from "../../../__tests__/setup";
import { countColors, surface } from "../setup";

describe("Shared value reads on a device", () => {
  itRunsE2eOnly(
    "draws the current values in a snapshot and survives an invalid value",
    async () => {
      const counts = await countColors(
        await surface.screen("SharedValueReads")
      );
      // The blue rect is drawn once its shared value is valid: the invalid
      // value it held at mount was reported, not fatal, and did not stop
      // the mapper from reading the valid one.
      expect(counts.blue).toBeGreaterThan(0);
      // The snapshot taken in the commit that added the red rect shows it:
      // the two canvases hold as much red as the third holds blue.
      expect(counts.red).toBeGreaterThan(counts.blue * 1.8);
      expect(counts.red).toBeLessThan(counts.blue * 2.2);
    }
  );
});
