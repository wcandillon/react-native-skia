import React from "react";

import type { SkiaProps } from "../../processors";
import type { BlendColorFilterProps } from "../../../dom/types";

export const BlendColor = (props: SkiaProps<BlendColorFilterProps>) => {
  return <skBlendColorFilter {...props} />;
};
