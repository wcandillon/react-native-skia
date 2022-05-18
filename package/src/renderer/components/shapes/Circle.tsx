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
import type { DrawingContext } from "../../DrawingContext";
import { RenderNode } from "../../nodes/Node";

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

  render(canvas: SkCanvas, ctx: DrawingContext) {
    canvas.drawCircle(this.c.x, this.c.y, this.r, ctx.paint);
  }
}

export const Circle = (props: AnimatedProps<CircleProps>) => {
  const materialized = materialize(props);
  return <skCircle {...materialized} />;
};

Circle.defaultProps = {
  c: vec(0, 0),
};
