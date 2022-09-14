import React from "react";

import type { ImageSVGProps } from "../../../dom/types";
import type { AnimatedProps } from "../../processors";

export const ImageSVG = (props: AnimatedProps<ImageSVGProps>) => {
  return <skImageSVG {...props} />;
};
