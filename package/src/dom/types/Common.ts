import type { ReactNode, RefObject } from "react";

import type {
  BlendMode,
  Color,
  PaintStyle,
  SkMatrix,
  SkPaint,
  SkPath,
  SkRect,
  SkRRect,
  StrokeCap,
  StrokeJoin,
  Transforms2d,
  Vector,
} from "../../skia/types";

import type { DeclarationNode } from "./Node";

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
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RRectCtor extends RectCtor {
  r: Radius;
}

export type RectDef = RectCtor | { rect: SkRect };
export type RRectDef = RRectCtor | { rect: SkRRect };

export interface PointCircleDef {
  c: Vector;
  r: number;
}

export interface ScalarCircleDef {
  cx: number;
  cy: number;
  r: number;
}

export type CircleDef = PointCircleDef | ScalarCircleDef;

export interface TransformProps {
  transform?: Transforms2d;
  origin?: Vector;
  matrix?: SkMatrix;
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
}

export interface GroupProps extends PaintProps, TransformProps {
  clip?: ClipDef;
  invertClip?: boolean;
  layer?: RefObject<DeclarationNode<unknown, SkPaint>> | SkPaint | boolean;
}
