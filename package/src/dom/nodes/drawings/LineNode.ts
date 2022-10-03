import type { DrawingContext, LineProps } from "../../types";
import { NodeType } from "../../types";
import { JsiDrawingNode } from "../DrawingNode";
import type { NodeContext } from "../Node";

export class LineNode extends JsiDrawingNode<LineProps, null> {
  constructor(ctx: NodeContext, props: LineProps) {
    super(ctx, NodeType.Line, props);
  }

  deriveProps() {
    return null;
  }

  draw({ canvas, paint }: DrawingContext) {
    const { p1, p2 } = this.props;
    canvas.drawLine(p1.x, p1.y, p2.x, p2.y, paint);
  }
}
