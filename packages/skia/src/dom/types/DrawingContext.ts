import {
  BlendMode,
  PaintStyle,
  StrokeCap,
  StrokeJoin,
  type SkCanvas,
  type SkPaint,
  type Skia,
} from "../../skia/types";
import { enumKey } from "../nodes/datatypes/Enum";
import { JsiDeclarationNode } from "../nodes/Node";

import type { PaintProps } from "./Common";
import { DeclarationContext } from "./DeclarationContext";
import type { Node } from "./Node";

interface ContextProcessingResult {
  shouldRestorePaint: boolean;
}

export const preProcessContext = (
  ctx: DrawingContext,
  props: PaintProps,
  children: Node<unknown>[]
) => {
  "worklet";
  ctx.declarationCtx.save();
  children.forEach((child) => {
    if (child instanceof JsiDeclarationNode) {
      child.decorate(ctx.declarationCtx);
    }
  });
  ctx.declarationCtx.restore();
  const shouldRestorePaint = ctx.processPaint(props);
  return { shouldRestorePaint };
};

export const postProcessContext = (
  ctx: DrawingContext,
  { shouldRestorePaint }: ContextProcessingResult
) => {
  "worklet";
  if (shouldRestorePaint) {
    ctx.restore();
  }
};

export interface DrawingContext {
  canvas: SkCanvas;
  paint: SkPaint;
  save(): void;
  restore(): void;
  declarationCtx: DeclarationContext;
  processPaint(props: PaintProps): boolean;
}

export class JsiDrawingContext implements DrawingContext {
  paints: SkPaint[];

  declarationCtx: DeclarationContext;

  constructor(private readonly Skia: Skia, public readonly canvas: SkCanvas) {
    const paint = this.Skia.Paint();
    this.paints = [paint];
    this.declarationCtx = new DeclarationContext(Skia);
  }

  get paint() {
    return this.paints[this.paints.length - 1];
  }

  save() {
    this.paints.push(this.paint.copy());
  }

  restore(): void {
    this.paints.pop();
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
    const colorFilter = this.declarationCtx.colorFilters.popAllAsOne();
    const imageFilter = this.declarationCtx.imageFilters.popAllAsOne();
    const shader = this.declarationCtx.shaders.pop();
    const maskFilter = this.declarationCtx.maskFilters.pop();
    const pathEffect = this.declarationCtx.pathEffects.popAllAsOne();
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
}
