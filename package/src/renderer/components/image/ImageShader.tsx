import React from "react";

import type { ImageShaderProps } from "../../../dom/types";
import type { SkiaProps } from "../../processors";

export const ImageShader = (props: SkiaProps<ImageShaderProps>) => {
  return <skImageShader {...props} />;
};

ImageShader.defaultProps = {
  tx: "decal",
  ty: "decal",
  fm: "nearest",
  mm: "none",
  fit: "none",
  transform: [],
} as const;
