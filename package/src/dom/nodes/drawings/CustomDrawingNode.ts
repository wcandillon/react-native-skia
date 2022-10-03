import type { CustomDrawingNodeProps, DrawingContext } from "../../types";
import { NodeType } from "../../types";
import { JsiDrawingNode } from "../DrawingNode";
import type { NodeContext } from "../Node";

export class CustomDrawingNode extends JsiDrawingNode<
  CustomDrawingNodeProps,
  null
> {
  constructor(ctx: NodeContext, props: CustomDrawingNodeProps) {
    super(ctx, NodeType.Drawing, props);
  }

  deriveProps() {
    return null;
  }

  draw(ctx: DrawingContext) {
    this.props.drawing(ctx);
  }
}
