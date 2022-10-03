import React from "react";

import type { CornerPathEffectProps } from "../../../dom/types";
import type { SkiaProps } from "../../processors";

export const CornerPathEffect = (props: SkiaProps<CornerPathEffectProps>) => {
  return <skCornerPathEffect {...props} />;
};
