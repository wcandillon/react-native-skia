import path from "path";
import fs from "fs";

import { processResult } from "../../__tests__/setup";

import { setupSkia } from "./setup";

describe("Text API", () => {
  it("Hello world text", () => {
    const { surface, canvas, Skia } = setupSkia();
    const paint = Skia.Paint();
    paint.setColor(Skia.Color("#16161d"));
    const data = Skia.Data.fromBytes(
      fs.readFileSync(path.resolve(__dirname, "./assets/Roboto-Medium.ttf"))
    );
    const tf = Skia.Typeface.MakeFreeTypeFaceFromData(data);
    expect(tf).toBeDefined();
    const font = Skia.Font(tf!, 32);
    expect(font).toBeDefined();
    canvas.drawColor(Skia.Color("white"));
    canvas.drawText("Hello World", 64, 64, paint, font);
    processResult(surface, "snapshots/drawings/hello-world.png");
  });
});
