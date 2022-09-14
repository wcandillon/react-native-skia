import type {
  BlendMode,
  PaintStyle,
  SkColorFilter,
  SkImageFilter,
  SkMaskFilter,
  SkPathEffect,
  SkShader,
  StrokeCap,
  StrokeJoin,
} from "../../skia/types";
import type { SkColor } from "../../skia/types/Color";

export interface PaintContext {
  color?: SkColor;
  strokeWidth?: number;
  blendMode?: BlendMode;
  style?: PaintStyle;
  strokeJoin?: StrokeJoin;
  strokeCap?: StrokeCap;
  strokeMiter?: number;
  opacity?: number;
  antiAlias?: boolean;

  shader?: SkShader;
  colorFilter?: SkColorFilter;
  imageFilter?: SkImageFilter;
  maskFilter?: SkMaskFilter;
  pathEffect?: SkPathEffect;
}
