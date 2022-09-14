import { PointMode } from "../../../skia/types";
import type { DrawingContext, PointsProps } from "../../types";
import { NodeType } from "../../types";
import { enumKey } from "../datatypes";
import { JsiDrawingNode } from "../DrawingNode";
import type { NodeContext } from "../Node";

export class PointsNode extends JsiDrawingNode<PointsProps, null> {
  constructor(ctx: NodeContext, props: PointsProps) {
    super(ctx, NodeType.Points, props);
  }

  deriveProps() {
    return null;
  }

  draw({ canvas, paint }: DrawingContext) {
    const { points, mode } = this.props;
    canvas.drawPoints(PointMode[enumKey(mode)], points, paint);
  }
}
