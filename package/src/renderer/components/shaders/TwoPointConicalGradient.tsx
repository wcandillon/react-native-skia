import React from "react";

import type { TwoPointConicalGradientProps } from "../../../dom/types";
import type { SkiaProps } from "../../processors";

export const TwoPointConicalGradient = (
  props: SkiaProps<TwoPointConicalGradientProps>
) => {
  return <skTwoPointConicalGradient {...props} />;
};
