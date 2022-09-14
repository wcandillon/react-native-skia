import React from "react";

import type { DrawingNodeProps } from "../../../dom/types";
import type { SkiaProps } from "../../processors/Animations/Animations";

export const Fill = (props: SkiaProps<DrawingNodeProps>) => {
  return <skFill {...props} />;
};
