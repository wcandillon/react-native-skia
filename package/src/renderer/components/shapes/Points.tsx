import React from "react";

import type { SkiaProps } from "../../processors/Animations/Animations";
import type { PointsProps } from "../../../dom/types";

export const Points = (props: SkiaProps<PointsProps>) => {
  return <skPoints {...props} />;
};

Points.defaultProps = {
  mode: "points",
};
