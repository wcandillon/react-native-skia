import React from "react";

import type { SkiaProps } from "../../processors/Animations/Animations";
import type { RuntimeShaderImageFilterProps } from "../../../dom/types";

export const RuntimeShader = (
  props: SkiaProps<RuntimeShaderImageFilterProps>
) => {
  return <skRuntimeShaderImageFilter {...props} />;
};
