import { itRunsE2eOnly } from "../../../__tests__/setup";
import { surface } from "../setup";

// Skia.gpu describes the GPU probed when the module was installed. The test
// devices have one; a device without one keeps the app running with blank
// canvases, which this suite cannot exercise.
describe("GPU info", () => {
  itRunsE2eOnly("reports the GPU Skia renders with", async () => {
    const gpu = await surface.eval((Skia) => ({ ...Skia.gpu }));
    expect(gpu.isAvailable).toBe(true);
    expect(gpu.error).toBeNull();
    expect(gpu.backend).toBe(surface.OS === "android" ? "Vulkan" : "Metal");
    expect(typeof gpu.device).toBe("string");
    expect(typeof gpu.description).toBe("string");
  });
});
