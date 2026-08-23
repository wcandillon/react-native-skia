import type {
  Skia,
  SkCanvas,
  SkColorFilter,
  SkPaint,
  SkShader,
  SkImageFilter,
  SkPathEffect,
} from "../../skia/types";

import { createFrameScope } from "./FrameScope";

export const createDrawingContext = (
  Skia: Skia,
  paintPool: SkPaint[],
  canvas: SkCanvas
) => {
  "worklet";

  // Everything the renderer creates through frameSkia is frame-scoped and
  // deleted by dispose() once the frame has been recorded. The paint pool is
  // recording-scoped and deliberately allocated with the raw Skia instance.
  const { Skia: frameSkia, track, dispose } = createFrameScope(Skia);

  // State (formerly class fields)
  const paints: SkPaint[] = [];
  const colorFilters: SkColorFilter[] = [];
  const shaders: SkShader[] = [];
  const imageFilters: SkImageFilter[] = [];
  const pathEffects: SkPathEffect[] = [];
  const paintDeclarations: SkPaint[] = [];
  const opacities: number[] = [];

  let nextPaintIndex = 1;

  // Initialize first paint and opacity
  if (paintPool.length === 0) {
    paintPool.push(Skia.Paint());
  } else {
    // reset() produces an anti-alias false paint, unlike the Skia.Paint()
    // factory: restore the default so reused pools render like the first frame.
    paintPool[0].reset();
    paintPool[0].setAntiAlias(true);
  }
  paints.push(paintPool[0]);
  opacities.push(1);

  // Methods (formerly class methods)
  const savePaint = () => {
    // Get next available paint from pool or create new one if needed
    if (nextPaintIndex >= paintPool.length) {
      paintPool.push(Skia.Paint());
    }

    const nextPaint = paintPool[nextPaintIndex];
    nextPaint.assign(getCurrentPaint()); // Reuse allocation by copying properties
    paints.push(nextPaint);
    opacities.push(opacities[opacities.length - 1]);
    nextPaintIndex++;
  };

  // Pushes an externally owned paint (the `paint` prop) onto the stack. It
  // pushes a frame-scoped copy, like the C++ DrawingCtx: materializePaint()
  // mutates the top of the stack, and those mutations must not leak into the
  // user-owned paint. It must also push an opacity alongside it: restorePaint()
  // pops both, so pushing only the paint would underflow the opacity stack and
  // leak the enclosing group's opacity onto everything drawn afterwards.
  const pushPaint = (paint: SkPaint) => {
    paints.push(track(paint.copy()));
    opacities.push(opacities[opacities.length - 1]);
  };

  const getOpacity = () => {
    return opacities[opacities.length - 1];
  };

  const setOpacity = (newOpacity: number) => {
    opacities[opacities.length - 1] = Math.max(0, Math.min(1, newOpacity));
  };

  const saveBackdropFilter = () => {
    let imageFilter: SkImageFilter | null = null;
    const imgf = imageFilters.pop();
    if (imgf) {
      imageFilter = imgf;
    } else {
      const cf = colorFilters.pop();
      if (cf) {
        imageFilter = frameSkia.ImageFilter.MakeColorFilter(cf, null);
      }
    }
    canvas.saveLayer(undefined, null, imageFilter);
    canvas.restore();
  };

  // Equivalent to the `get paint()` getter in the original class
  const getCurrentPaint = () => {
    return paints[paints.length - 1];
  };

  const restorePaint = () => {
    opacities.pop();
    return paints.pop();
  };

  const materializePaint = () => {
    // Color Filters
    if (colorFilters.length > 0) {
      getCurrentPaint().setColorFilter(
        colorFilters.reduceRight((inner, outer) =>
          inner ? frameSkia.ColorFilter.MakeCompose(outer, inner) : outer
        )
      );
    }
    // Shaders
    if (shaders.length > 0) {
      getCurrentPaint().setShader(shaders[shaders.length - 1]);
    }
    // Image Filters
    if (imageFilters.length > 0) {
      getCurrentPaint().setImageFilter(
        imageFilters.reduceRight((inner, outer) =>
          inner ? frameSkia.ImageFilter.MakeCompose(outer, inner) : outer
        )
      );
    }

    // Path Effects
    if (pathEffects.length > 0) {
      getCurrentPaint().setPathEffect(
        pathEffects.reduceRight((inner, outer) =>
          inner ? frameSkia.PathEffect.MakeCompose(outer, inner) : outer
        )
      );
    }

    // Clear arrays
    colorFilters.length = 0;
    shaders.length = 0;
    imageFilters.length = 0;
    pathEffects.length = 0;
  };

  // Return an object containing the Skia reference, the canvas, and the methods
  return {
    // Public fields
    Skia: frameSkia,
    canvas,
    track,
    dispose,
    paints,
    colorFilters,
    shaders,
    imageFilters,
    pathEffects,
    paintDeclarations,
    paintPool,

    // Public methods
    savePaint,
    pushPaint,
    saveBackdropFilter,
    get paint() {
      return paints[paints.length - 1];
    }, // the "getter" for the current paint
    restorePaint,
    materializePaint,
    getOpacity,
    setOpacity,
  };
};

export type DrawingContext = ReturnType<typeof createDrawingContext>;
