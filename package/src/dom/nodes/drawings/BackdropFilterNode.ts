import { isColorFilter } from "../../../skia/types";
import type { ChildrenProps, DrawingContext } from "../../types";
import { NodeType } from "../../types";
import { JsiDrawingNode } from "../DrawingNode";
import type { NodeContext } from "../Node";
import { JsiDeclarationNode } from "../Node";

export class BackdropFilterNode extends JsiDrawingNode<ChildrenProps, null> {
  constructor(ctx: NodeContext, props: ChildrenProps) {
    super(ctx, NodeType.BackdropFilter, props);
  }

  protected deriveProps() {
    return null;
  }

  draw({ canvas }: DrawingContext) {
    const child = this._children[0];
    const filter =
      child instanceof JsiDeclarationNode ? child.materialize() : null;
    canvas.saveLayer(
      undefined,
      null,
      isColorFilter(filter)
        ? this.Skia.ImageFilter.MakeColorFilter(filter, null)
        : filter
    );
    canvas.restore();
  }
}
