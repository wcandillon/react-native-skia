import React from "react";

import type { CustomPaintProps, AnimatedProps } from "../../processors";
import type { SkCanvas } from "../../../skia";
import { RenderNode } from "../../nodes";
import type { RenderContext } from "../../nodes/RenderContext";

export type FillProps = CustomPaintProps;

export class FillNode extends RenderNode<FillProps> {
  constructor(props: AnimatedProps<FillProps>) {
    super(props);
  }

  render(canvas: SkCanvas, ctx: RenderContext) {
    canvas.drawPaint(ctx.paint);
  }
}

export const Fill = (props: AnimatedProps<FillProps>) => {
  return (
    <skGroup {...props}>
      <skFill />
    </skGroup>
  );
};
