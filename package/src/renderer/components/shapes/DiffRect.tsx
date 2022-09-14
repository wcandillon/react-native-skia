import React from "react";

import type { SkiaProps } from "../../processors/Animations/Animations";
import type { DiffRectProps } from "../../../dom/types";

export const DiffRect = (props: SkiaProps<DiffRectProps>) => {
  return <skDiffRect {...props} />;
};
