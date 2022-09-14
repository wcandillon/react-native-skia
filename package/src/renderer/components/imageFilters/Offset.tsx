import React from "react";

import type { SkiaProps } from "../../processors/Animations/Animations";
import type { OffsetImageFilterProps } from "../../../dom/types";

export const Offset = (props: SkiaProps<OffsetImageFilterProps>) => {
  return <skOffsetImageFilter {...props} />;
};

Offset.defaultProps = {
  x: 0,
  y: 0,
};
