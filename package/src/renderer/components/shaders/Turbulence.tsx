import React from "react";

import type { TurbulenceProps } from "../../../dom/types";
import type { SkiaProps } from "../../processors/Animations/Animations";

export const Turbulence = (props: SkiaProps<TurbulenceProps>) => {
  return <skTurbulence {...props} />;
};

Turbulence.defaultProps = {
  seed: 0,
  tileWidth: 0,
  tileHeight: 0,
};
