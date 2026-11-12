import { itRunsE2eOnly } from "../../../__tests__/setup";
import { readScreenColor, surface } from "../setup";

// The RecreatedView screen puts a static canvas and a canvas drawing a
// shared value side by side, hides their row with display: none and shows it
// again: the canvases stay mounted while Fabric makes new native views for
// them.
describe("A canvas whose native view is recreated", () => {
  itRunsE2eOnly("draws its recording in the new view", async () => {
    const image = await surface.screen("RecreatedView");
    expect({
      canvas: await readScreenColor(image, 1 / 4),
      animatedCanvas: await readScreenColor(image, 3 / 4),
    }).toEqual({ canvas: "red", animatedCanvas: "cyan" });
  });
});
