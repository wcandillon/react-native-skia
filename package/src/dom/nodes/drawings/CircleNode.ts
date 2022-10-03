import type { SkPoint } from "../../../skia/types";
import type { CircleProps, DrawingContext } from "../../types";
import { NodeType } from "../../types";
import { processCircle } from "../datatypes";
import { JsiDrawingNode } from "../DrawingNode";
import type { NodeContext } from "../Node";

export class CircleNode extends JsiDrawingNode<CircleProps, SkPoint> {
  constructor(ctx: NodeContext, props: CircleProps) {
    super(ctx, NodeType.Circle, props);
  }

  protected deriveProps() {
    return processCircle(this.Skia, this.props).c;
  }

  draw({ canvas, paint }: DrawingContext) {
    if (!this.derived) {
      throw new Error("CircleNode: c is undefined");
    }
    const { x, y } = this.derived;
    canvas.drawCircle(x, y, this.props.r, paint);
  }
}
