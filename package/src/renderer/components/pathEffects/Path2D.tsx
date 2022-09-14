import React from "react";

import type { SkiaProps } from "../../processors/Animations/Animations";
import type { Path2DPathEffectProps } from "../../../dom/types";

export const Path2DPathEffect = (props: SkiaProps<Path2DPathEffectProps>) => {
  return <skPath2DPathEffect {...props} />;
};
