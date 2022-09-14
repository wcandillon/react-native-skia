import React from "react";

import type { SkiaProps } from "../../processors/Animations/Animations";
import type { Line2DPathEffectProps } from "../../../dom/types";

export const Line2DPathEffect = (props: SkiaProps<Line2DPathEffectProps>) => {
  return <skLine2DPathEffect {...props} />;
};
