import type { DiffRectProps, DrawingContext } from "../../types";
import { NodeType } from "../../types";
import { JsiDrawingNode } from "../DrawingNode";
import type { NodeContext } from "../Node";

export class DiffRectNode extends JsiDrawingNode<DiffRectProps, null> {
  constructor(ctx: NodeContext, props: DiffRectProps) {
    super(ctx, NodeType.DiffRect, props);
  }

  deriveProps() {
    return null;
  }

  draw({ canvas, paint }: DrawingContext) {
    const { outer, inner } = this.props;
    canvas.drawDRRect(outer, inner, paint);
  }
}
