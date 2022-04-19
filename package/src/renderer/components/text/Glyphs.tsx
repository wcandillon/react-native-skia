import React from "react";

import type { CustomPaintProps, AnimatedProps } from "../../processors";
import { createDrawing } from "../../nodes/Drawing";
import type { SkPoint } from "../../../skia";
import type { FontDef } from "../../processors/Font";
import { processFont } from "../../processors/Font";

export interface Glyph {
  id: number;
  pos: SkPoint;
}

export type GlyphsProps = CustomPaintProps &
  FontDef & {
    x: number;
    y: number;
    glyphs: Glyph[];
  };

interface ProcessedGlyphs {
  glyphs: number[];
  positions: SkPoint[];
}

export const Glyphs = (props: AnimatedProps<GlyphsProps>) => {
  return <skGlyphs {...props} />;
};

Glyphs.defaultProps = {
  x: 0,
  y: 0,
};
