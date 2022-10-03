import React from "react";

import type { OvalProps } from "../../../dom/types";
import type { SkiaProps } from "../../processors";

export const Oval = (props: SkiaProps<OvalProps>) => {
  return <skOval {...props} />;
};

Oval.defaultProps = {
  x: 0,
  y: 0,
};
