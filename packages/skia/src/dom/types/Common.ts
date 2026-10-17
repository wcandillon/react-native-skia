import type { ReactNode } from "react";

import type {
  BlendMode,
  Color,
  InputMatrix,
  InputRRect,
  PaintStyle,
  SaveLayerFlag,
  SkImageFilter,
  SkPaint,
  SkPath,
  SkRect,
  SkRRect,
  StrokeCap,
  StrokeJoin,
  Transforms3d,
  Vector,
} from "../../skia/types";

export type SkEnum<T> = Uncapitalize<keyof T extends string ? keyof T : never>;

export type PathDef = string | SkPath;

export type ClipDef = SkRRect | SkRect | PathDef;

export type Fit =
  | "cover"
  | "contain"
  | "fill"
  | "fitHeight"
  | "fitWidth"
  | "none"
  | "scaleDown";

export type Radius = number | Vector;

export interface ChildrenProps {
  children?: ReactNode | ReactNode[];
}

export interface RectCtor {
  x?: number;
  y?: number;
  width: number;
  height: number;
}

export interface RRectCtor extends RectCtor {
  r?: Radius;
}

export type RectDef = RectCtor | { rect: SkRect };
export type RRectDef = RRectCtor | { rect: InputRRect };

export interface PointCircleDef {
  c?: Vector;
  r: number;
}

export interface ScalarCircleDef {
  cx: number;
  cy: number;
  r: number;
}

export type CircleDef = PointCircleDef | ScalarCircleDef;

export interface TransformProps {
  transform?: Transforms3d;
  origin?: Vector;
  matrix?: InputMatrix;
}

export interface SaveLayerProps {
  backdropFilter?: SkImageFilter;
  saveLayerFlags?: SaveLayerFlag;
}

export interface CTMProps extends TransformProps, SaveLayerProps {
  clip?: ClipDef;
  invertClip?: boolean;
  layer?: SkPaint | boolean;
}

export interface PaintProps extends ChildrenProps {
  color?: Color;
  strokeWidth?: number;
  blendMode?: SkEnum<typeof BlendMode>;
  style?: SkEnum<typeof PaintStyle>;
  strokeJoin?: SkEnum<typeof StrokeJoin>;
  strokeCap?: SkEnum<typeof StrokeCap>;
  strokeMiter?: number;
  opacity?: number;
  antiAlias?: boolean;
  dither?: boolean;
}

export interface GroupProps extends PaintProps, CTMProps {
  zIndex?: number;
}
