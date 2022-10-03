import React from "react";

import type { SkiaProps } from "../../processors/Animations/Animations";
import type { Path1DPathEffectProps } from "../../../dom/types";

export const Path1DPathEffect = (props: SkiaProps<Path1DPathEffectProps>) => {
  return <skPath1DPathEffect {...props} />;
};
