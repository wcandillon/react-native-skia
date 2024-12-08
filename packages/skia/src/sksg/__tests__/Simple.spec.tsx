import React from "react";

import { importSkia } from "../../renderer/__tests__/setup";
import { SkiaRoot } from "../Reconciler";
import { checkImage } from "../../__tests__/setup";
import { DrawingContext } from "../Node";

describe("Simple", () => {
  it("should have a simple render", () => {
    const { Skia } = importSkia();
    const root = new SkiaRoot();
    root.render(<skCircle r={128} color="cyan" />);
    const surface = Skia.Surface.Make(768, 768)!;
    expect(surface).toBeDefined();
    const canvas = surface.getCanvas();
    root.draw(new DrawingContext(Skia, canvas));
    surface.flush();
    const image = surface.makeImageSnapshot();
    expect(image).toBeDefined();
    checkImage(image, "snapshots/sksg/simple.png");
  });
});
