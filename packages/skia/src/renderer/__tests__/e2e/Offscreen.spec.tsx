import React from "react";

import { checkImage, docPath, itRunsE2eOnly } from "../../../__tests__/setup";
import { AlphaType, ColorType } from "../../../skia/types";
import { Circle } from "../../components";
import { nameColor, surface, importSkia } from "../setup";

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
    const image = Skia.Image.MakeFromEncoded(data)!;
    expect(data).toBeDefined();
    await checkImage(image, docPath("offscreen/circle.png"));
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
    const image = Skia.Image.MakeFromEncoded(data)!;
    expect(data).toBeDefined();
    await checkImage(image, docPath("offscreen/circle.png"));
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
    const image = Skia.Image.MakeFromEncoded(data)!;
    expect(data).toBeDefined();
    await checkImage(image, docPath("offscreen/multiple_circles.png"));
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
    await checkImage(image!, docPath("offscreen/circle.png"));
  });
  itRunsE2eOnly(
    "Should draw what it still holds after its thread was idle long enough to trim",
    async () => {
      const size = 32;
      // No async/await: the code runs through Hermes' eval on the device.
      const raw = await surface.eval(
        (Skia, ctx) => {
          const source = Skia.Surface.MakeOffscreen(ctx.size, ctx.size)!;
          source.getCanvas().clear(Skia.Color("cyan"));
          source.flush();
          const shared = source.asImage();
          const snapshot = source.makeImageSnapshot();
          // A surface let go of has its thread trim its recorders two seconds
          // later (RNSkThreadPool::kIdleDelay), everything it can since the
          // thread is idle by then: the wait covers that delay.
          Skia.Surface.MakeOffscreen(ctx.size, ctx.size)!.dispose();
          return new Promise((resolve) => setTimeout(resolve, 3000)).then(
            () => {
              const target = Skia.Surface.MakeOffscreen(
                ctx.size * 3,
                ctx.size
              )!;
              const canvas = target.getCanvas();
              canvas.drawImage(shared, 0, 0);
              canvas.drawImage(snapshot, ctx.size, 0);
              target.flush();
              source.getCanvas().clear(Skia.Color("red"));
              source.flush();
              canvas.drawImage(source.makeImageSnapshot(), ctx.size * 2, 0);
              target.flush();
              return target.makeImageSnapshot().encodeToBase64();
            }
          );
        },
        { size }
      );
      const { Skia } = importSkia();
      const image = Skia.Image.MakeFromEncoded(Skia.Data.fromBase64(raw))!;
      const colorOfSquare = async (square: number) =>
        nameColor(
          await image.readPixels(square * size + size / 2, size / 2, {
            width: 1,
            height: 1,
            colorType: ColorType.RGBA_8888,
            alphaType: AlphaType.Unpremul,
          })
        );
      expect(await Promise.all([0, 1, 2].map(colorOfSquare))).toEqual([
        "cyan",
        "cyan",
        "red",
      ]);
    }
  );
});

describe("isOnMainThread", () => {
  itRunsE2eOnly(
    "is true on the UI thread and false on the JS thread",
    async () => {
      const image = await surface.screen("IsOnMainThread");
      const pixel = await image.readPixels(10, 10, {
        width: 1,
        height: 1,
        colorType: ColorType.RGBA_8888,
        alphaType: AlphaType.Unpremul,
      });
      expect(nameColor(pixel)).toBe("cyan");
    }
  );
});
