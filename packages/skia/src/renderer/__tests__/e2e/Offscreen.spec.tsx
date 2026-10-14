import React from "react";

import { checkImage, docPath, itRunsE2eOnly } from "../../../__tests__/setup";
import { AlphaType, ColorType } from "../../../skia/types";
import { Circle } from "../../components";
import { surface, importSkia } from "../setup";

describe("Offscreen Drawings", () => {
  it("Should use the canvas API to build an image", async () => {
    const { width, height } = surface;
    const raw = await surface.eval(
      (Skia, ctx) => {
        const r = ctx.width / 2;
        const offscreen = Skia.Surface.MakeOffscreen(ctx.width, ctx.height)!;
        if (!offscreen) {
          throw new Error("Could not create offscreen surface");
        }
        const canvas = offscreen.getCanvas();
        const paint = Skia.Paint();
        paint.setColor(Skia.Color("lightblue"));
        canvas.drawCircle(r, r, r, paint);
        offscreen.flush();
        return offscreen.makeImageSnapshot().encodeToBase64();
      },
      { width, height }
    );
    const { Skia } = importSkia();
    const data = Skia.Data.fromBase64(raw);
    const image = Skia.Image.MakeImageFromEncoded(data)!;
    expect(data).toBeDefined();
    checkImage(image, docPath("offscreen/circle.png"));
  });
  it("Should transfer one surface image to another", async () => {
    const { width, height } = surface;
    const raw = await surface.eval(
      (Skia, ctx) => {
        const r = ctx.width / 2;
        const backSurface = Skia.Surface.MakeOffscreen(ctx.width, ctx.height)!;
        const frontSurface = Skia.Surface.MakeOffscreen(ctx.width, ctx.height)!;
        if (!backSurface || !frontSurface) {
          throw new Error("Could not create offscreen surface");
        }
        const canvas = backSurface.getCanvas();
        const paint = Skia.Paint();
        paint.setColor(Skia.Color("lightblue"));
        canvas.drawCircle(r, r, r, paint);
        backSurface.flush();
        const image = backSurface.makeImageSnapshot();
        frontSurface.getCanvas().drawImage(image, 0, 0);
        return frontSurface.makeImageSnapshot().encodeToBase64();
      },
      { width, height }
    );
    const { Skia } = importSkia();
    const data = Skia.Data.fromBase64(raw);
    const image = Skia.Image.MakeImageFromEncoded(data)!;
    expect(data).toBeDefined();
    checkImage(image, docPath("offscreen/circle.png"));
  });

  it("Should render to multiple offscreen surfaces at once (1)", async () => {
    const { width, height } = surface;
    const raw = await surface.eval(
      (Skia, ctx) => {
        const r = ctx.width / 4;
        const backSurface1 = Skia.Surface.MakeOffscreen(ctx.width, ctx.height)!;
        const backSurface2 = Skia.Surface.MakeOffscreen(ctx.width, ctx.height)!;
        const frontSurface = Skia.Surface.MakeOffscreen(ctx.width, ctx.height)!;
        if (!backSurface1 || !backSurface2 || !frontSurface) {
          throw new Error("Could not create offscreen surface");
        }
        // Paint to first surface
        const canvas1 = backSurface1.getCanvas();
        const paint1 = Skia.Paint();
        paint1.setColor(Skia.Color("lightblue"));
        canvas1.drawCircle(r, r, r, paint1);
        backSurface1.flush();

        // Paint to second surface
        const canvas2 = backSurface2.getCanvas();
        const paint2 = Skia.Paint();
        paint2.setColor(Skia.Color("magenta"));
        canvas2.drawCircle(r, r, r / 2, paint2);
        backSurface2.flush();

        const image1 = backSurface1.makeImageSnapshot();
        const image2 = backSurface2.makeImageSnapshot();
        frontSurface.getCanvas().drawImage(image1, 0, 0);
        frontSurface.getCanvas().drawImage(image2, ctx.width / 2, 0);
        return frontSurface.makeImageSnapshot().encodeToBase64();
      },
      { width, height }
    );
    const { Skia } = importSkia();
    const data = Skia.Data.fromBase64(raw);
    const image = Skia.Image.MakeImageFromEncoded(data)!;
    expect(data).toBeDefined();
    checkImage(image, docPath("offscreen/multiple_circles.png"));
  });
  it("Should use the React API to build an image", async () => {
    const { width, height } = surface;
    const { drawAsImage } = importSkia();
    const r = width / 2;
    const image = await drawAsImage(
      <Circle r={r} cx={r} cy={r} color="lightblue" />,
      { width, height }
    );
    expect(image).not.toBeNull();
    checkImage(image!, docPath("offscreen/circle.png"));
  });
});

// A snapshot's colour pipeline can move a channel by a few units, so the
// screen's cyan and red are read as colours rather than exact bytes.
const readScreenColor = (pixel: ArrayLike<number> | null) => {
  if (pixel === null) {
    return "unreadable";
  }
  const [red, green, blue] = Array.from(pixel);
  if (red < 60 && green > 200 && blue > 200) {
    return "cyan";
  }
  if (red > 200 && green < 60 && blue < 60) {
    return "red";
  }
  return `rgb(${red}, ${green}, ${blue})`;
};

describe("isOnMainThread", () => {
  itRunsE2eOnly(
    "is true on the UI thread and false on the JS thread",
    async () => {
      const image = await surface.screen("IsOnMainThread");
      const pixel = image.readPixels(10, 10, {
        width: 1,
        height: 1,
        colorType: ColorType.RGBA_8888,
        alphaType: AlphaType.Unpremul,
      });
      expect(readScreenColor(pixel)).toBe("cyan");
    }
  );
});
