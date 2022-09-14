import type {
  Color,
  FilterMode,
  MipmapMode,
  SkImage,
  SkRect,
  SkRuntimeEffect,
  TileMode,
  Uniforms,
  Vector,
} from "../../skia/types";

import type {
  SkEnum,
  TransformProps,
  ChildrenProps,
  RectCtor,
  Fit,
} from "./Common";

export interface ShaderProps extends TransformProps, ChildrenProps {
  source: SkRuntimeEffect;
  uniforms: Uniforms;
}

export interface ImageShaderProps extends TransformProps, Partial<RectCtor> {
  tx: SkEnum<typeof TileMode>;
  ty: SkEnum<typeof TileMode>;
  fm: SkEnum<typeof FilterMode>;
  mm: SkEnum<typeof MipmapMode>;
  fit: Fit;
  rect?: SkRect;
  image: SkImage;
}

export interface ColorProps {
  color: Color;
}

export interface TurbulenceProps {
  freqX: number;
  freqY: number;
  octaves: number;
  seed: number;
  tileWidth: number;
  tileHeight: number;
}

export interface FractalNoiseProps {
  freqX: number;
  freqY: number;
  octaves: number;
  seed: number;
  tileWidth: number;
  tileHeight: number;
}

export interface GradientProps extends TransformProps {
  colors: Color[];
  positions?: number[];
  mode?: SkEnum<typeof TileMode>;
  flags?: number;
}

export interface LinearGradientProps extends GradientProps {
  start: Vector;
  end: Vector;
}

export interface RadialGradientProps extends GradientProps {
  c: Vector;
  r: number;
}

export interface SweepGradientProps extends GradientProps {
  c: Vector;
  start?: number;
  end?: number;
}

export interface TwoPointConicalGradientProps extends GradientProps {
  start: Vector;
  startR: number;
  end: Vector;
  endR: number;
}
