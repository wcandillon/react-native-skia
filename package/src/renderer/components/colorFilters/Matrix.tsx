import React from "react";

import type { SkiaProps } from "../../processors";
import type { MatrixColorFilterProps } from "../../../dom/types";

export const ColorMatrix = (props: SkiaProps<MatrixColorFilterProps>) => {
  return <skMatrixColorFilter {...props} />;
};

export const OpacityMatrix = (opacity: number) => [
  1,
  0,
  0,
  0,
  0,
  0,
  1,
  0,
  0,
  0,
  0,
  0,
  1,
  0,
  0,
  0,
  0,
  0,
  opacity,
  0,
];
