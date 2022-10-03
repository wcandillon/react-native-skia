import { processResult } from "../../__tests__/setup";

import { setupSkia } from "./setup";

describe("Paint", () => {
  it("should have anti-aliasing is true by default but the value be preserved when using copy()", () => {
    const { surface, canvas, Skia, width } = setupSkia();
    const size = width;
    const p1 = Skia.Paint();
    const rct = Skia.RRectXY(
      Skia.XYWHRect(0, 0, size, size),
      size / 4,
      size / 4
    );
    canvas.drawRRect(rct, p1);
    processResult(surface, "snapshots/drawings/rrect-aa.png");
    const p2 = Skia.Paint();
    p2.setAntiAlias(false);
    canvas.drawRRect(rct, p2);
    processResult(surface, "snapshots/drawings/rrect-no-aa.png");
    const p3 = p2.copy();
    canvas.drawRRect(rct, p3);
    processResult(surface, "snapshots/drawings/rrect-no-aa.png");
  });
});
