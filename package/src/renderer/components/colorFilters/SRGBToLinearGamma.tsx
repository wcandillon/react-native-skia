import React from "react";

import type { ChildrenProps } from "../../../dom/types";
import type { SkiaProps } from "../../processors/Animations/Animations";

export const SRGBToLinearGamma = (props: SkiaProps<ChildrenProps>) => {
  return <skSRGBToLinearGammaColorFilter {...props} />;
};
