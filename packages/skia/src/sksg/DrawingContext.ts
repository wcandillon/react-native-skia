"worklet";

import {
  enumKey,
  isPathDef,
  processPath,
  processTransformProps2,
} from "../dom/nodes";
import type { ClipDef, DrawingNodeProps, GroupProps } from "../dom/types";
import { createDeclarationContext } from "../dom/types";
import {
  BlendMode,
  ClipOp,
  isRRect,
  PaintStyle,
  StrokeCap,
  StrokeJoin,
} from "../skia/types";
import type {
  SkPath,
  SkRect,
  SkRRect,
  SkCanvas,
  Skia,
  SkPaint,
} from "../skia/types";

const computeClip = (
  Skia: Skia,
  clip: ClipDef | undefined
):
  | undefined
  | { clipPath: SkPath }
  | { clipRect: SkRect }
  | { clipRRect: SkRRect } => {
  if (clip) {
    if (isPathDef(clip)) {
      return { clipPath: processPath(Skia, clip) };
    } else if (isRRect(clip)) {
      return { clipRRect: clip };
    } else {
      return { clipRect: clip };
    }
  }
  return undefined;
};

export const createDrawingContext = (Skia: Skia, canvas: SkCanvas) => {
  const state = {
    paints: [Skia.Paint()],
    declCtx: createDeclarationContext(Skia),
  };

  const getPaint = () => {
    const paint = state.paints[state.paints.length - 1];
    if (!paint) {
      throw new Error("Paint is undefined");
    }
    return paint;
  };

  const getLocalPaints = () => {
    return [getPaint(), ...state.declCtx.paints.popAll()];
  };

  const processPaint = ({
    opacity,
    color,
    strokeWidth,
    blendMode,
    style,
    strokeJoin,
    strokeCap,
    strokeMiter,
    antiAlias,
    dither,
    paint: paintProp,
  }: DrawingNodeProps) => {
    if (paintProp) {
      state.declCtx.paints.push(paintProp);
      return true;
    }
    let shouldRestore = false;
    const colorFilter = state.declCtx.colorFilters.popAllAsOne();
    const imageFilter = state.declCtx.imageFilters.popAllAsOne();
    const shader = state.declCtx.shaders.pop();
    const maskFilter = state.declCtx.maskFilters.pop();
    const pathEffect = state.declCtx.pathEffects.popAllAsOne();

    if (
      opacity !== undefined ||
      color !== undefined ||
      strokeWidth !== undefined ||
      blendMode !== undefined ||
      style !== undefined ||
      strokeJoin !== undefined ||
      strokeCap !== undefined ||
      strokeMiter !== undefined ||
      antiAlias !== undefined ||
      dither !== undefined ||
      colorFilter !== undefined ||
      imageFilter !== undefined ||
      shader !== undefined ||
      maskFilter !== undefined ||
      pathEffect !== undefined
    ) {
      if (!shouldRestore) {
        state.paints.push(getPaint().copy());
        shouldRestore = true;
      }
    }

    const paint = getPaint();
    if (opacity !== undefined) {
      paint.setAlphaf(paint.getAlphaf() * opacity);
    }
    if (color !== undefined) {
      const currentOpacity = paint.getAlphaf();
      paint.setShader(null);
      if (typeof color === "string" || typeof color === "number") {
        paint.setColor(Skia.Color(color));
      } else if (Array.isArray(color)) {
        paint.setColor(new Float32Array(color));
      } else if (color instanceof Float32Array) {
        paint.setColor(color);
      } else {
        throw new Error("Invalid color");
      }
      paint.setAlphaf(currentOpacity * paint.getAlphaf());
    }
    if (strokeWidth !== undefined) {
      paint.setStrokeWidth(strokeWidth);
    }
    if (blendMode !== undefined) {
      paint.setBlendMode(BlendMode[enumKey(blendMode)]);
    }
    if (style !== undefined) {
      paint.setStyle(PaintStyle[enumKey(style)]);
    }
    if (strokeJoin !== undefined) {
      paint.setStrokeJoin(StrokeJoin[enumKey(strokeJoin)]);
    }
    if (strokeCap !== undefined) {
      paint.setStrokeCap(StrokeCap[enumKey(strokeCap)]);
    }
    if (strokeMiter !== undefined) {
      paint.setStrokeMiter(strokeMiter);
    }
    if (antiAlias !== undefined) {
      paint.setAntiAlias(antiAlias);
    }
    if (dither !== undefined) {
      paint.setDither(dither);
    }
    if (colorFilter) {
      paint.setColorFilter(colorFilter);
    }
    if (imageFilter) {
      paint.setImageFilter(imageFilter);
    }
    if (shader) {
      paint.setShader(shader);
    }
    if (maskFilter) {
      paint.setMaskFilter(maskFilter);
    }
    if (pathEffect) {
      paint.setPathEffect(pathEffect);
    }
    return shouldRestore;
  };

  const processMatrixAndClipping = (
    props: GroupProps,
    layer?: boolean | SkPaint
  ) => {
    const hasTransform =
      props.matrix !== undefined || props.transform !== undefined;
    const clip = computeClip(Skia, props.clip);
    const hasClip = clip !== undefined;
    const op = props.invertClip ? ClipOp.Difference : ClipOp.Intersect;
    const m3 = processTransformProps2(Skia, props);
    const shouldSave = hasTransform || hasClip || !!layer;

    if (shouldSave) {
      if (layer) {
        if (typeof layer === "boolean") {
          canvas.saveLayer();
        } else {
          canvas.saveLayer(layer);
        }
      } else {
        canvas.save();
      }
    }

    if (m3) {
      canvas.concat(m3);
    }
    if (clip) {
      if ("clipRect" in clip) {
        canvas.clipRect(clip.clipRect, op, true);
      } else if ("clipRRect" in clip) {
        canvas.clipRRect(clip.clipRRect, op, true);
      } else {
        canvas.clipPath(clip.clipPath, op, true);
      }
    }
    return shouldSave;
  };

  return {
    Skia,
    canvas,
    declCtx: state.declCtx,
    save: () => state.paints.push(getPaint().copy()),
    restore: () => state.paints.pop(),
    get paint() {
      return getPaint();
    },
    getLocalPaints,
    processPaint,
    processMatrixAndClipping,
  };
};

export type DrawingContext = ReturnType<typeof createDrawingContext>;
