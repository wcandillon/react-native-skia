import { itRunsE2eOnly } from "../../../__tests__/setup";
import { readScreenColor, surface } from "../setup";

describe("A Canvas whose ancestor goes display: none", () => {
  itRunsE2eOnly(
    "draws its unchanged scene after Fabric recreates its native view",
    async () => {
      const image = await surface.screen("DisplayNone");
      expect(await readScreenColor(image, 1 / 2)).toBe("red");
    }
  );
});
