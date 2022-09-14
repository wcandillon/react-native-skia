import React from "react";

import type { FractalNoiseProps } from "../../../dom/types";
import type { SkiaProps } from "../../processors/Animations/Animations";

export const FractalNoise = (props: SkiaProps<FractalNoiseProps>) => {
  return <skFractalNoise {...props} />;
};

FractalNoise.defaultProps = {
  seed: 0,
  tileWidth: 0,
  tileHeight: 0,
};
