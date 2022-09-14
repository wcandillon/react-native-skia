import React from "react";

import type { BlendProps } from "../../dom/types";
import type { SkiaProps } from "../processors";

export const Blend = (props: SkiaProps<BlendProps>) => {
  return <skBlend {...props} />;
};
