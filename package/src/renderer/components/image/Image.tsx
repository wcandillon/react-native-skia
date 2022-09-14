import React from "react";

import type { SkiaProps } from "../../processors";
import type { ImageProps } from "../../../dom/types";

export const Image = (props: SkiaProps<ImageProps>) => {
  return <skImage {...props} />;
};

Image.defaultProps = {
  x: 0,
  y: 0,
  fit: "contain",
};
