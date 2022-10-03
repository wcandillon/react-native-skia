import React from "react";

import type { SkiaProps } from "../../processors";
import type { DisplacementMapImageFilterProps } from "../../../dom/types";

export const DisplacementMap = (
  props: SkiaProps<DisplacementMapImageFilterProps>
) => {
  return <skDisplacementMapImageFilter {...props} />;
};
