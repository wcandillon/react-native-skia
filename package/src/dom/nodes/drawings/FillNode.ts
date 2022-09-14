import type { DrawingContext, DrawingNodeProps } from "../../types";
import { NodeType } from "../../types";
import { JsiDrawingNode } from "../DrawingNode";
import type { NodeContext } from "../Node";

export class FillNode extends JsiDrawingNode<DrawingNodeProps, null> {
  constructor(ctx: NodeContext, props: DrawingNodeProps = {}) {
    super(ctx, NodeType.Fill, props);
  }

  deriveProps() {
    return null;
  }

  draw({ canvas, paint }: DrawingContext) {
    canvas.drawPaint(paint);
  }
}
