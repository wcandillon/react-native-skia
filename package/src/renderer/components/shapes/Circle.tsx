import React from "react";

import type {
  CustomPaintProps,
  AnimatedProps,
  CircleDef,
  Vector,
} from "../../processors";
import { processCircle } from "../../processors";
import { vec } from "../../processors/math/Vector";
import type { SkCanvas } from "../../../skia";
import { RenderNode } from "../../nodes";
import type { RenderContext } from "../../nodes/RenderContext";

export type CircleProps = CircleDef & CustomPaintProps;

export class CircleNode extends RenderNode<CircleProps> {
  constructor(props: AnimatedProps<CircleProps>) {
    super(props);
  }

  render(canvas: SkCanvas, ctx: RenderContext) {
    // TODO: Move this to propertyUpdated callback?
    const { c, r } = processCircle(this.props);
    canvas.drawCircle(c.x, c.y, r, ctx.paint);
  }
}

export const Circle = (props: AnimatedProps<CircleProps>) => {
  return (
    <skGroup {...props}>
      <skCircle {...props} />
    </skGroup>
  );
};

Circle.defaultProps = {
  c: vec(0, 0),
};
