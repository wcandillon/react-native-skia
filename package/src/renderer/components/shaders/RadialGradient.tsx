import React from "react";

import type { SkiaProps } from "../../processors";
import type { RadialGradientProps } from "../../../dom/types";

export const RadialGradient = (props: SkiaProps<RadialGradientProps>) => {
  return <skRadialGradient {...props} />;
};
