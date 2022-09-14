import React from "react";

import type { SweepGradientProps } from "../../../dom/types";
import type { SkiaProps } from "../../processors";

export const SweepGradient = (props: SkiaProps<SweepGradientProps>) => {
  return <skSweepGradient {...props} />;
};
