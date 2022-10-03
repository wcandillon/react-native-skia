import React from "react";

import type { SkiaProps } from "../../processors/Animations/Animations";
import type { LerpColorFilterProps } from "../../../dom/types";

export const Lerp = (props: SkiaProps<LerpColorFilterProps>) => {
  return <skLerpColorFilter {...props} />;
};
