import React from "react";

import type { GlyphsProps } from "../../../dom/types";
import type { SkiaProps } from "../../processors/Animations/Animations";

export const Glyphs = (props: SkiaProps<GlyphsProps>) => {
  return <skGlyphs {...props} />;
};

Glyphs.defaultProps = {
  x: 0,
  y: 0,
};
