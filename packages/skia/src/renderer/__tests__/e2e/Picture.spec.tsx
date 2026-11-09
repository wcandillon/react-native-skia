import React from "react";

import { importSkia, surface } from "../setup";
import { checkImage, docPath, itRunsNodeOnly } from "../../../__tests__/setup";
import { Blur, Group, Paint, Picture } from "../../components";
import { BlendMode } from "../../../skia/types";

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
