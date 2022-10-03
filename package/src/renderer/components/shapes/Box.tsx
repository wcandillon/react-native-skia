import React from "react";

import type { BoxProps, BoxShadowProps } from "../../../dom/types";
import type { SkiaProps } from "../../processors";

export const BoxShadow = (props: SkiaProps<BoxShadowProps>) => {
  return <skBoxShadow {...props} />;
};

export const Box = (props: SkiaProps<BoxProps>) => {
  return <skBox {...props} />;
};
