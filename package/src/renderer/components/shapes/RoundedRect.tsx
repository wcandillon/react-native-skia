import React from "react";

import type { RoundedRectProps } from "../../../dom/types";
import type { SkiaProps } from "../../processors";

export const RoundedRect = (props: SkiaProps<RoundedRectProps>) => {
  return <skRRect {...props} />;
};

RoundedRect.defaultProps = {
  r: 0,
};
