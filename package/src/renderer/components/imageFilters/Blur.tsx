import React from "react";

import type { SkiaProps } from "../../processors/Animations/Animations";
import type { BlurImageFilterProps } from "../../../dom/types";

export const Blur = (props: SkiaProps<BlurImageFilterProps>) => {
  return <skBlurImageFilter {...props} />;
};

Blur.defaultProps = {
  mode: "decal",
};
