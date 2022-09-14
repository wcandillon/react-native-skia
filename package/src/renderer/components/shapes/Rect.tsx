import React from "react";

import type { RectProps } from "../../../dom/types";
import type { SkiaProps } from "../../processors";

export const Rect = (props: SkiaProps<RectProps>) => {
  return <skRect {...props} />;
};
