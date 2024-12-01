import React from "react";

import { importSkia } from "../../renderer/__tests__/setup";
import { SkiaRoot } from "../Reconciler";

describe("Simple", () => {
  it("should have a simple render", () => {
    const { Skia } = importSkia();
    const root = new SkiaRoot();
    root.render(<skCircle r={10} />);
    const surface = Skia.Surface.Make(768, 768)!;
    expect(surface).toBeDefined();
    const canvas = surface.getCanvas();
    root.draw({ Skia, canvas });
  });
});
