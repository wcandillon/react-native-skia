import React from "react";

import type { CustomPaintProps, AnimatedProps } from "../../processors";
import { createDrawing } from "../../nodes/Drawing";
import type { SkPoint } from "../../../skia/types";
import type { FontDef } from "../../processors/Font";

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

const onDraw = createDrawing<GlyphsProps>(
  ({ canvas, paint }, { glyphs: rawGlyphs, x, y, ...fontDef }) => {
    const { font } = fontDef;
    const { glyphs, positions } = rawGlyphs.reduce<ProcessedGlyphs>(
      (acc, glyph) => {
        const { id, pos } = glyph;
        acc.glyphs.push(id);
        acc.positions.push(pos);
        return acc;
      },
      { glyphs: [], positions: [] }
    );
    canvas.drawGlyphs(glyphs, positions, x, y, font, paint);
  }
);

export const Glyphs = (props: AnimatedProps<GlyphsProps>) => {
  return <skDrawing onDraw={onDraw} {...props} />;
};

Glyphs.defaultProps = {
  x: 0,
  y: 0,
};
