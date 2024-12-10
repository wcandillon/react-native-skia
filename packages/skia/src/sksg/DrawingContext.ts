import { enumKey, processTransformProps2 } from "../dom/nodes";
import type { PaintProps, TransformProps } from "../dom/types";
import { DeclarationContext } from "../dom/types";
import {
  BlendMode,
  PaintStyle,
  StrokeCap,
  StrokeJoin,
  type SkCanvas,
  type Skia,
  type SkPaint,
} from "../skia/types";

import { isDeclarationNode, type Node } from "./Node";

interface ContextProcessingResult {
  shouldRestoreMatrix: boolean;
  shouldRestorePaint: boolean;
}

export const preProcessContext = (
  ctx: DrawingContext,
  props: PaintProps & TransformProps,
  children: Node<unknown>[]
) => {
  "worklet";
  const shouldRestoreMatrix = ctx.processMatrix(props);
  ctx.declCtx.save();
  children.forEach((child) => {
    if (isDeclarationNode(child)) {
      child.declare(ctx.declCtx);
    }
  });
  ctx.declCtx.restore();
  const shouldRestorePaint = ctx.processPaint(props);
  return { shouldRestoreMatrix, shouldRestorePaint };
};

export const postProcessContext = (
  ctx: DrawingContext,
  { shouldRestoreMatrix, shouldRestorePaint }: ContextProcessingResult
) => {
  "worklet";
  if (shouldRestoreMatrix) {
    ctx.canvas.restore();
  }
  if (shouldRestorePaint) {
    ctx.restore();
  }
};

export class DrawingContext {
  private paints: SkPaint[];
  public declCtx: DeclarationContext;

  constructor(public Skia: Skia, public canvas: SkCanvas) {
    this.paints = [Skia.Paint()];
    this.declCtx = new DeclarationContext(this.Skia);
  }

  save() {
    this.paints.push(this.paint.copy());
  }

  restore() {
    this.paints.pop();
  }

  get paint() {
    const paint = this.paints[this.paints.length - 1];
    if (!paint) {
      throw new Error("Paint is undefined");
    }
    return paint;
  }

  processPaint({
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
  }: PaintProps) {
    let shouldRestore = false;
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
      dither !== undefined
    ) {
      if (!shouldRestore) {
        this.save();
        shouldRestore = true;
      }
    }
    const { paint } = this;
    if (opacity !== undefined) {
      paint.setAlphaf(paint.getAlphaf() * opacity);
    }
    if (color !== undefined) {
      const currentOpacity = paint.getAlphaf();
      paint.setShader(null);
      paint.setColor(this.Skia.Color(color));
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
    const colorFilter = this.declCtx.colorFilters.popAllAsOne();
    const imageFilter = this.declCtx.imageFilters.popAllAsOne();
    const shader = this.declCtx.shaders.pop();
    const maskFilter = this.declCtx.maskFilters.pop();
    const pathEffect = this.declCtx.pathEffects.popAllAsOne();
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
  }

  processMatrix(props: TransformProps) {
    const m3 = processTransformProps2(this.Skia, props);
    if (m3) {
      this.canvas.save();
      this.canvas.concat(m3);
      return true;
    }
    return false;
  }
}
