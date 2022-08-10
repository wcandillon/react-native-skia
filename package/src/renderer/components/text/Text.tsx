import React from "react";

import type {
  CustomPaintProps,
  AnimatedProps,
  FontDef,
} from "../../processors";
import { createDrawing } from "../../nodes/Drawing";

type TextProps = CustomPaintProps &
  FontDef & {
    text: string;
    x: number;
    y: number;
  };

const onDraw = createDrawing<TextProps>(
  ({ canvas, paint }, { text, x, y, ...fontDef }) => {
    const { font } = fontDef;
    canvas.drawText(text, x, y, paint, font);
  }
);

export const Text = (props: AnimatedProps<TextProps>) => {
  return <skDrawing onDraw={onDraw} {...props} />;
};

Text.defaultProps = {
  x: 0,
  y: 0,
};
