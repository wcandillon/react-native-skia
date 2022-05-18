import React from "react";

import type {
  CustomPaintProps,
  AnimatedProps,
  CircleDef,
  Vector,
} from "../../processors";
import { materialize, processCircle } from "../../processors";
import { vec } from "../../processors/math/Vector";
import type { SkCanvas } from "../../../skia";
import { RenderNode } from "../../nodes";
import type { RenderContext } from "../../nodes/RenderContext";

export type CircleProps = CircleDef & CustomPaintProps;

export class CircleNode extends RenderNode {
  c: Vector;
  r: number;

  constructor(props: CircleProps) {
    super();
    const { c, r } = processCircle(props);
    this.c = c;
    this.r = r;
  }

  render(canvas: SkCanvas, ctx: RenderContext) {
    canvas.drawCircle(this.c.x, this.c.y, this.r, ctx.paint);
  }
}

export const Circle = (props: AnimatedProps<CircleProps>) => {
  const materialized = materialize(props);

  return (
    <skGroup {...materialized}>
      <skCircle {...materialized} />
    </skGroup>
  );
};

Circle.defaultProps = {
  c: vec(0, 0),
};
