import type { BlendMode, Color } from "../../skia/types";

import type { ChildrenProps, SkEnum } from "./Common";

export interface MatrixColorFilterProps extends ChildrenProps {
  matrix: number[];
}

export interface BlendColorFilterProps extends ChildrenProps {
  mode: SkEnum<typeof BlendMode>;
  color: Color;
}

export interface LerpColorFilterProps extends ChildrenProps {
  t: number;
}
