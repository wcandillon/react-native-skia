import React from "react";

import type { ChildrenProps } from "../../../dom/types";
import type { SkiaProps } from "../../processors";

export const LinearToSRGBGamma = (props: SkiaProps<ChildrenProps>) => {
  return <skLinearToSRGBGammaColorFilter {...props} />;
};
