import { enumKey, processColor } from "../../../dom/nodes";
import type { PaintProps } from "../../../dom/types";
import {
  BlendMode,
  PaintStyle,
  StrokeCap,
  StrokeJoin,
} from "../../../skia/types";
import type { Skia } from "../../../skia/types";
import type { DrawingContext } from "../DrawingContext";

export const setPaintProperties = (
  Skia: Skia,
  ctx: DrawingContext,
  {
    opacity,
    color,
    blendMode,
    strokeWidth,
    style,
    strokeJoin,
    strokeCap,
    strokeMiter,
    antiAlias,
    dither,
  }: PaintProps,
  standalone: boolean
) => {
  "worklet";
  if (opacity !== undefined) {
    ctx.applyOpacity(opacity, standalone);
  }
  if (color !== undefined) {
    ctx.setColor(processColor(Skia, color), standalone);
  }
  if (
    blendMode === undefined &&
    strokeWidth === undefined &&
    style === undefined &&
    strokeJoin === undefined &&
    strokeCap === undefined &&
    strokeMiter === undefined &&
    antiAlias === undefined &&
    dither === undefined
  ) {
    return;
  }
  const paint = ctx.writablePaint();
  if (blendMode !== undefined) {
    paint.setBlendMode(BlendMode[enumKey(blendMode)]);
  }
  if (strokeWidth !== undefined) {
    paint.setStrokeWidth(strokeWidth);
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
};
