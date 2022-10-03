import { processResult } from "../../__tests__/setup";
import { loadFont } from "../../renderer/__tests__/setup";

import { setupSkia } from "./setup";

describe("Text API", () => {
  it("Hello world text", () => {
    const { surface, canvas, Skia } = setupSkia();
    const paint = Skia.Paint();
    paint.setColor(Skia.Color("#16161d"));
    const font = loadFont("skia/__tests__/assets/Roboto-Medium.ttf", 32);
    canvas.drawColor(Skia.Color("white"));
    canvas.drawText("Hello World", 64, 64, paint, font);
    processResult(surface, "snapshots/drawings/hello-world.png");
  });

  it("can get the intercepts of glyphs", () => {
    const { Skia } = setupSkia();
    const font = loadFont("skia/__tests__/assets/Roboto-Medium.ttf");

    const ids = font.getGlyphIDs("I");
    expect(ids.length).toEqual(1);

    // aim for the middle of the I at 100 point, expecting a hit
    let sects = font.getGlyphIntercepts(ids, [Skia.Point(0, 0)], -60, -40);
    expect(sects.length).toEqual(2);

    // aim below the baseline where we expect no intercepts
    sects = font.getGlyphIntercepts(ids, [Skia.Point(0, 0)], 20, 30);
    expect(sects.length).toEqual(0);
  });
});
