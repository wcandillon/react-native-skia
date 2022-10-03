import type { SkRect } from "../../../skia/types/Rect";
import type { DrawingContext, RectProps } from "../../types";
import { NodeType } from "../../types";
import { processRect } from "../datatypes";
import { JsiDrawingNode } from "../DrawingNode";
import type { NodeContext } from "../Node";

export class RectNode extends JsiDrawingNode<RectProps, SkRect> {
  constructor(ctx: NodeContext, props: RectProps) {
    super(ctx, NodeType.Rect, props);
  }

  deriveProps() {
    return processRect(this.Skia, this.props);
  }

  draw({ canvas, paint }: DrawingContext) {
    if (this.derived === undefined) {
      throw new Error("RectNode: rect is undefined");
    }
    canvas.drawRect(this.derived, paint);
  }
}
