import React from "react";

import type { AnimatedProps } from "../../processors/Animations/Animations";
import type { CustomPaintProps } from "../../processors/Paint";

export type FillProps = CustomPaintProps;

export const Fill = (props: AnimatedProps<FillProps>) => {
  return <skFill {...props} />;
};
