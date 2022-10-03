import React from "react";

import type { BlurMaskFilterProps } from "../../../dom/types";
import type { SkiaProps } from "../../processors/Animations/Animations";

export const BlurMask = (props: SkiaProps<BlurMaskFilterProps>) => {
  return <skBlurMaskFilter {...props} />;
};

BlurMask.defaultProps = {
  style: "normal",
  respectCTM: true,
};
