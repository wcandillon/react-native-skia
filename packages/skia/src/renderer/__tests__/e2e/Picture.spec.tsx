import React from "react";

import { importSkia, surface } from "../setup";
import {
  checkImage,
  docPath,
  itRunsE2eOnly,
  itRunsNodeOnly,
} from "../../../__tests__/setup";
import { Blur, Group, Paint, Picture } from "../../components";
import { AlphaType, BlendMode, ColorType } from "../../../skia/types";

import type { WorkletThread } from "./setup";
import { slowSvg, slowSvgSide } from "./setup";

describe("Pictures", () => {
  it("Should draw a simple picture", async () => {
    const image = await surface.drawOffscreen(
      (Skia, canvas, { size }) => {
        const recorder = Skia.PictureRecorder();
        const canvas2 = recorder.beginRecording(
          Skia.XYWHRect(0, 0, size, size)
        );
        canvas2.drawColor(Skia.Color("cyan"));
        const picture = recorder.finishRecordingAsPicture();
        canvas.drawPicture(picture);
      },
      { size: surface.width }
    );
    await checkImage(image, "snapshots/pictures/simple-picture.png");
  });
  itRunsNodeOnly("Should use createPicture", async () => {
    const { createPicture, Skia } = importSkia();
    const picture = createPicture((canvas) => {
      const size = 256;
      const r = 0.33 * size;
      const paint = Skia.Paint();
      paint.setBlendMode(BlendMode.Multiply);

      paint.setColor(Skia.Color("cyan"));
      canvas.drawCircle(r, r, r, paint);

      paint.setColor(Skia.Color("magenta"));
      canvas.drawCircle(size - r, r, r, paint);

      paint.setColor(Skia.Color("yellow"));
      canvas.drawCircle(size / 2, size - r, r, paint);
    });
    expect(picture).toBeDefined();
    const image = await surface.drawOffscreen(
      (_, canvas, ctx) => {
        canvas.drawPicture(ctx.picture);
      },
      { picture }
    );
    await checkImage(image, "snapshots/pictures/create-picture.png");
  });
  it("Should draw the hello world example as picture", async () => {
    const image = await surface.drawOffscreen(
      (Skia, canvas, ctx) => {
        const { size } = ctx;
        const r = size * 0.33;
        const recorder = Skia.PictureRecorder();
        const canvas2 = recorder.beginRecording(
          Skia.XYWHRect(0, 0, size, size)
        );
        const paint = Skia.Paint();
        paint.setBlendMode(ctx.BlendMode);
        paint.setColor(Skia.Color("cyan"));
        canvas2.drawCircle(r, r, r, paint);
        paint.setColor(Skia.Color("magenta"));
        canvas2.drawCircle(size - r, r, r, paint);
        paint.setColor(Skia.Color("yellow"));
        canvas2.drawCircle(size / 2, size - r, r, paint);
        const picture = recorder.finishRecordingAsPicture();
        canvas.drawPicture(picture);
      },
      { BlendMode: BlendMode.Multiply, size: surface.width }
    );
    await checkImage(image, "snapshots/pictures/hello-world.png");
  });
  it("Simple picture example", async () => {
    const img = await surface.drawOffscreen(
      (Skia, canvas, ctx) => {
        const { size } = ctx;
        const r = 0.33 * size;
        const recorder = Skia.PictureRecorder();
        const canvas2 = recorder.beginRecording(
          Skia.XYWHRect(0, 0, size, size)
        );
        const paint = Skia.Paint();
        paint.setBlendMode(ctx.BlendMode);

        paint.setColor(Skia.Color("cyan"));
        canvas2.drawCircle(r, r, r, paint);

        paint.setColor(Skia.Color("magenta"));
        canvas2.drawCircle(size - r, r, r, paint);

        paint.setColor(Skia.Color("yellow"));
        canvas2.drawCircle(size / 2, size - r, r, paint);
        const picture = recorder.finishRecordingAsPicture();
        canvas.drawPicture(picture);
      },
      { BlendMode: BlendMode.Multiply, size: surface.width }
    );
    await checkImage(img, docPath("simple-picture.png"));
  });
  it("throws when drawing on the canvas of a finished recording", async () => {
    // CanvasKit keeps the recorder's canvas around: nothing to observe on
    // node.
    if (surface.OS === "node") {
      return;
    }
    const result = await surface.eval((Skia) => {
      const recorder = Skia.PictureRecorder();
      const canvas = recorder.beginRecording(Skia.XYWHRect(0, 0, 16, 16));
      canvas.drawColor(Skia.Color("cyan"));
      const picture = recorder.finishRecordingAsPicture();
      let error: Error | null = null;
      try {
        canvas.drawColor(Skia.Color("cyan"));
      } catch (e) {
        error = e as Error;
      }
      picture.dispose();
      recorder.dispose();
      return error ? error.message : null;
    });
    expect(result).toContain("recording has finished");
  });
  itRunsE2eOnly(
    "finishing the recording on another runtime waits for the draw in flight on its canvas",
    async () => {
      const levels = 9;
      const result = await surface.eval(
        (Skia, ctx) => {
          // No async/await: the code runs through Hermes' eval on the device.
          const { workletThread } = ctx;
          const svg = Skia.SVG.MakeFromString(ctx.svg)!;
          const bounds = Skia.XYWHRect(0, 0, ctx.side, ctx.side);
          // How long the draw takes here, on a recording of this thread.
          const reference = Skia.PictureRecorder();
          const referenceStart = Date.now();
          reference.beginRecording(bounds).drawSvg(svg);
          const drawDuration = Date.now() - referenceStart;
          reference.dispose();
          const recorder = Skia.PictureRecorder();
          const canvas = recorder.beginRecording(bounds);
          return workletThread
            .finishRecordingDuring(recorder, drawDuration / 4, () =>
              canvas.drawSvg(svg)
            )
            .then(({ draw, finish, picture }) => {
              let next: string | null = null;
              try {
                canvas.drawSvg(svg);
              } catch (error) {
                next = (error as Error).message;
              }
              // The picture holds the whole draw: its last square fills the
              // corner.
              const replay = Skia.Surface.MakeRaster(ctx.side, ctx.side)!;
              replay.getCanvas().drawPicture(picture);
              return replay
                .makeImageSnapshot()
                .readPixels(ctx.side - 1, ctx.side - 1, {
                  width: 1,
                  height: 1,
                  ...ctx.pixel,
                })
                .then((corner) => {
                  replay.dispose();
                  picture.dispose();
                  recorder.dispose();
                  svg.dispose();
                  return { draw, finish, next, corner: Array.from(corner!) };
                });
            });
        },
        {
          svg: slowSvg(levels),
          side: slowSvgSide(levels),
          pixel: {
            colorType: ColorType.RGBA_8888,
            alphaType: AlphaType.Unpremul,
          },
        } as {
          svg: string;
          side: number;
          pixel: { colorType: ColorType; alphaType: AlphaType };
          workletThread: WorkletThread;
        }
      );
      // finishRecordingAsPicture() started while the draw was in flight, and
      // returned once the draw had: it took about as long as what was left of
      // the draw.
      const left = result.draw.ended - result.finish.started;
      expect(left).toBeGreaterThan(0);
      expect(
        result.finish.ended - result.finish.started
      ).toBeGreaterThanOrEqual(left / 2);
      expect(result.corner).toEqual([0, 255, 255, 255]);
      expect(result.next).toContain("recording has finished");
    }
  );
  it("Should draw animated circle trail t=0", async () => {
    const n = 20;
    const progress = 0;
    const image = await surface.drawOffscreen(
      (Skia, canvas, ctx) => {
        const { size } = ctx;
        const recorder = Skia.PictureRecorder();
        const canvas2 = recorder.beginRecording(
          Skia.XYWHRect(0, 0, size, size)
        );
        const paint = Skia.Paint();
        const numberOfCircles = Math.floor(ctx.progress * ctx.n);
        for (let i = 0; i < numberOfCircles; i++) {
          const alpha = ((i + 1) / ctx.n) * 255;
          const r = ((i + 1) / ctx.n) * (size / 2);
          paint.setColor(Skia.Color(`rgba(0, 122, 255, ${alpha / 255})`));
          canvas2.drawCircle(size / 2, size / 2, r, paint);
        }
        const picture = recorder.finishRecordingAsPicture();
        canvas.drawPicture(picture);
      },
      { size: surface.width, progress, n }
    );
    await checkImage(image, docPath("pictures/circle-trail-0.png"));
  });
  it("Should draw animated circle trail t=0.25", async () => {
    const n = 20;
    const progress = 0.25;
    const image = await surface.drawOffscreen(
      (Skia, canvas, ctx) => {
        const { size } = ctx;
        const recorder = Skia.PictureRecorder();
        const canvas2 = recorder.beginRecording(
          Skia.XYWHRect(0, 0, size, size)
        );
        const paint = Skia.Paint();
        const numberOfCircles = Math.floor(ctx.progress * ctx.n);
        for (let i = 0; i < numberOfCircles; i++) {
          const alpha = ((i + 1) / ctx.n) * 255;
          const r = ((i + 1) / ctx.n) * (size / 2);
          paint.setColor(Skia.Color(`rgba(0, 122, 255, ${alpha / 255})`));
          canvas2.drawCircle(size / 2, size / 2, r, paint);
        }
        const picture = recorder.finishRecordingAsPicture();
        canvas.drawPicture(picture);
      },
      { size: surface.width, progress, n }
    );
    await checkImage(image, docPath("pictures/circle-trail-0.25.png"));
  });
  it("Should draw animated circle trail t=0.5", async () => {
    const n = 20;
    const progress = 0.5;
    const image = await surface.drawOffscreen(
      (Skia, canvas, ctx) => {
        const { size } = ctx;
        const recorder = Skia.PictureRecorder();
        const canvas2 = recorder.beginRecording(
          Skia.XYWHRect(0, 0, size, size)
        );
        const paint = Skia.Paint();
        const numberOfCircles = Math.floor(ctx.progress * ctx.n);
        for (let i = 0; i < numberOfCircles; i++) {
          const alpha = ((i + 1) / ctx.n) * 255;
          const r = ((i + 1) / ctx.n) * (size / 2);
          paint.setColor(Skia.Color(`rgba(0, 122, 255, ${alpha / 255})`));
          canvas2.drawCircle(size / 2, size / 2, r, paint);
        }
        const picture = recorder.finishRecordingAsPicture();
        canvas.drawPicture(picture);
      },
      { size: surface.width, progress, n }
    );
    await checkImage(image, docPath("pictures/circle-trail-0.5.png"));
  });
  it("Should draw animated circle trail t=0.75", async () => {
    const n = 20;
    const progress = 0.75;
    const image = await surface.drawOffscreen(
      (Skia, canvas, ctx) => {
        const { size } = ctx;
        const recorder = Skia.PictureRecorder();
        const canvas2 = recorder.beginRecording(
          Skia.XYWHRect(0, 0, size, size)
        );
        const paint = Skia.Paint();
        const numberOfCircles = Math.floor(ctx.progress * ctx.n);
        for (let i = 0; i < numberOfCircles; i++) {
          const alpha = ((i + 1) / ctx.n) * 255;
          const r = ((i + 1) / ctx.n) * (size / 2);
          paint.setColor(Skia.Color(`rgba(0, 122, 255, ${alpha / 255})`));
          canvas2.drawCircle(size / 2, size / 2, r, paint);
        }
        const picture = recorder.finishRecordingAsPicture();
        canvas.drawPicture(picture);
      },
      { size: surface.width, progress, n }
    );
    await checkImage(image, docPath("pictures/circle-trail-0.75.png"));
  });
  it("Should draw animated circle trail t=1", async () => {
    const n = 20;
    const progress = 0.75;
    const image = await surface.drawOffscreen(
      (Skia, canvas, ctx) => {
        const { size } = ctx;
        const recorder = Skia.PictureRecorder();
        const canvas2 = recorder.beginRecording(
          Skia.XYWHRect(0, 0, size, size)
        );
        const paint = Skia.Paint();
        const numberOfCircles = Math.floor(ctx.progress * ctx.n);
        for (let i = 0; i < numberOfCircles; i++) {
          const alpha = ((i + 1) / ctx.n) * 255;
          const r = ((i + 1) / ctx.n) * (size / 2);
          paint.setColor(Skia.Color(`rgba(0, 122, 255, ${alpha / 255})`));
          canvas2.drawCircle(size / 2, size / 2, r, paint);
        }
        const picture = recorder.finishRecordingAsPicture();
        canvas.drawPicture(picture);
      },
      { size: surface.width, progress, n }
    );
    await checkImage(image, docPath("pictures/circle-trail-1.png"));
  });
  it("Should serialize and deserialize a picture (1)", async () => {
    const image = await surface.drawOffscreen((Skia, mainCanvas) => {
      const recorder = Skia.PictureRecorder();
      const canvas = recorder.beginRecording();

      const size = 256;
      const r = 0.33 * size;
      const paint = Skia.Paint();
      paint.setBlendMode(24);

      paint.setColor(Skia.Color("cyan"));
      canvas.drawCircle(r, r, r, paint);

      paint.setColor(Skia.Color("magenta"));
      canvas.drawCircle(size - r, r, r, paint);

      paint.setColor(Skia.Color("yellow"));
      canvas.drawCircle(size / 2, size - r, r, paint);
      const picture = recorder.finishRecordingAsPicture();
      const serialized = picture.serialize();
      const deserialized = Skia.Picture.Make(serialized);
      mainCanvas.drawPicture(deserialized!);
    });
    await checkImage(image, "snapshots/pictures/create-picture.png");
  });
  it("Should serialize and deserialize a picture (2)", async () => {
    const image = await surface.drawOffscreen((Skia, mainCanvas) => {
      const recorder = Skia.PictureRecorder();
      const canvas = recorder.beginRecording();

      const size = 256;
      const r = 0.33 * size;
      const paint = Skia.Paint();
      paint.setBlendMode(24);

      paint.setColor(Skia.Color("cyan"));
      canvas.drawCircle(r, r, r, paint);

      paint.setColor(Skia.Color("magenta"));
      canvas.drawCircle(size - r, r, r, paint);

      paint.setColor(Skia.Color("yellow"));
      canvas.drawCircle(size / 2, size - r, r, paint);
      const picture = recorder.finishRecordingAsPicture();
      const serialized = picture.serialize()!;
      const deserialized = Skia.Picture.Make(serialized.buffer as ArrayBuffer);
      mainCanvas.drawPicture(deserialized!);
    });
    await checkImage(image, "snapshots/pictures/create-picture.png");
  });
  itRunsNodeOnly("Blur Picture", async () => {
    const { Skia, createPicture } = importSkia();
    const picture = createPicture((canvas) => {
      const size = 256;
      const r = 0.33 * size;
      const paint = Skia.Paint();
      paint.setBlendMode(BlendMode.Multiply);

      paint.setColor(Skia.Color("cyan"));
      canvas.drawCircle(r, r, r, paint);

      paint.setColor(Skia.Color("magenta"));
      canvas.drawCircle(size - r, r, r, paint);

      paint.setColor(Skia.Color("yellow"));
      canvas.drawCircle(size / 2, size - r, r, paint);
    });

    const img = await surface.draw(
      <>
        <Group
          layer={
            <Paint>
              <Blur blur={10} />
            </Paint>
          }
        >
          <Picture picture={picture} />
        </Group>
      </>
    );
    await checkImage(img, docPath("blurred-picture.png"));
  });
});
