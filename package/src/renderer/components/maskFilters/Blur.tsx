import React from "react";

import { BlurStyle } from "../../../skia/MaskFilter";
import type { SkEnum } from "../../processors";
import { enumKey } from "../../processors";
import type { AnimatedProps } from "../../processors/Animations/Animations";

export interface BlurMaskNodeProps {
  style: BlurStyle;
  blur: number;
  respectCTM: boolean;
}

export interface BlurMaskProps extends Omit<BlurMaskNodeProps, "style"> {
  style: SkEnum<typeof BlurStyle>;
}

export const BlurMask = ({ style, ...props }: AnimatedProps<BlurMaskProps>) => {
  console.log(BlurStyle[enumKey(style)]);
  return <skBlurMask style={BlurStyle.Solid} {...props} />;
};

BlurMask.defaultProps = {
  style: "normal",
  respectCTM: true,
};
