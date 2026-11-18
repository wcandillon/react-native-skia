import { itFailsE2eOnly } from "../../../__tests__/setup";
import { readScreenColor, surface } from "../setup";

describe("A Canvas whose ancestor goes display: none", () => {
  // Known bug: the Canvas stays blank once Fabric recreates its native view.
  // Expected to fail until the fix lands, then switch back to itRunsE2eOnly.
  itFailsE2eOnly(
    "draws its unchanged scene after Fabric recreates its native view",
    async () => {
      const image = await surface.screen("DisplayNone");
      expect(await readScreenColor(image, 1 / 2)).toBe("red");
    }
  );
});
