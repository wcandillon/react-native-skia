import React from "react";

import type { SkiaProps } from "../../processors";
import type { TextProps } from "../../../dom/types";

export const Text = (props: SkiaProps<TextProps>) => {
  return <skText {...props} />;
};

Text.defaultProps = {
  x: 0,
  y: 0,
};
