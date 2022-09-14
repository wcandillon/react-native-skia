import React from "react";

import type { SkiaProps } from "../../processors";
import type { LinearGradientProps } from "../../../dom/types";

export const LinearGradient = (props: SkiaProps<LinearGradientProps>) => {
  return <skLinearGradient {...props} />;
};
