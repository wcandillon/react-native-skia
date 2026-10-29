import { processResult } from "../../__tests__/setup";
import { TileMode } from "../types";

import { setupSkia } from "./setup";

describe("ImageFilter", () => {
  it("Blured lightblue circle", () => {
    const { surface, canvas, width, Skia } = setupSkia();
    const r = width / 2;
    const paint = Skia.Paint();
    paint.setAntiAlias(true);
    paint.setColor(Skia.Color("lightblue"));
    paint.setImageFilter(
      Skia.ImageFilter.MakeBlur(40, 40, TileMode.Clamp, null)
    );
    canvas.drawCircle(r, r, r, paint);
    processResult(surface, "snapshots/image-filter/blur.png");
  });
});
