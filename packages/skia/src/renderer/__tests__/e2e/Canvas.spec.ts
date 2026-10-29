import { checkImage } from "../../../__tests__/setup";
import { BlendMode, PointMode } from "../../../skia/types";
import { surface } from "../setup";

describe("SkCanvas", () => {
  it("drawPatch works with omitted and nullable optional arguments", async () => {
    const img = await surface.drawOffscreen(
      (Skia, canvas, ctx) => {
        const flatPatch = (x: number, y: number, size: number) => {
          const tl = { x, y };
          const tr = { x: x + size, y };
          const br = { x: x + size, y: y + size };
          const bl = { x, y: y + size };
          const lerp = (
            a: { x: number; y: number },
            b: { x: number; y: number },
            t: number
          ) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
          return [
            tl,
            lerp(tl, tr, 1 / 3),
            lerp(tl, tr, 2 / 3),
            tr,
            lerp(tr, br, 1 / 3),
            lerp(tr, br, 2 / 3),
            br,
            lerp(br, bl, 1 / 3),
            lerp(br, bl, 2 / 3),
            bl,
            lerp(bl, tl, 1 / 3),
            lerp(bl, tl, 2 / 3),
          ];
        };

        canvas.drawColor(Skia.Color("white"));
        const size = 50;
        const gap = 10;
        const colors = [
          Skia.Color("red"),
          Skia.Color("green"),
          Skia.Color("blue"),
          Skia.Color("black"),
        ];
        // Calls that omit the paint argument fall back to CanvasKit's own
        // opaque-black default paint, so - like every mode but DstOver - they
        // render solid black: that is a faithful (and, for these argument-count
        // variants, expected) result, not a rendering bug. Only the 5-argument
        // call below supplies an explicit paint, which is what actually lets a
        // distinct color show through.
        const paint = Skia.Paint();
        paint.setColor(Skia.Color("cyan"));

        // 1 argument (only cubics)
        canvas.drawPatch(flatPatch(gap, gap, size));

        // 2 arguments (cubics and colors)
        canvas.drawPatch(flatPatch(gap * 2 + size, gap, size), colors);

        // 3 arguments (cubics, colors, texs)
        canvas.drawPatch(
          flatPatch(gap * 3 + size * 2, gap, size),
          colors,
          null
        );

        // 4 arguments (cubics, colors, texs, mode)
        canvas.drawPatch(
          flatPatch(gap, gap * 2 + size, size),
          colors,
          null,
          ctx.BlendMode.DstOver
        );

        // 5 arguments (cubics, colors, texs, mode, paint)
        canvas.drawPatch(
          flatPatch(gap * 2 + size, gap * 2 + size, size),
          colors,
          null,
          ctx.BlendMode.SrcOver,
          paint
        );

        // Nullable arguments
        canvas.drawPatch(
          flatPatch(gap * 3 + size * 2, gap * 2 + size, size),
          null,
          null,
          null,
          null
        );
      },
      { BlendMode }
    );
    checkImage(img, "snapshots/canvas/drawpatch-optional-args.png");
  });

  it("drawAtlas works when colors are omitted", async () => {
    const img = await surface.drawOffscreen(
      (Skia, canvas, ctx) => {
        canvas.drawColor(Skia.Color("white"));
        const size = 40;
        const texSurface = Skia.Surface.MakeOffscreen(size, size)!;
        const texCanvas = texSurface.getCanvas();
        texCanvas.drawColor(Skia.Color("orange"));
        const image = texSurface.makeImageSnapshot();
        const paint = Skia.Paint();

        // 5 arguments: atlas, srcs, dsts, paint, blendMode (without colors)
        canvas.drawAtlas(
          image,
          [Skia.XYWHRect(0, 0, size, size)],
          [Skia.RSXform(1, 0, 10, 10)],
          paint,
          ctx.BlendMode.SrcOver
        );
      },
      { BlendMode }
    );
    checkImage(img, "snapshots/canvas/drawatlas-no-colors.png");
  });

  it("drawAtlas accepts null for blendMode, colors and sampling", async () => {
    const img = await surface.drawOffscreen((Skia, canvas) => {
      canvas.drawColor(Skia.Color("white"));
      const size = 40;
      const texSurface = Skia.Surface.MakeOffscreen(size, size)!;
      const texCanvas = texSurface.getCanvas();
      texCanvas.drawColor(Skia.Color("orange"));
      const image = texSurface.makeImageSnapshot();
      const paint = Skia.Paint();

      // null is accepted for every trailing argument and falls back to the
      // defaults (DstOver, no per-sprite colors, linear sampling).
      canvas.drawAtlas(
        image,
        [Skia.XYWHRect(0, 0, size, size)],
        [Skia.RSXform(1, 0, 10, 10)],
        paint,
        null,
        null,
        null
      );
    });
    checkImage(img, "snapshots/canvas/drawatlas-no-colors.png");
  });

  it("drawImage accepts null or omitted paint", async () => {
    const img = await surface.drawOffscreen((Skia, canvas) => {
      canvas.drawColor(Skia.Color("white"));
      const size = 20;
      const texSurface = Skia.Surface.MakeOffscreen(size, size)!;
      const texCanvas = texSurface.getCanvas();
      texCanvas.drawColor(Skia.Color("purple"));
      const image = texSurface.makeImageSnapshot();

      // drawImage without paint
      canvas.drawImage(image, 10, 10);
      // drawImage with null paint
      canvas.drawImage(image, 40, 10, null);
    });
    checkImage(img, "snapshots/canvas/drawimage-optional-paint.png");
  });

  it("saveLayer accepts null paint and a plain-object rect for bounds", async () => {
    const img = await surface.drawOffscreen((Skia, canvas) => {
      canvas.drawColor(Skia.Color("white"));
      // A plain {x,y,width,height} object is a valid SkRect (see the public
      // SkRect type) and must survive being passed as saveLayer's bounds
      // without becoming a dangling native pointer.
      const bounds = { x: 5, y: 5, width: 50, height: 50 };
      const count = canvas.saveLayer(null, bounds);
      const paint = Skia.Paint();
      paint.setColor(Skia.Color("teal"));
      canvas.drawRect(Skia.XYWHRect(10, 10, 30, 30), paint);
      canvas.restoreToCount(count);
    });
    checkImage(img, "snapshots/canvas/savelayer-plain-rect-bounds.png");
  });

  it("drawPoints does not throw when the points array is empty", async () => {
    const img = await surface.drawOffscreen(
      (Skia, canvas, ctx) => {
        canvas.drawColor(Skia.Color("white"));
        const paint = Skia.Paint();
        paint.setColor(Skia.Color("black"));
        paint.setStrokeWidth(4);

        canvas.drawPoints(ctx.PointMode.Points, [], paint);
        canvas.drawPoints(ctx.PointMode.Lines, [], paint);
        canvas.drawPoints(ctx.PointMode.Polygon, [], paint);

        canvas.drawPoints(
          ctx.PointMode.Polygon,
          [
            { x: 10, y: 10 },
            { x: 50, y: 10 },
            { x: 50, y: 50 },
            { x: 10, y: 50 },
          ],
          paint
        );
      },
      { PointMode }
    );
    checkImage(img, "snapshots/canvas/drawpoints-empty-array.png");
  });

  it("drawPatch defaults to Modulate blend mode when omitted, matching the web/CanvasKit default", async () => {
    const size = 60;
    const gap = 10;
    const img = await surface.drawOffscreen(
      (
        Skia,
        canvas,
        ctx: { BlendMode: typeof BlendMode; size: number; gap: number }
      ) => {
        const flatPatch = (x: number, y: number, s: number) => {
          const tl = { x, y };
          const tr = { x: x + s, y };
          const br = { x: x + s, y: y + s };
          const bl = { x, y: y + s };
          const lerp = (
            a: { x: number; y: number },
            b: { x: number; y: number },
            t: number
          ) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
          return [
            tl,
            lerp(tl, tr, 1 / 3),
            lerp(tl, tr, 2 / 3),
            tr,
            lerp(tr, br, 1 / 3),
            lerp(tr, br, 2 / 3),
            br,
            lerp(br, bl, 1 / 3),
            lerp(br, bl, 2 / 3),
            bl,
            lerp(bl, tl, 1 / 3),
            lerp(bl, tl, 2 / 3),
          ];
        };

        canvas.drawColor(Skia.Color("white"));
        const colors = [
          Skia.Color("red"),
          Skia.Color("lime"),
          Skia.Color("blue"),
          Skia.Color("yellow"),
        ];
        // A translucent, tinted paint makes Modulate visibly differ from
        // Src-over/Dst-over, so a regression to the old colors-dependent
        // default would show up as a pixel mismatch below.
        const paint = Skia.Paint();
        paint.setColor(Skia.Color("orange"));
        paint.setAlphaf(0.5);

        // Left: mode omitted, must resolve to the same default as CanvasKit.
        canvas.drawPatch(
          flatPatch(ctx.gap, ctx.gap, ctx.size),
          colors,
          null,
          null,
          paint
        );
        // Middle: explicit Modulate, the expected default.
        canvas.drawPatch(
          flatPatch(ctx.gap * 2 + ctx.size, ctx.gap, ctx.size),
          colors,
          null,
          ctx.BlendMode.Modulate,
          paint
        );
        // Right: explicit DstOver, the old (incorrect) native default used
        // when colors were present. Kept for visual contrast against the two
        // patches above, which must look identical to each other.
        canvas.drawPatch(
          flatPatch(ctx.gap * 3 + ctx.size * 2, ctx.gap, ctx.size),
          colors,
          null,
          ctx.BlendMode.DstOver,
          paint
        );
      },
      { BlendMode, size, gap }
    );
    checkImage(img, "snapshots/canvas/drawpatch-default-blendmode.png");

    // Pin down the regression precisely: render the *same* patch, at the
    // *same* absolute position, once with mode omitted and once with mode
    // explicitly set to Modulate, each in its own offscreen surface (side by
    // side rendering isn't reliable for a pixel-exact comparison since patch
    // tessellation isn't perfectly translation-invariant). The two renders
    // must be byte-identical if the default truly resolves to Modulate.
    const renderSinglePatch = (mode: BlendMode | null) =>
      surface.drawOffscreen(
        (
          Skia,
          canvas,
          ctx: { size: number; gap: number; mode: number | null }
        ) => {
          const flatPatch = (x: number, y: number, s: number) => {
            const tl = { x, y };
            const tr = { x: x + s, y };
            const br = { x: x + s, y: y + s };
            const bl = { x, y: y + s };
            const lerp = (
              a: { x: number; y: number },
              b: { x: number; y: number },
              t: number
            ) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
            return [
              tl,
              lerp(tl, tr, 1 / 3),
              lerp(tl, tr, 2 / 3),
              tr,
              lerp(tr, br, 1 / 3),
              lerp(tr, br, 2 / 3),
              br,
              lerp(br, bl, 1 / 3),
              lerp(br, bl, 2 / 3),
              bl,
              lerp(bl, tl, 1 / 3),
              lerp(bl, tl, 2 / 3),
            ];
          };
          canvas.drawColor(Skia.Color("white"));
          const colors = [
            Skia.Color("red"),
            Skia.Color("lime"),
            Skia.Color("blue"),
            Skia.Color("yellow"),
          ];
          const paint = Skia.Paint();
          paint.setColor(Skia.Color("orange"));
          paint.setAlphaf(0.5);
          canvas.drawPatch(
            flatPatch(ctx.gap, ctx.gap, ctx.size),
            colors,
            null,
            ctx.mode as BlendMode | null,
            paint
          );
        },
        { size, gap, mode }
      );

    const omitted = await renderSinglePatch(null);
    const explicitModulate = await renderSinglePatch(BlendMode.Modulate);
    expect(Array.from(omitted.encodeToBytes()!)).toEqual(
      Array.from(explicitModulate.encodeToBytes()!)
    );
  });
});
