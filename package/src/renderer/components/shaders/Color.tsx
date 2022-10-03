import React from "react";

import type { SkiaProps } from "../../processors";
import type { ColorProps } from "../../../dom/types";

export const ColorShader = (props: SkiaProps<ColorProps>) => {
  return <skColorShader {...props} />;
};
