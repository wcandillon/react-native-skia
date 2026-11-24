import type {
  Skia,
  SkCanvas,
  SkColor,
  SkColorFilter,
  SkPaint,
  SkShader,
  SkImageFilter,
  SkPathEffect,
} from "../../skia/types";

import { createFrameScope } from "./FrameScope";

/**
 * A level of the paint stack: what a SavePaint command pushes and the
 * matching RestorePaint pops.
 *
 * A level draws with its parent's paint until it writes to it; it then takes
 * a paint from the pool and copies its parent's into it (writablePaint). On
 * CanvasKit that copy is the one costly step of the stack, a native
 * allocation and a delete, so a level that only carries a group opacity
 * never copies: it multiplies the opacity into the alpha of the paint it
 * shares and restores that alpha when it is popped.
 */
interface PaintLevel {
  /** The level has a paint of its own: a pool paint, or a user paint's copy. */
  owned: boolean;
  /** The paint may carry a shader, which setting a color must clear. */
  hasShader: boolean;
  /** The paint's alpha, when known, so it needs no reading back from Skia. */
  alpha: number | null;
  /**
   * The alpha the shared paint had before this level multiplied its opacity
   * in, restored when the level is popped.
   */
  undo: { paint: SkPaint; alpha: number } | null;
}

// Comparisons rather than Math.min/Math.max: this runs for every opacity and
// every color of a frame, and the two calls cost 25 times the comparisons.
const clamp01 = (value: number) => {
  "worklet";
  // eslint-disable-next-line no-nested-ternary
  return value < 0 ? 0 : value > 1 ? 1 : value;
};

// reset() produces an anti-alias false paint, unlike the Skia.Paint()
// factory: a reset paint gets the default back.
const resetPaint = (paint: SkPaint) => {
  "worklet";
  paint.reset();
  paint.setAntiAlias(true);
};

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

  const paints: SkPaint[] = [];
  const levels: PaintLevel[] = [];
  const colorFilters: SkColorFilter[] = [];
  const shaders: SkShader[] = [];
  const imageFilters: SkImageFilter[] = [];
  const pathEffects: SkPathEffect[] = [];
  const paintDeclarations: SkPaint[] = [];
  const opacities: number[] = [];

  let nextPaintIndex = 1;

  // The root paint: the pool's first paint, reset for this frame.
  if (paintPool.length === 0) {
    paintPool.push(Skia.Paint());
  } else {
    resetPaint(paintPool[0]);
  }
  paints.push(paintPool[0]);
  levels.push({ owned: true, hasShader: false, alpha: 1, undo: null });
  opacities.push(1);

  // The next pool paint, allocated when the pool has none left. Pool paints
  // are never reused within a frame: a popped one may be a paint declaration
  // still waiting to be drawn with.
  const takePoolPaint = () => {
    if (nextPaintIndex >= paintPool.length) {
      paintPool.push(Skia.Paint());
    }
    return paintPool[nextPaintIndex++];
  };

  const getCurrentPaint = () => {
    return paints[paints.length - 1];
  };

  const currentLevel = () => {
    return levels[levels.length - 1];
  };

  const getOpacity = () => {
    return opacities[opacities.length - 1];
  };

  /**
   * The current paint, to write to: the level's own paint, copied from its
   * parent's on the level's first write.
   */
  const writablePaint = () => {
    const level = currentLevel();
    if (!level.owned) {
      const own = takePoolPaint();
      own.assign(getCurrentPaint());
      paints[paints.length - 1] = own;
      level.owned = true;
    }
    return getCurrentPaint();
  };

  /**
   * Pushes a level. A standalone level is a paint declaration (a <Paint>
   * child): it starts from a fresh paint, not from its parent's.
   */
  const savePaint = (standalone = false) => {
    const parent = currentLevel();
    opacities.push(getOpacity());
    if (standalone) {
      const own = takePoolPaint();
      resetPaint(own);
      paints.push(own);
      levels.push({ owned: true, hasShader: false, alpha: 1, undo: null });
    } else {
      paints.push(getCurrentPaint());
      levels.push({
        owned: false,
        hasShader: parent.hasShader,
        alpha: parent.alpha,
        undo: null,
      });
    }
  };

  // Pushes an externally owned paint (the `paint` prop) onto the stack. It
  // pushes a frame-scoped copy, like the C++ DrawingCtx: materializePaint()
  // mutates the top of the stack, and those mutations must not leak into the
  // user-owned paint. The group opacity applies to it, as to every paint
  // drawn with. It must also push an opacity alongside it: restorePaint()
  // pops both, so pushing only the paint would underflow the opacity stack and
  // leak the enclosing group's opacity onto everything drawn afterwards.
  const pushPaint = (paint: SkPaint) => {
    const copy = track(paint.copy());
    const opacity = getOpacity();
    let alpha: number | null = null;
    if (opacity !== 1) {
      alpha = clamp01(copy.getAlphaf() * opacity);
      copy.setAlphaf(alpha);
    }
    paints.push(copy);
    opacities.push(opacity);
    levels.push({ owned: true, hasShader: true, alpha, undo: null });
  };

  const restorePaint = () => {
    const level = levels.pop();
    opacities.pop();
    const paint = paints.pop();
    if (level && level.undo) {
      level.undo.paint.setAlphaf(level.undo.alpha);
    }
    return paint;
  };

  // Multiplies the current paint's alpha, returning the alpha it had.
  const multiplyAlpha = (level: PaintLevel, paint: SkPaint, factor: number) => {
    const alpha = level.alpha ?? paint.getAlphaf();
    const next = clamp01(alpha * factor);
    paint.setAlphaf(next);
    level.alpha = next;
    return alpha;
  };

  /**
   * Applies an opacity prop. On a paint declaration (standalone) it is the
   * paint's own alpha. Otherwise it is a group opacity: every paint drawn
   * under the level carries it in its alpha, the one set here and, through
   * getOpacity(), the ones set by the levels below.
   */
  const applyOpacity = (opacity: number, standalone: boolean) => {
    const level = currentLevel();
    const paint = getCurrentPaint();
    if (standalone) {
      multiplyAlpha(level, paint, opacity);
      return;
    }
    opacities[opacities.length - 1] = clamp01(getOpacity() * opacity);
    const previous = multiplyAlpha(level, paint, opacity);
    if (!level.owned && level.undo === null) {
      // The paint is the parent's: its alpha comes back when the level pops.
      level.undo = { paint, alpha: previous };
    }
  };

  /**
   * Sets the current paint's color. A color replaces a shader and, unless the
   * paint is a declaration (standalone), carries the group opacity.
   */
  const setColor = (color: SkColor, standalone: boolean) => {
    const paint = writablePaint();
    const level = currentLevel();
    if (level.hasShader) {
      paint.setShader(null);
      level.hasShader = false;
    }
    paint.setColor(color);
    let alpha = color.length > 3 ? color[3] : paint.getAlphaf();
    if (!standalone) {
      const opacity = getOpacity();
      if (opacity !== 1) {
        alpha = clamp01(alpha * opacity);
        paint.setAlphaf(alpha);
      }
    }
    level.alpha = alpha;
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

  const materializePaint = () => {
    if (
      colorFilters.length === 0 &&
      shaders.length === 0 &&
      imageFilters.length === 0 &&
      pathEffects.length === 0
    ) {
      return;
    }
    const paint = writablePaint();
    // Color Filters
    if (colorFilters.length > 0) {
      paint.setColorFilter(
        colorFilters.reduceRight((inner, outer) =>
          inner ? frameSkia.ColorFilter.MakeCompose(outer, inner) : outer
        )
      );
    }
    // Shaders
    if (shaders.length > 0) {
      paint.setShader(shaders[shaders.length - 1]);
      currentLevel().hasShader = true;
    }
    // Image Filters
    if (imageFilters.length > 0) {
      paint.setImageFilter(
        imageFilters.reduceRight((inner, outer) =>
          inner ? frameSkia.ImageFilter.MakeCompose(outer, inner) : outer
        )
      );
    }
    // Path Effects
    if (pathEffects.length > 0) {
      paint.setPathEffect(
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

  return {
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

    savePaint,
    pushPaint,
    saveBackdropFilter,
    /** The paint to draw with. Write to it through writablePaint(). */
    get paint() {
      return paints[paints.length - 1];
    },
    writablePaint,
    restorePaint,
    materializePaint,
    getOpacity,
    applyOpacity,
    setColor,
  };
};

export type DrawingContext = ReturnType<typeof createDrawingContext>;
