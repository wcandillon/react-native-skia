import React from "react";

import type { DropShadowImageFilterProps } from "../../../dom/types";
import type { SkiaProps } from "../../processors/Animations/Animations";

export const Shadow = (props: SkiaProps<DropShadowImageFilterProps>) => {
  return <skDropShadowImageFilter {...props} />;
};
