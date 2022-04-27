import type { ReactNode, RefObject } from "react";

import {
  BlendMode,
  PaintStyle,
  StrokeJoin,
  StrokeCap,
  processColor,
  isShader,
  isMaskFilter,
  isColorFilter,
  isPathEffect,
  isImageFilter,
  Skia,
} from "../../skia";
import type { SkPaint, Color, SkImageFilter } from "../../skia";
import type { DeclarationResult } from "../nodes";
export type SkEnum<T> = Uncapitalize<keyof T extends string ? keyof T : never>;

export interface ChildrenProps {
  children?: ReactNode | ReactNode[];
}

// TODO: rename to paint props?
export interface CustomPaintProps extends ChildrenProps {
  paint?: RefObject<SkPaint>;
  color?: Color;
  strokeWidth?: number;
  blendMode?: SkEnum<typeof BlendMode>;
  style?: SkEnum<typeof PaintStyle>;
  strokeJoin?: SkEnum<typeof StrokeJoin>;
  strokeCap?: SkEnum<typeof StrokeCap>;
  strokeMiter?: number;
  opacity?: number;
  antiAlias?: boolean;
}

export const enumKey = <K extends string>(k: K) =>
  (k.charAt(0).toUpperCase() + k.slice(1)) as Capitalize<K>;

export const processPaint = (
  paint: SkPaint,
  currentOpacity: number,
  {
    paint: paintRef,
    color,
    blendMode,
    style,
    strokeWidth,
    strokeJoin,
    strokeCap,
    strokeMiter,
    opacity,
    antiAlias,
  }: CustomPaintProps,
  children: DeclarationResult[]
) => {
  if (paintRef && paintRef.current) {
    return paintRef.current;
  }
  if (color !== undefined) {
    const c = processColor(color, currentOpacity);
    paint.setShader(null);
    paint.setColor(c);
  } else {
    const c = processColor(paint.getColor(), currentOpacity);
    paint.setColor(c);
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
  if (strokeWidth !== undefined) {
    paint.setStrokeWidth(strokeWidth);
  }
  if (opacity !== undefined) {
    paint.setAlphaf(opacity);
  }
  if (antiAlias !== undefined) {
    paint.setAntiAlias(antiAlias);
  }
  children.forEach((child) => {
    if (isShader(child)) {
      paint.setShader(child);
    } else if (isMaskFilter(child)) {
      paint.setMaskFilter(child);
    } else if (isColorFilter(child)) {
      paint.setColorFilter(child);
    } else if (isPathEffect(child)) {
      paint.setPathEffect(child);
    }
  });
  const filters = children.filter(isImageFilter);
  if (filters.length > 0) {
    paint.setImageFilter(
      filters
        .reverse()
        .reduce<SkImageFilter | null>(Skia.ImageFilter.MakeCompose, null)
    );
  }
  return paint;
};
