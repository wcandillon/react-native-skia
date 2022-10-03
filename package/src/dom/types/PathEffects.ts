import type { Path1DEffectStyle, SkMatrix } from "../../skia/types";

import type { ChildrenProps, PathDef, SkEnum } from "./Common";

export interface CornerPathEffectProps extends ChildrenProps {
  r: number;
}

export interface DiscretePathEffectProps extends ChildrenProps {
  length: number;
  deviation: number;
  seed: number;
}

export interface DashPathEffectProps extends ChildrenProps {
  intervals: number[];
  phase?: number;
}

export interface Path1DPathEffectProps extends ChildrenProps {
  path: PathDef;
  advance: number;
  phase: number;
  style: SkEnum<typeof Path1DEffectStyle>;
}

export interface Path2DPathEffectProps extends ChildrenProps {
  matrix: SkMatrix;
  path: PathDef;
}

export interface Line2DPathEffectProps extends ChildrenProps {
  width: number;
  matrix: SkMatrix;
}
